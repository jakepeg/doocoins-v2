// Simplified broker handler - just store the delegation data and reload
(function () {
  try {
    if (typeof window === 'undefined' || !window.addEventListener) return;

    window.__brokerLastURL = null;
    window.addEventListener('broker:callback', async (e) => {
      try {
        const url = e?.detail || '';
        window.__brokerLastURL = url;
        console.log('[broker] callback URL:', url);
        
        const u = new URL(url);
        const paramsString = u.hash ? u.hash.substring(1) : u.search.substring(1);
        const params = new URLSearchParams(paramsString);
        const code = params.get('code');
        const nonce = params.get('nonce');
        
        if (!code || !nonce) {
          console.warn('[broker] missing code/nonce');
          return;
        }
        
        console.log('[broker] 📞 Fetching auth blob...');
        const mod = await import('../../declarations/backend/index.js');
        const actor = mod.createActor(mod.canisterId, { agentOptions: { host: 'https://icp-api.io' } });
        const result = await actor.takeAuthBlob(code, nonce);
        
        if (!result || result.length === 0) {
          console.warn('[broker] No auth blob returned');
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
        console.log('[broker] 📜 Got delegation chain with', chainData.delegations?.length, 'delegations');
        console.log('[broker] 🔍 Full chain data:', JSON.stringify(chainData, null, 2));
        
        // Get stored session identity
        const sessionKeyJson = localStorage.getItem('broker_session_key');
        if (!sessionKeyJson) {
          console.error('[broker] ❌ No session key found');
          return;
        }
        
        // Import required modules
        const { Ed25519KeyIdentity, DelegationChain, DelegationIdentity } = await import('@dfinity/identity');
        
        // Reconstruct the session identity from JSON
        console.log('[broker] 🔑 Reconstructing session identity...');
        const sessionIdentity = Ed25519KeyIdentity.fromJSON(sessionKeyJson);
        console.log('[broker] ✅ Session identity reconstructed');
        
        // Check delegation format before reconstruction
        console.log('[broker] 🔍 First delegation publicKey type:', typeof chainData.delegations[0]?.delegation?.pubkey);
        console.log('[broker] 🔍 First delegation publicKey:', chainData.delegations[0]?.delegation?.pubkey);
        
        // Reconstruct the delegation chain from the raw data
        console.log('[broker] ⛓️ Reconstructing delegation chain...');
        const delegationChain = DelegationChain.fromJSON(chainData);
        
        // Create DelegationIdentity
        console.log('[broker] 🎭 Creating delegation identity...');
        const delegationIdentity = DelegationIdentity.fromDelegation(sessionIdentity, delegationChain);
        console.log('[broker] ✅ Created delegation identity');
        
        // Dispatch custom event with the delegation identity
        // The AuthProvider can listen for this and update its state
        window.dispatchEvent(new CustomEvent('broker:auth-complete', {
          detail: { identity: delegationIdentity }
        }));
        console.log('[broker] 📡 Dispatched auth-complete event');
        
        // Clean up temporary session key
        localStorage.removeItem('broker_session_key');
        
      } catch (err) {
        console.error('[broker] Error:', err?.message || err);
      }
    });
  } catch {}
})();
