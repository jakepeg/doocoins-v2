// Simplified broker handler - just store the delegation data and reload
(function () {
  try {
    if (typeof window === 'undefined' || !window.addEventListener) return;

    window.__brokerLastURL = null;
    window.__brokerProcessing = false;
    window.addEventListener('broker:callback', async (e) => {
      try {
        const url = e?.detail || '';
        window.__brokerLastURL = url;
        window.__brokerProcessing = true;
        
        const u = new URL(url);
        const paramsString = u.hash ? u.hash.substring(1) : u.search.substring(1);
        const params = new URLSearchParams(paramsString);
        const code = params.get('code');
        const nonce = params.get('nonce');
        
        if (!code || !nonce) {
          console.error('[broker] Missing code or nonce in callback URL');
          return;
        }
        
        const mod = await import('../../declarations/backend/index.js');
        const actor = mod.createActor(mod.canisterId, { agentOptions: { host: 'https://icp-api.io' } });
        const result = await actor.takeAuthBlob(code, nonce);
        
        if (!result || result.length === 0) {
          console.error('[broker] No auth blob returned from backend');
          return;
        }
        
        // Convert blob to JSON string
        const firstBlob = result[0];
        let bytes;
        if (Array.isArray(firstBlob)) {
          bytes = new Uint8Array(firstBlob);
        } else {
          const length = Object.keys(firstBlob).length;
          bytes = new Uint8Array(length);
          for (let i = 0; i < length; i++) {
            bytes[i] = firstBlob[i];
          }
        }
        
        const jsonStr = new TextDecoder().decode(bytes);
        const chainData = JSON.parse(jsonStr);
        
        // Get stored session identity
        const sessionKeyJson = localStorage.getItem('broker_session_key');
        if (!sessionKeyJson) {
          console.error('[broker] No session key found in localStorage');
          return;
        }
        
        // Import required modules
        const { Ed25519KeyIdentity, DelegationChain, DelegationIdentity } = await import('@dfinity/identity');
        
        // Reconstruct the session identity from JSON
        const sessionIdentity = Ed25519KeyIdentity.fromJSON(sessionKeyJson);
        
        // Reconstruct the delegation chain from the raw data
        const delegationChain = DelegationChain.fromJSON(chainData);
        
        // Create DelegationIdentity
        const delegationIdentity = DelegationIdentity.fromDelegation(sessionIdentity, delegationChain);
        
        // Dispatch custom event with the delegation identity
        // The AuthProvider can listen for this and update its state
        window.dispatchEvent(new CustomEvent('broker:auth-complete', {
          detail: { identity: delegationIdentity }
        }));
        
        // Clean up temporary session key
        localStorage.removeItem('broker_session_key');
        window.__brokerProcessing = false;
        
      } catch (err) {
        console.error('[broker] Error:', err?.message || err);
        window.__brokerProcessing = false;
      }
    });
  } catch {}
})();
