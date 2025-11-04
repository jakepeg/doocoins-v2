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
        // Fallback to production canister ID if environment variable is not set (e.g., in iOS WebView)
        // Also check if it's the local canister ID and use production instead
        const LOCAL_CANISTER_ID = 'uxrrr-q7777-77774-qaaaq-cai';
        const PRODUCTION_CANISTER_ID = 'f5cpb-qyaaa-aaaah-qdbeq-cai';
        let canisterId = mod.canisterId && mod.canisterId.trim();
        // If it's the local canister ID or empty, use production
        if (!canisterId || canisterId === LOCAL_CANISTER_ID) {
          canisterId = PRODUCTION_CANISTER_ID;
        }
        console.log('[broker] Using canister ID:', canisterId);
        const actor = mod.createActor(canisterId, { 
          agentOptions: { 
            host: 'https://icp-api.io',
            verifyQuerySignatures: false
          } 
        });
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
        
        // Dispatch custom event with BOTH the delegation identity AND session identity
        // The session identity needs to be persisted for AuthClient to reload the delegation
        window.dispatchEvent(new CustomEvent('broker:auth-complete', {
          detail: { 
            identity: delegationIdentity,
            sessionIdentity: sessionIdentity, // Include session key for persistence
            delegationChain: delegationChain  // Include chain for persistence
          }
        }));
        
        // Clean up temporary session key (will be stored by auth handler)
        localStorage.removeItem('broker_session_key');
        
        // CRITICAL: Clear the URL hash to prevent re-triggering on app restart (iOS bug)
        // iOS preserves URL hash across app restarts, causing broker flow to auto-start
        window.location.hash = '';
        console.log('[broker] URL hash cleared to prevent re-trigger');
        
        window.__brokerProcessing = false;
        
      } catch (err) {
        console.error('[broker] Error:', err?.message || err);
        window.__brokerProcessing = false;
      }
    });
  } catch {}
})();
