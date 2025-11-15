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
  const [status, setStatus] = useState('initializing'); // 'initializing', 'ready', 'authenticating', 'storing', 'redirecting'
  const [authParams, setAuthParams] = useState(null);
  const [authClient, setAuthClient] = useState(null);
  const [intermediateIdentity, setIntermediateIdentity] = useState(null);

  // Extract URL params and prepare client on mount
  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);
        const nonce = url.searchParams.get("nonce");
        const mobilePublicKeyHex = url.searchParams.get("publicKey");
        const ret = url.searchParams.get("return");
        
        if (!nonce || !mobilePublicKeyHex || !ret) {
          setError("Missing required params: nonce, publicKey, or return");
          setStatus('ready');
          return;
        }

        // Prepare fallback link early
        const codeEarly = Array.from(crypto.getRandomValues(new Uint8Array(16)))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        const retUrlEarly = `${ret}#code=${encodeURIComponent(codeEarly)}&nonce=${encodeURIComponent(nonce)}`;
        setRetLink(retUrlEarly);
        
        // Generate intermediate session key (controlled by relay, not mobile app)
        const intermediateId = Ed25519KeyIdentity.generate();
        setIntermediateIdentity(intermediateId);
        
        // Pre-create AuthClient so it's ready when user clicks button
        // This avoids async delay that breaks popup context
        const client = await AuthClient.create({
          idleOptions: { disableDefaultIdleCallback: true, disableIdle: true },
          identity: intermediateId,
        });
        setAuthClient(client);
        
        // Store params for button click
        setAuthParams({ nonce, mobilePublicKeyHex, ret });
        setStatus('ready');
      } catch (e) {
        console.error('[relay] Initialization error:', e);
        setError(`Failed to initialize: ${e.message}`);
        setStatus('ready');
      }
    })();
  }, []);

  // Handle button click - user interaction required for popup to work on iPad
  const handleSignIn = () => {
    if (!authParams || !authClient || !intermediateIdentity) {
      console.error('[relay] Not ready - missing authParams, client, or identity');
      return;
    }
    
    const { nonce, mobilePublicKeyHex, ret } = authParams;

    setStatus('authenticating');
    console.log('[relay] Starting secure delegation chain flow (user-initiated)');
    console.log('[relay] mobile publicKey:', mobilePublicKeyHex);

    // CRITICAL: Call client.login() IMMEDIATELY in button click handler
    // Safari requires popup to open in the same call stack as user interaction
    (async () => {
      try {
        // STEP 1: Authenticate with II using the pre-created client
        // This opens the popup immediately without async delay
        await new Promise((resolve, reject) => {
          authClient.login({
            identityProvider: "https://id.ai/#authorize",
            onSuccess: () => {
              console.log('[relay] II login succeeded');
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
      
      const isAuth = await authClient.isAuthenticated();
      
      if (!isAuth) {
        throw new Error('Not authenticated after II login');
      }

      // STEP 2: Get the delegation from II (II key → intermediate key)
      const delegatedIdentity = authClient.getIdentity();
      if (!delegatedIdentity || !delegatedIdentity.getDelegation) {
        throw new Error('No delegation available from II');
      }
      
      const iiDelegation = delegatedIdentity.getDelegation();

      // STEP 3: Create a second delegation (intermediate key → mobile app key)
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
      setStatus('storing');
      const actor = createActor(canisterId, { agentOptions: { host: "https://icp-api.io" } });
      const code = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const expiresAt = BigInt(Date.now() + 2 * 60 * 1000) * BigInt(1_000_000); // 2 minutes
      
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
        setStatus('ready');
        
        // Still try to redirect back on error
        try {
          if (nonce && ret) {
            const code = `error:${encodeURIComponent(errorMsg.substring(0, 50))}`;
            const fallbackUrl = `${ret}#code=${encodeURIComponent(code)}&nonce=${encodeURIComponent(nonce)}`;
            setRetLink(fallbackUrl);
            setTimeout(() => window.location.replace(fallbackUrl), 3000);
          }
        } catch {}
      }
    })(); // Close the async IIFE
  };

  return (
    <div style={{ padding: 20, fontFamily: 'system-ui', maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>🔐 Sign in with Internet Identity</h1>
      
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
      
      {!error && status === 'initializing' && (
        <div style={{ 
          background: '#eff', 
          border: '1px solid #3af',
          borderRadius: 8,
          padding: 24,
          marginBottom: 16,
          textAlign: 'center'
        }}>
          <p style={{ margin: 0, fontSize: 16 }}>
            ⏳ Preparing authentication...
          </p>
        </div>
      )}
      
      {!error && status === 'ready' && (
        <div style={{ 
          background: '#eff', 
          border: '1px solid #3af',
          borderRadius: 8,
          padding: 24,
          marginBottom: 16,
          textAlign: 'center'
        }}>
          <p style={{ margin: '0 0 20px 0', fontSize: 16 }}>
            Click below to sign in with your Internet Identity
          </p>
          <button
            onClick={handleSignIn}
            disabled={!authClient || !intermediateIdentity}
            style={{ 
              background: (authClient && intermediateIdentity) ? '#0a84ff' : '#999',
              color: 'white',
              padding: '14px 32px',
              borderRadius: 8,
              fontWeight: 600,
              border: 'none',
              cursor: (authClient && intermediateIdentity) ? 'pointer' : 'not-allowed',
              fontSize: 16,
              boxShadow: '0 2px 8px rgba(10, 132, 255, 0.3)',
              opacity: (authClient && intermediateIdentity) ? 1 : 0.6,
            }}
          >
            Sign in with Internet Identity
          </button>
        </div>
      )}
      
      {!error && status !== 'ready' && (
        <div style={{ 
          background: '#eff', 
          border: '1px solid #3af',
          borderRadius: 8,
          padding: 16,
          marginBottom: 16
        }}>
          <p style={{ margin: 0 }}>
            {status === 'authenticating' && '⏳ Completing sign-in with Internet Identity...'}
            {status === 'storing' && '💾 Securing your session...'}
            {status === 'redirecting' && '✅ Success! Redirecting back to app...'}
          </p>
          <p style={{ margin: '8px 0 0 0', fontSize: 14, color: '#666' }}>
            This page will automatically redirect you back to the app.
          </p>
        </div>
      )}
      
      {retLink && status === 'redirecting' && (
        <div style={{ marginTop: 20 }}>
          <p style={{ marginBottom: 8, color: '#666' }}>If nothing happens:</p>
          <button
            onClick={() => window.location.replace(retLink)}
            style={{ 
              display: 'inline-block',
              background: '#0a84ff',
              color: 'white',
              padding: '12px 24px',
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              fontSize: 16,
            }}
          >
            Return to app →
          </button>
        </div>
      )}
      
      {retLink && error && (
        <div style={{ marginTop: 20 }}>
          <button
            onClick={() => window.location.replace(retLink)}
            style={{ 
              display: 'inline-block',
              background: '#0a84ff',
              color: 'white',
              padding: '12px 24px',
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              fontSize: 16,
            }}
          >
            Return to app →
          </button>
        </div>
      )}
      
      <div style={{ marginTop: 32, fontSize: 12, color: '#999', borderTop: '1px solid #eee', paddingTop: 16 }}>
        <p>Secure authentication provided by Internet Identity</p>
        <p>This implements the IC-recommended delegation chain pattern for mobile apps.</p>
      </div>
    </div>
  );
}
