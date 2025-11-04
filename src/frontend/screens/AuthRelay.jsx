import React, { useEffect, useState } from "react";
import { AuthClient } from "@dfinity/auth-client";
import { Ed25519KeyIdentity, Ed25519PublicKey } from "@dfinity/identity";
import { DelegationChain } from "@dfinity/identity";
import { createActor, canisterId } from "../../declarations/backend";

// Note: This page is intended to run in a top-level browser context (Safari/ASWebAuthenticationSession), not inside WKWebView.
// It starts the Internet Identity flow, then stores the delegation package via putAuthBlob and redirects back to the app.

export default function AuthRelay() {
  const [error, setError] = useState(null);
  const [retLink, setRetLink] = useState(null);
  const [status, setStatus] = useState('starting'); // 'starting', 'authenticating', 'storing', 'redirecting', 'complete'

  useEffect(() => {
    (async () => {
      try {
        setStatus('starting');
        const url = new URL(window.location.href);
        const nonce = url.searchParams.get("nonce");
        const mobilePublicKeyHex = url.searchParams.get("publicKey");
        const ret = url.searchParams.get("return");
        
        if (!nonce || !mobilePublicKeyHex || !ret) {
          throw new Error("Missing required params: nonce, publicKey, or return");
        }

        // Prepare fallback link early
        const codeEarly = Array.from(crypto.getRandomValues(new Uint8Array(16)))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        const retUrlEarly = `${ret}#code=${encodeURIComponent(codeEarly)}&nonce=${encodeURIComponent(nonce)}`;
        setRetLink(retUrlEarly);

        // STEP 1: Generate intermediate session key (controlled by relay, not mobile app)
        // This key never leaves this page and prevents attackers from controlling the delegation
        const intermediateIdentity = Ed25519KeyIdentity.generate();
        const intermediatePublicKey = intermediateIdentity.getPublicKey();

        // STEP 2: Authenticate with II using the intermediate key
        setStatus('authenticating');
        const client = await AuthClient.create({
          idleOptions: { disableDefaultIdleCallback: true, disableIdle: true },
          identity: intermediateIdentity,
        });
        
        await new Promise((resolve, reject) => {
          client.login({
            identityProvider: "https://id.ai/#authorize",
            onSuccess: () => {
              resolve();
            },
            onError: (err) => {
              console.error('[relay] II login error', err);
              reject(err);
            },
            maxTimeToLive: BigInt(30 * 24 * 60 * 60 * 1000) * BigInt(1_000_000), // 30 days
          });
        });
        
        await new Promise(r => setTimeout(r, 1000));
        
        const isAuth = await client.isAuthenticated();
        
        if (!isAuth) {
          throw new Error('Not authenticated after II login');
        }

        // STEP 3: Get the delegation from II (II key → intermediate key)
        const delegatedIdentity = client.getIdentity();
        if (!delegatedIdentity || !delegatedIdentity.getDelegation) {
          throw new Error('No delegation available from II');
        }
        
        const iiDelegation = delegatedIdentity.getDelegation();

        // STEP 4: Create a second delegation (intermediate key → mobile app key)
        // Parse mobile public key from hex (this is DER-encoded, 44 bytes)
        const mobilePublicKeyBytes = new Uint8Array(
          mobilePublicKeyHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
        );
        
        // Create Ed25519PublicKey object from DER bytes
        const mobilePublicKey = Ed25519PublicKey.fromDer(mobilePublicKeyBytes);
        
        // Create delegation from intermediate to mobile key
        // Use Date object for expiration (30 days from now)
        const expirationDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        
        let mobileDelegation;
        try {
          mobileDelegation = await DelegationChain.create(
            intermediateIdentity,
            mobilePublicKey, // Ed25519PublicKey object
            expirationDate
          );
        } catch (err) {
          console.error('[relay] DelegationChain.create failed:', err);
          throw new Error(`Failed to create delegation: ${err.message}`);
        }

        // STEP 5: Combine into a delegation chain
        // The chain is: [II → intermediate, intermediate → mobile]
        const delegationChain = {
          delegations: [
            ...iiDelegation.delegations,
            mobileDelegation.delegations[0]
          ],
          publicKey: iiDelegation.publicKey
        };

        // STEP 6: Store the delegation chain
        const actor = createActor(canisterId, { agentOptions: { host: "https://icp-api.io" } });
        const code = Array.from(crypto.getRandomValues(new Uint8Array(16)))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        const expiresAt = BigInt(Date.now() + 2 * 60 * 1000) * BigInt(1_000_000); // 2 minutes
        
        // STEP 6: Store the delegation chain and wait for confirmation
        setStatus('storing');
        const finalUrl = `${ret}#code=${encodeURIComponent(code)}&nonce=${encodeURIComponent(nonce)}`;
        setRetLink(finalUrl);
        
        try {
          // IMPORTANT: Use DelegationChain.toJSON() to get proper format
          const chainToStore = DelegationChain.fromDelegations(
            delegationChain.delegations,
            delegationChain.publicKey
          );
          const chainJson = JSON.stringify(chainToStore.toJSON());
          const bytes = new TextEncoder().encode(chainJson);
          
          console.log('[relay] Storing delegation chain...');
          await actor.putAuthBlob(code, nonce, bytes, expiresAt);
          console.log('[relay] Delegation chain stored successfully');
          
          // Add a small delay to ensure the backend write is fully committed
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (e) {
          console.error("[relay] Failed to store delegation chain:", e);
          throw e;
        }

        // STEP 7: Redirect back using URI fragment (not GET param to avoid leaking to server)
        setStatus('redirecting');
        console.log('[relay] Redirecting back to app...');
        window.location.replace(finalUrl);
        
      } catch (e) {
        console.error("[relay] Authentication error:", e);
        
        const errorMsg = e instanceof Error ? e.message : String(e);
        setError(`ERROR: ${errorMsg}\n\nStack: ${e.stack || 'no stack'}`);
        
        // Still try to redirect back on error
        try {
          const url = new URL(window.location.href);
          const nonce = url.searchParams.get("nonce");
          const ret = url.searchParams.get("return");
          if (nonce && ret) {
            const code = `error:${encodeURIComponent(errorMsg.substring(0, 50))}`;
            const fallbackUrl = `${ret}#code=${encodeURIComponent(code)}&nonce=${encodeURIComponent(nonce)}`;
            setRetLink(fallbackUrl);
            setTimeout(() => window.location.replace(fallbackUrl), 3000);
          }
        } catch {}
      }
    })();
  }, []);

  return (
    <div style={{ padding: 20, fontFamily: 'system-ui', maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>🔐 Authenticating…</h1>
      
      {error && (
        <div style={{ 
          background: '#fee', 
          border: '1px solid #c33', 
          borderRadius: 8, 
          padding: 16, 
          marginBottom: 16 
        }}>
          <strong style={{ color: '#c33' }}>Error:</strong>
          <p style={{ margin: '8px 0 0 0', color: '#333' }}>{error}</p>
        </div>
      )}
      
      {!error && (
        <div style={{ 
          background: '#eff', 
          border: '1px solid #3af',
          borderRadius: 8,
          padding: 16,
          marginBottom: 16
        }}>
          <p style={{ margin: 0 }}>
            {status === 'starting' && '⏳ Starting authentication...'}
            {status === 'authenticating' && '⏳ Completing sign-in with Internet Identity...'}
            {status === 'storing' && '💾 Securing your session...'}
            {status === 'redirecting' && '✅ Success! Redirecting back to app...'}
          </p>
          <p style={{ margin: '8px 0 0 0', fontSize: 14, color: '#666' }}>
            This page will automatically redirect you back to the app.
          </p>
        </div>
      )}
      
      {retLink && (
        <div style={{ marginTop: 20 }}>
          <p style={{ marginBottom: 8, color: '#666' }}>If nothing happens:</p>
          <button
            onClick={() => window.location.replace(retLink)}
            disabled={status !== 'redirecting' && !error}
            style={{ 
              display: 'inline-block',
              background: (status === 'redirecting' || error) ? '#0a84ff' : '#999',
              color: 'white',
              padding: '12px 24px',
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: 600,
              border: 'none',
              cursor: (status === 'redirecting' || error) ? 'pointer' : 'not-allowed',
              fontSize: 16,
              opacity: (status === 'redirecting' || error) ? 1 : 0.6,
            }}
          >
            Return to app →
          </button>
          {status !== 'redirecting' && !error && (
            <p style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
              Please wait while we complete the authentication...
            </p>
          )}
        </div>
      )}
      
      <div style={{ marginTop: 32, fontSize: 12, color: '#999', borderTop: '1px solid #eee', paddingTop: 16 }}>
        <p>Secure authentication provided by Internet Identity</p>
        <p>This implements the IC-recommended delegation chain pattern for mobile apps.</p>
      </div>
    </div>
  );
}
