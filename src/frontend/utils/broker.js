// Global listener for native broker callback in the WebView.
// Native dispatches: window.dispatchEvent(new CustomEvent('broker:callback', { detail: url }))
// We parse the URL for code/nonce and expose a hook point to continue the flow.

(function () {
  try {
    if (typeof window === 'undefined' || !window.addEventListener) return;

    window.__brokerLastURL = null;
    window.addEventListener('broker:callback', async (e) => {
      try {
        const url = e?.detail || '';
        window.__brokerLastURL = url;
        console.log('[broker] callback URL:', url);
        // Parse code/nonce from hash fragment (iOS callback uses # not ?)
        const u = new URL(url);
        // Check if params are in hash fragment first (iOS), then query string (fallback)
        const paramsString = u.hash ? u.hash.substring(1) : u.search.substring(1);
        const params = new URLSearchParams(paramsString);
        const code = params.get('code');
        const nonce = params.get('nonce');
        console.log('[broker] parsed code:', code ? 'present' : 'missing', 'nonce:', nonce ? 'present' : 'missing');
        if (!code || !nonce) {
          console.warn('[broker] missing code/nonce');
          return;
        }
        console.log('[broker] 📞 calling takeAuthBlob with code:', code, 'nonce:', nonce);
        // Lazy import declarations to avoid cycles
        const mod = await import('../../declarations/backend/index.js');
        console.log('[broker] 🏭 creating actor with canisterId:', mod.canisterId);
        const actor = mod.createActor(mod.canisterId, { agentOptions: { host: 'https://icp-api.io' } });
        console.log('[broker] 🎯 actor created, calling takeAuthBlob...');
        const result = await actor.takeAuthBlob(code, nonce);
        console.log('[broker] 📦 takeAuthBlob result type:', Array.isArray(result) ? 'array' : typeof result);
        if (result === null || !result) {
          console.warn('[broker] takeAuthBlob: no data (expired or invalid)');
          return;
        }
        
        // Decode the delegation chain blob
        // Result is an array where each element is a Candid blob (array of arrays)
        console.log('[broker] 📦 result structure:', result.length, 'items, first item type:', typeof result[0]);
        const firstBlob = result[0];
        console.log('[broker] 📦 first blob:', Array.isArray(firstBlob) ? `array of ${firstBlob.length}` : typeof firstBlob);
        
        // Convert the blob to bytes - handle both array of objects and nested arrays
        let bytes;
        if (Array.isArray(firstBlob)) {
          bytes = new Uint8Array(firstBlob);
        } else if (typeof firstBlob === 'object' && firstBlob !== null) {
          // It's an array-like object with numeric keys
          const length = Object.keys(firstBlob).length;
          bytes = new Uint8Array(length);
          for (let i = 0; i < length; i++) {
            bytes[i] = firstBlob[i];
          }
        } else {
          console.error('[broker] ❌ unexpected blob format');
          return;
        }
        
        console.log('[broker] 📦 converted to Uint8Array, length:', bytes.length);
        const jsonStr = new TextDecoder().decode(bytes);
        console.log('[broker] 📄 decoded delegation chain JSON, length:', jsonStr.length);
        console.log('[broker] 📄 JSON preview:', jsonStr.substring(0, 100));
        
        // Import identity modules
        const { Ed25519KeyIdentity, DelegationIdentity, DelegationChain } = await import('@dfinity/identity');
        const { set: idbSet } = await import('idb-keyval');
        
        // Retrieve stored session key
        const sessionKeyJson = localStorage.getItem('broker_session_key');
        if (!sessionKeyJson) {
          console.error('[broker] ❌ no stored session key in localStorage');
          return;
        }
        
        const storedSessionIdentity = Ed25519KeyIdentity.fromJSON(sessionKeyJson);
        console.log('[broker] 🔑 restored session identity from localStorage');
        
        // Reconstruct DelegationIdentity from chain + session key
        const chainData = JSON.parse(jsonStr);
        console.log('[broker] 📜 parsed chain data, delegations:', chainData.delegations?.length);
        console.log('[broker] 📜 raw chainData:', JSON.stringify(chainData).substring(0, 200));
        
        // Fix: The relay returns DER-encoded public keys as hex strings,
        // but DelegationChain.fromJSON expects them as Uint8Array.
        // DER format: 302a300506032b6570032100 + <32-byte-key-in-hex>
        // We need to:
        // 1. Strip the DER prefix (first 24 hex chars)
        // 2. Convert hex string to Uint8Array
        const hexToBytes = (hex) => {
          const bytes = new Uint8Array(hex.length / 2);
          for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
          }
          return Array.from(bytes); // Return as array for JSON compatibility
        };
        
        if (chainData.delegations) {
          chainData.delegations = chainData.delegations.map(d => {
            const newDelegation = { ...d };
            if (d.delegation && d.delegation.pubkey && typeof d.delegation.pubkey === 'string') {
              // Keep the full DER-encoded public key - fromJSON expects DER format
              // Convert hex string to byte array but preserve DER encoding
              const pubkeyHex = d.delegation.pubkey;
              newDelegation.delegation = {
                ...d.delegation,
                pubkey: hexToBytes(pubkeyHex)
              };
              console.log('[broker] 🔧 converted pubkey to bytes (DER format), length:', newDelegation.delegation.pubkey.length);
            }
            // Handle signature - convert empty object to null or convert hex to bytes
            if (d.signature !== undefined) {
              if (typeof d.signature === 'object' && Object.keys(d.signature).length === 0) {
                // Empty signature object - keep as null/empty
                newDelegation.signature = null;
                console.log('[broker] 🔧 converted empty signature to null');
              } else if (typeof d.signature === 'string') {
                // Signature as hex string - convert to bytes
                newDelegation.signature = hexToBytes(d.signature);
                console.log('[broker] 🔧 converted signature to bytes');
              }
            }
            return newDelegation;
          });
          console.log('[broker] 🔧 processed all public keys');
        }
        
        // Process the root publicKey (the II anchor's public key)
        // This should be the first delegation's public key in the chain
        // Keep in DER format - fromJSON expects DER encoding
        let rootPublicKeyBytes;
        if (chainData.publicKey && typeof chainData.publicKey === 'string') {
          // Convert hex string to bytes, preserving DER format
          rootPublicKeyBytes = hexToBytes(chainData.publicKey);
          console.log('[broker] 🔧 converted root publicKey to bytes (DER format), length:', rootPublicKeyBytes.length);
        } else if (chainData.delegations && chainData.delegations.length > 0) {
          // If no explicit publicKey, use the first delegation's pubkey (the II anchor key)
          rootPublicKeyBytes = chainData.delegations[0].delegation.pubkey;
          console.log('[broker] 🔧 using first delegation pubkey as root (DER format), length:', rootPublicKeyBytes.length);
        } else {
          console.error('[broker] ❌ No root public key found in chain data!');
          rootPublicKeyBytes = [];
        }
        
        console.log('[broker] 📜 modified chainData preview:', JSON.stringify(chainData).substring(0, 150));
        
        try {
          // DIFFERENT APPROACH: Instead of using DelegationChain.fromJSON,
          // store the delegation data in the same format AuthClient uses internally
          // and let AuthClient.create() reconstruct it
          
          console.log('[broker] � Storing delegation in AuthClient format...');
          
          // Store the delegation chain JSON (as string) - this is what AuthClient expects
          const delegationJSON = JSON.stringify(chainData);
          await idbSet('delegation', delegationJSON);
          console.log('[broker] ✅ Delegation stored to IndexedDB');
          
          // Store the identity JSON
          await idbSet('identity', storedSessionIdentity.toJSON());
          console.log('[broker] ✅ Identity stored to IndexedDB');
          
          const importedIdentity = DelegationIdentity.fromDelegation(
            storedSessionIdentity, 
            delegationChain
          );
          console.log('[broker] ✅ reconstructed DelegationIdentity');
          
          // Persist delegation to IndexedDB for AuthClient
          const delegation = importedIdentity.getDelegation();
          const delegationJSON = delegation.toJSON();
          await idbSet('delegation', delegationJSON);
          console.log('[broker] 💾 delegation persisted to IndexedDB');
          
          // Store identity key for AuthClient
          await idbSet('identity', storedSessionIdentity.toJSON());
          console.log('[broker] 💾 identity persisted to IndexedDB');
          
          // Reload the page to let AuthClient pick up the persisted delegation
          console.log('[broker] 🔄 reloading page to complete authentication...');
          window.location.reload();
        } catch (identityError) {
          console.error('[broker] ❌ failed to reconstruct identity:', identityError);
          console.error('[broker] error message:', identityError?.message);
          console.error('[broker] error stack:', identityError?.stack);
          throw identityError;
        }
      } catch (err) {
        console.warn('[broker] error handling callback');
        console.error('[broker] error type:', typeof err);
        console.error('[broker] error:', err);
        console.error('[broker] error message:', err?.message);
        console.error('[broker] error stack:', err?.stack);
      }
    });
  } catch {}
})();
