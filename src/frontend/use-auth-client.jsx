import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { AuthClient } from "@dfinity/auth-client";
import { Actor } from "@dfinity/agent";
import { DelegationIdentity, isDelegationValid, Ed25519KeyIdentity, DelegationChain } from "@dfinity/identity";
import { Capacitor } from "@capacitor/core";
import { canisterId as declaredCanisterId, createActor } from "../declarations/backend";
import { del, set } from "idb-keyval";

const THIRTY_DAYS_IN_NANOSECONDS = BigInt(30 * 24 * 3_600_000_000_000);

// Canister IDs for different environments
const LOCAL_CANISTER_ID = "uxrrr-q7777-77774-qaaaq-cai";
const PRODUCTION_CANISTER_ID = "f5cpb-qyaaa-aaaah-qdbeq-cai";

// LocalStorage-based storage adapter for iOS where IndexedDB can be unreliable
class LocalStorageAdapter {
  constructor(keyPrefix = 'ic-') {
    this.keyPrefix = keyPrefix;
  }

  async get(key) {
    try {
      const item = localStorage.getItem(this.keyPrefix + key);
      console.log(`[LocalStorageAdapter] GET ${this.keyPrefix + key}:`, item ? 'found' : 'not found');
      return item ? JSON.parse(item) : null;
    } catch (e) {
      console.error('[storage] localStorage get failed:', e);
      return null;
    }
  }

  async set(key, value) {
    try {
      localStorage.setItem(this.keyPrefix + key, JSON.stringify(value));
      console.log(`[LocalStorageAdapter] SET ${this.keyPrefix + key}: success`);
    } catch (e) {
      console.error('[storage] localStorage set failed:', e);
    }
  }

  async remove(key) {
    try {
      localStorage.removeItem(this.keyPrefix + key);
      console.log(`[LocalStorageAdapter] REMOVE ${this.keyPrefix + key}: success`);
    } catch (e) {
      console.error('[storage] localStorage remove failed:', e);
    }
  }
}

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [authClient, setAuthClient] = useState(null);
  const [actor, setActor] = useState(null);
  const [identity, setIdentity] = useState(null);
  const [loginStatus, setLoginStatus] = useState("initializing");
  const [loginError, setLoginError] = useState(null);

  // Check if we're in native Capacitor (production iOS/Android)
  const isNative = Capacitor.isNativePlatform();
  
  // Only use local development mode if NOT in native app AND hostname is localhost/127.0.0.1
  const isLocal = !isNative && (
    process.env.NODE_ENV === "development" || 
    window.location.hostname.includes("localhost") || 
    window.location.hostname.includes("127.0.0.1")
  );
  
  // Determine which canister ID to use based on environment
  // Native apps always use production canister
  // Browser uses local canister in dev mode, production canister otherwise
  const canisterId = isNative ? PRODUCTION_CANISTER_ID : (
    isLocal ? LOCAL_CANISTER_ID : PRODUCTION_CANISTER_ID
  );
  
  const identityProvider = isLocal 
    ? `http://rdmx6-jaaaa-aaaaa-aaadq-cai.localhost:4943`
    : "https://id.ai";

  const createActorWithIdentity = useCallback(async (identity) => {
    console.log('[auth] createActorWithIdentity called, isLocal:', isLocal);
    
    const host = isLocal ? "http://localhost:4943" : "https://icp-api.io";
    
    const actor = createActor(canisterId, {
      agentOptions: {
        identity,
        host,
        verifyQuerySignatures: false,
      },
    });
    
    // Fetch root key for local development (standard practice)
    if (isLocal) {
      const agent = Actor.agentOf(actor);
      if (agent && typeof agent.fetchRootKey === 'function') {
        try {
          console.log('[auth] Fetching root key for local development...');
          await agent.fetchRootKey();
          console.log('[auth] Root key fetched successfully');
        } catch (err) {
          console.warn('[auth] Failed to fetch root key:', err);
        }
      }
    }
    
    console.log('[auth] Actor created successfully');
    return actor;
  }, [isLocal, canisterId]);

  const handleLoginSuccess = useCallback(async () => {
    if (!authClient) return;
    
    const latestIdentity = authClient.getIdentity();
    if (!latestIdentity) {
      setLoginStatus("loginError");
      setLoginError(new Error("Identity not found after successful login"));
      return;
    }
    
    setIdentity(latestIdentity);
    
    const newActor = await createActorWithIdentity(latestIdentity);
    setActor(newActor);
    setLoginStatus("success");
  }, [authClient, createActorWithIdentity]);

  const handleLoginError = useCallback((maybeError) => {
    setLoginStatus("loginError");
    setLoginError(new Error(maybeError ?? "Login failed"));
  }, []);

  useEffect(() => {
    let cancelled = false;
    
    // Listen for broker auth completion
    const handleBrokerAuth = async (event) => {
      const { identity: delegationIdentity, sessionIdentity, delegationChain } = event.detail;
      
      if (!delegationIdentity) {
        console.error('[auth] No identity in broker event');
        return;
      }
      
      console.log('[auth] Broker auth complete, persisting to storage');
      console.log('[auth] Identity principal:', delegationIdentity.getPrincipal().toText());
      
      // 🔥 CRITICAL FIX: Store the delegation so it persists across app restarts!
      // We need to store both the delegation chain AND the session identity
      if (delegationIdentity instanceof DelegationIdentity && isNative && sessionIdentity) {
        try {
          // Use our LocalStorageAdapter directly (same one AuthClient uses)
          const storage = new LocalStorageAdapter('ic-auth-');
          
          console.log('[auth] Attempting to store delegation and session identity...');
          console.log('[auth] Delegation chain delegations count:', delegationChain.delegations.length);
          
          // CRITICAL: AuthClient expects delegation to be stored as a STRING
          // Our LocalStorageAdapter does JSON.parse() on get(), so we need to store
          // the delegation as a JSON string (which gets stringified again by adapter)
          // Result: double-stringified, so after parse it's still a string
          const delegationChainJson = JSON.stringify(delegationChain.toJSON());
          
          // Store directly to localStorage to avoid double-stringifying
          localStorage.setItem('ic-auth-delegation', delegationChainJson);
          console.log('[auth] ✅ Delegation chain persisted as STRING to localStorage');
          
          // Store the session identity (the Ed25519 key pair) as JSON object
          const identityJson = JSON.stringify(sessionIdentity.toJSON());
          await storage.set('identity', sessionIdentity.toJSON());
          console.log('[auth] ✅ Session identity persisted to storage');
          
          // BACKUP TO iOS KEYCHAIN (native storage that persists across app terminations)
          if (isNative && window?.webkit?.messageHandlers?.authStorage) {
            console.log('[auth] 📦 Backing up auth data to iOS Keychain...');
            try {
              window.webkit.messageHandlers.authStorage.postMessage({
                delegation: delegationChainJson,
                identity: identityJson
              });
              console.log('[auth] ✅ Auth data backed up to iOS Keychain');
            } catch (err) {
              console.error('[auth] ⚠️ Failed to backup to Keychain:', err);
            }
          }
          
          // Verify it was stored
          const verifyDelegation = localStorage.getItem('ic-auth-delegation');
          const verifyIdentity = await storage.get('identity');
          console.log('[auth] Verify delegation stored:', !!verifyDelegation);
          console.log('[auth] Verify identity stored:', !!verifyIdentity);
          console.log('[auth] Delegation is string:', typeof verifyDelegation === 'string');
        } catch (err) {
          console.error('[auth] Failed to persist delegation:', err);
          console.error('[auth] Error details:', err.message, err.stack);
        }
      }
      
      setIdentity(delegationIdentity);
      const newActor = await createActorWithIdentity(delegationIdentity);
      console.log('[auth] Actor created:', !!newActor);
      setActor(newActor);
      setLoginStatus("success");
    };
    
    window.addEventListener('broker:auth-complete', handleBrokerAuth);
    
    (async () => {
      try {
        setLoginStatus("initializing");
        
        console.log('[auth] Initializing AuthClient...');
        console.log('[auth] 🚀🚀🚀 APP STARTED - useAuthClient initializing 🚀🚀🚀');
        console.log('[auth] Build timestamp:', new Date().toISOString());
        
        // TEMP DEBUG: Show what's in localStorage at startup
        const lsKeys = Object.keys(localStorage);
        const hasDelegation = localStorage.getItem('ic-auth-delegation');
        const hasIdentity = localStorage.getItem('ic-auth-identity');
        
        // ALWAYS show alert on native to see what's happening
        if (isNative) {
          const msg = `STARTUP DEBUG:\nDelegation: ${hasDelegation ? `EXISTS (${hasDelegation.length} chars)` : 'MISSING'}\nIdentity: ${hasIdentity ? `EXISTS (${hasIdentity.length} chars)` : 'MISSING'}\nTotal keys: ${lsKeys.length}`;
          console.log('[auth] ' + msg);
          alert(msg);
        }
        console.log('[auth] isNative:', isNative);
        console.log('[auth] Capacitor.isNativePlatform():', Capacitor.isNativePlatform());
        
        // � RESTORE FROM USERDEFAULTS if localStorage is missing auth data
        // iOS clears WKWebView localStorage on app termination, but UserDefaults persists
        if (isNative && window?.webkit?.messageHandlers?.authRestore) {
          const hasDelegation = localStorage.getItem('ic-auth-delegation') !== null;
          const hasIdentity = localStorage.getItem('ic-auth-identity') !== null;
          
          console.log('[auth] 🔍 Checking if restoration needed: delegation=' + hasDelegation + ', identity=' + hasIdentity);
          
          if (!hasDelegation || !hasIdentity) {
            console.log('[auth] 📦 Requesting auth data restoration from UserDefaults...');
            // This is synchronous - Swift will immediately inject the data
            window.webkit.messageHandlers.authRestore.postMessage({});
            
            // Give it a moment to inject, then check again
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const restoredDelegation = localStorage.getItem('ic-auth-delegation');
            const restoredIdentity = localStorage.getItem('ic-auth-identity');
            if (restoredDelegation && restoredIdentity) {
              console.log('[auth] ✅ Auth data successfully restored from UserDefaults');
            } else {
              console.log('[auth] ℹ️ No auth data available in UserDefaults');
            }
          } else {
            console.log('[auth] ✅ localStorage already has auth data');
          }
        }
        
        // �🔍 DEBUG: Check what's actually in localStorage on startup
        if (isNative) {
          const allKeys = Object.keys(localStorage);
          console.log('[auth] 🔍 All localStorage keys on startup:', allKeys);
          const authKeys = allKeys.filter(k => k.startsWith('ic-auth-'));
          console.log('[auth] 🔍 Auth-related keys:', authKeys);
          authKeys.forEach(key => {
            const value = localStorage.getItem(key);
            console.log(`[auth] 🔍 ${key}: ${value ? 'EXISTS (length: ' + value.length + ')' : 'NULL'}`);
          });
        }
        
        // ✅ CLEAR STALE BROKER CALLBACK URLs on app launch
        // iOS sometimes re-delivers old deep links when app restarts
        const hashParams = new URLSearchParams(window.location.hash.slice(1));
        const hasCode = hashParams.has("code");
        const hasNonce = hashParams.has("nonce");
        const brokerNonce = localStorage.getItem("broker_nonce");
        
        // If URL has broker params BUT no matching nonce in storage, it's stale
        if ((hasCode || hasNonce) && !brokerNonce) {
          console.warn("[auth] ⚠️ Clearing stale broker callback URL from previous session");
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
        
        // Use localStorage-based storage for native iOS to avoid IndexedDB issues
        const storageAdapter = isNative ? new LocalStorageAdapter('ic-auth-') : undefined;
        console.log('[auth] Using storage adapter:', !!storageAdapter);
        
        // 🔥 CRITICAL FIX: Check for broker-stored delegation BEFORE creating AuthClient
        // The broker pattern bypasses AuthClient's normal flow, so we need to manually
        // check for and restore the delegation on iOS
        let brokerStoredIdentity = null;
        if (isNative) {
          try {
            const delegationString = localStorage.getItem('ic-auth-delegation');
            const identityJson = await storageAdapter.get('identity');
            
            if (delegationString && identityJson) {
              console.log('[auth] 🔄 Found broker-stored delegation, reconstructing identity...');
              console.log('[auth] delegationString type:', typeof delegationString);
              console.log('[auth] identityJson type:', typeof identityJson);
              console.log('[auth] identityJson is array:', Array.isArray(identityJson));
              console.log('[auth] identityJson array length:', identityJson?.length);
              
              const { Ed25519KeyIdentity, DelegationChain, DelegationIdentity } = await import('@dfinity/identity');
              
              // Ed25519KeyIdentity.toJSON() returns a plain array [publicKeyHex, privateKeyHex]
              // fromJSON() expects either:
              // 1. The array directly: ["pub...", "priv..."]
              // 2. A JSON string of the array: '["pub...", "priv..."]'
              // Since identityJson is already the array, fromJSON should work...
              // BUT the error suggests it's trying to JSON.parse something that's not a string
              // Let's try converting to JSON string first
              const identityJsonString = Array.isArray(identityJson) ? JSON.stringify(identityJson) : identityJson;
              console.log('[auth] Calling Ed25519KeyIdentity.fromJSON with:', typeof identityJsonString);
              const sessionIdentity = Ed25519KeyIdentity.fromJSON(identityJsonString);
              
              // Reconstruct the delegation chain
              const chainData = JSON.parse(delegationString);
              const delegationChain = DelegationChain.fromJSON(chainData);
              
              // Check if delegation is still valid (not expired)
              const now = Date.now();
              const delegations = delegationChain.delegations;
              const isExpired = delegations.some(d => {
                const expiry = Number(d.delegation.expiration) / 1_000_000; // Convert nanoseconds to milliseconds
                return expiry < now;
              });
              
              if (!isExpired) {
                // Create DelegationIdentity
                brokerStoredIdentity = DelegationIdentity.fromDelegation(sessionIdentity, delegationChain);
                console.log('[auth] ✅ Successfully restored identity from broker storage');
                console.log('[auth] Restored principal:', brokerStoredIdentity.getPrincipal().toText());
                console.log('[auth] Delegation expiry:', delegations.map(d => new Date(Number(d.delegation.expiration) / 1_000_000).toISOString()));
              } else {
                console.log('[auth] ⚠️ Stored delegation expired, clearing...');
                console.log('[auth] Now:', new Date(now).toISOString());
                console.log('[auth] Expiry times:', delegations.map(d => new Date(Number(d.delegation.expiration) / 1_000_000).toISOString()));
                localStorage.removeItem('ic-auth-delegation');
                await storageAdapter.remove('identity');
                
                // ALSO CLEAR KEYCHAIN
                if (isNative && window?.webkit?.messageHandlers?.authClear) {
                  console.log('[auth] Clearing expired auth from Keychain...');
                  window.webkit.messageHandlers.authClear.postMessage({});
                }
              }
            }
          } catch (err) {
            console.error('[auth] Failed to restore broker delegation:', err);
            console.error('[auth] Error message:', err?.message);
            console.error('[auth] Error stack:', err?.stack);
          }
        }
        
        // DON'T pass storage adapter to AuthClient on iOS - it will overwrite our identity
        // with CryptoKey format that doesn't serialize properly
        // We manage storage manually through Keychain backup/restore
        const client = await AuthClient.create({
          idleOptions: {
            disableDefaultIdleCallback: true,
            disableIdle: true,
          },
        });
        
        if (cancelled) return;
        setAuthClient(client);
        
        // If we have a broker-stored identity, use it directly
        if (brokerStoredIdentity) {
          console.log('[auth] Using broker-restored identity');
          console.log('[auth] Setting identity...');
          setIdentity(brokerStoredIdentity);
          console.log('[auth] Creating actor...');
          const newActor = await createActorWithIdentity(brokerStoredIdentity);
          setActor(newActor);
          console.log('[auth] Setting loginStatus to success...');
          setLoginStatus("success");
          console.log('[auth] ✅ All state set - should be authenticated now');
          
          // Give React time to propagate state changes
          await new Promise(resolve => setTimeout(resolve, 100));
          console.log('[auth] State propagation delay complete');
          
          // RE-BACKUP to Keychain AFTER state has settled
          // This ensures subsequent restarts have valid data
          if (isNative && window?.webkit?.messageHandlers?.authStorage) {
            console.log('[auth] 🔄 Re-backing up restored identity to Keychain...');
            const delegationString = localStorage.getItem('ic-auth-delegation');
            const identityJson = await storageAdapter.get('identity');
            if (delegationString && identityJson) {
              // Identity needs to be stringified to match what we backed up on fresh login
              const identityString = JSON.stringify(identityJson);
              window.webkit.messageHandlers.authStorage.postMessage({
                delegation: delegationString,
                identity: identityString
              });
              console.log('[auth] ✅ Re-backup complete');
            } else {
              console.log('[auth] ⚠️ Re-backup skipped - missing data');
            }
          }
          
          return;
        }
        
        const isAuthenticated = await client.isAuthenticated();
        console.log('[auth] Initial isAuthenticated check:', isAuthenticated);
        console.log('[auth] brokerStoredIdentity exists:', !!brokerStoredIdentity);
        if (cancelled) return;
        
        // If we have broker identity but somehow didn't return early, use it now
        if (brokerStoredIdentity && !isAuthenticated) {
          console.log('[auth] ⚠️ Broker identity exists but wasnt used - using it now');
          setIdentity(brokerStoredIdentity);
          const newActor = await createActorWithIdentity(brokerStoredIdentity);
          setActor(newActor);
          setLoginStatus("success");
          return;
        }
        
        if (isAuthenticated) {
          const loadedIdentity = client.getIdentity();
          
          // Check for delegation validity
          if (loadedIdentity instanceof DelegationIdentity) {
            const delegation = loadedIdentity.getDelegation();
            if (!isDelegationValid(delegation)) {
              console.log("Delegation expired, clearing auth state");
              await client.logout();
              setIdentity(null);
              setActor(null);
              setLoginStatus("idle");
              return;
            }
          }
          
          setIdentity(loadedIdentity);
          const newActor = await createActorWithIdentity(loadedIdentity);
          setActor(newActor);
          setLoginStatus("success");
        } else {
          setLoginStatus("idle");
        }
      } catch (error) {
        if (!cancelled) {
          setLoginStatus("loginError");
          setLoginError(error instanceof Error ? error : new Error("Initialization failed"));
        }
      }
    })();
    
    return () => {
      cancelled = true;
      window.removeEventListener('broker:auth-complete', handleBrokerAuth);
    };
  }, [createActorWithIdentity]);

  const login = useCallback(async () => {
    // DEBUG: Trace who's calling login() to find auto-trigger source
    console.log('[auth] 🔍 login() called from:', new Error().stack);
    
    if (!authClient) {
      setLoginStatus("loginError");
      setLoginError(new Error("AuthClient is not initialized yet"));
      return;
    }

    const currentIdentity = authClient.getIdentity();
    if (
      !currentIdentity.getPrincipal().isAnonymous() &&
      currentIdentity instanceof DelegationIdentity &&
      isDelegationValid(currentIdentity.getDelegation())
    ) {
      setLoginStatus("loginError");
      setLoginError(new Error("User is already authenticated"));
      return;
    }

    setLoginStatus("logging-in");
    
    // DEBUG: trace II handshake messages
    const debugHandler = (e) => {
      try {
        console.log("[II][debug] message:", { origin: e.origin, data: e.data });
      } catch {}
    };
    window.addEventListener("message", debugHandler);
      
    const isNativeiOS = Capacitor?.isNativePlatform?.() === true;
    
    // Broker flag: default ON for native iOS, unless explicitly disabled via env/localStorage/URL (?broker=0)
    const brokerFlag = (() => {
      try {
        const env = (import.meta && import.meta.env && import.meta.env.VITE_USE_BROKER);
        const ls = typeof localStorage !== 'undefined' ? localStorage.getItem('broker') : null;
        const url = new URL(window.location.href);
        const qp = url.searchParams.get('broker');
        // Explicit OFF takes precedence
        if (env === '0' || ls === '0' || qp === '0') return false;
        // Explicit ON
        if (env === '1' || ls === '1' || qp === '1') return true;
        // Default: ON on native iOS
        return isNativeiOS;
      } catch {
        return isNativeiOS;
      }
    })();

    if (isNativeiOS && brokerFlag && window?.webkit?.messageHandlers?.broker) {
      // Start broker flow via native ASWebAuthenticationSession
      console.log('[broker] 🚀 BROKER FLOW STARTING');
      
      try {
        // Ensure native message handler is registered (it can be late on app start)
        const waitForBroker = async (ms = 1500) => {
          const start = Date.now();
          while (Date.now() - start < ms) {
            const ok = !!(window?.webkit?.messageHandlers?.broker);
            if (ok) return true;
            await new Promise(r => setTimeout(r, 50));
          }
          return !!(window?.webkit?.messageHandlers?.broker);
        };
        const ready = await waitForBroker(1500);
        if (!ready) throw new Error('broker handler not ready');

        // Generate session key pair for delegation chain
        console.log('[broker] ✅ BROKER FLOW STARTING - generating session key pair');
        
        const sessionIdentity = Ed25519KeyIdentity.generate();
        console.log('[broker] sessionIdentity created:', !!sessionIdentity);
        
        const sessionPublicKey = sessionIdentity.getPublicKey();
        console.log('[broker] sessionPublicKey object:', !!sessionPublicKey);
        
        // Get DER encoding - try multiple approaches
        let sessionPublicKeyDer;
        try {
          sessionPublicKeyDer = sessionPublicKey.toDer();
          console.log('[broker] toDer() returned:', typeof sessionPublicKeyDer, sessionPublicKeyDer);
        } catch (e) {
          console.error('[broker] toDer() failed:', e);
        }
        
        // If toDer() fails or returns empty, try getting raw bytes and manually add DER prefix
        if (!sessionPublicKeyDer || sessionPublicKeyDer.length === 0 || !(sessionPublicKeyDer instanceof Uint8Array)) {
          console.log('[broker] toDer() failed, trying manual DER encoding');
          const rawKey = sessionPublicKey.toRaw();
          console.log('[broker] rawKey:', typeof rawKey, rawKey?.length);
          
          // Ed25519 public key DER prefix (algorithm identifier)
          const DER_PREFIX = new Uint8Array([
            0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00
          ]);
          
          if (rawKey && rawKey.length === 32) {
            sessionPublicKeyDer = new Uint8Array([...DER_PREFIX, ...rawKey]);
            console.log('[broker] manually created DER, length:', sessionPublicKeyDer.length);
          }
        }
        
        console.log('[broker] final sessionPublicKeyDer length:', sessionPublicKeyDer?.length || 0);
        console.log('[broker] sessionPublicKeyDer instanceof Uint8Array:', sessionPublicKeyDer instanceof Uint8Array);
        
        const sessionPublicKeyHex = Array.from(sessionPublicKeyDer || [])
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        console.log('[broker] session public key hex length:', sessionPublicKeyHex.length);
        console.log('[broker] session public key:', sessionPublicKeyHex.substring(0, 32) + '...');

        const rawOrigin = window.location.origin;
        const isHttpOrigin = /^https?:/i.test(rawOrigin);
        const defaultWebHost = 'https://zks5c-sqaaa-aaaah-qqf4a-cai.icp0.io';
        const base = (isHttpOrigin ? rawOrigin : (import.meta?.env?.VITE_APP_WEB_URL || defaultWebHost)).replace(/\/$/, '');
        const nonce = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
        const ret = 'doocoins://ii-callback';
        const relayUrl = `${base}/auth/relay?nonce=${encodeURIComponent(nonce)}&publicKey=${encodeURIComponent(sessionPublicKeyHex)}&return=${encodeURIComponent(ret)}`;
        
        console.log('[broker] FULL RELAY URL:', relayUrl);
        console.log('[broker] nonce:', nonce);
        console.log('[broker] publicKey length:', sessionPublicKeyHex.length);
        console.log('[broker] return:', ret);
        
        // Store session identity for use after callback
        try { 
          localStorage.setItem('broker_nonce', nonce);
          localStorage.setItem('broker_session_key', JSON.stringify(sessionIdentity.toJSON()));
        } catch {}

        let settled = false;
        const onBroker = async (e) => {
          if (settled) return;
          settled = true;
          window.removeEventListener('broker:callback', onBroker);
          
          // Parse callback URL - expecting code and nonce in URI fragment (hash), not query params
          try {
            const callbackUrl = e?.detail || '';
            console.log('[broker] callback URL:', callbackUrl);
            console.log('[broker] callback URL type:', typeof callbackUrl);
            console.log('[broker] creating URL object...');
            const url = new URL(callbackUrl);
            console.log('[broker] URL object created successfully');
            
            // Parse from hash fragment (e.g., doocoins://ii-callback#code=xxx&nonce=yyy)
            const hash = url.hash.substring(1); // Remove leading #
            console.log('[broker] hash fragment:', hash);
            const hashParams = new URLSearchParams(hash);
            const code = hashParams.get('code');
            const cbNonce = hashParams.get('nonce');
            const err = hashParams.get('error');
            
            console.log('[broker] parsed values:', { 
              code: code ? (code.substring(0, 8) + '...') : null, 
              cbNonce, 
              err,
              storedNonce: nonce,
              nonceMatch: cbNonce === nonce
            });
            
            // Basic checks; if not present yet, fall back to standard popup login
            if (!code || !cbNonce || err) {
              console.warn('[broker] missing code/nonce or error:', { code: !!code, cbNonce: !!cbNonce, err });
              console.warn('[broker] callback parsing failed, falling back to standard popup flow');
              window.removeEventListener('broker:callback', onBroker);
              window.removeEventListener("message", debugHandler);
              
              // Trigger standard AuthClient login as fallback
              authClient.login({
                identityProvider,
                onSuccess: handleLoginSuccess,
                onError: handleLoginError,
                maxTimeToLive: THIRTY_DAYS_IN_NANOSECONDS,
              });
              return;
            }
            
            try {
              console.log('[broker] fetching delegation chain from backend');
              const backendActor = createActor(canisterId, { agentOptions: { host: isLocal ? "http://localhost:4943" : "https://icp-api.io" } });
              const blob = await backendActor.takeAuthBlob(code, cbNonce);
              if (blob === null) {
                console.warn('[broker] no blob (expired/invalid)');
                throw new Error('no-blob');
              }
              
              const bytes = Array.isArray(blob) ? new Uint8Array(blob) : blob;
              const jsonStr = new TextDecoder().decode(bytes);
              console.log('[broker] received delegation chain blob');
              
              // Retrieve stored session identity
              const sessionKeyJson = localStorage.getItem('broker_session_key');
              if (!sessionKeyJson) {
                console.error('[broker] no stored session key');
                throw new Error('no-session-key');
              }
              
              const storedSessionIdentity = Ed25519KeyIdentity.fromJSON(sessionKeyJson);
              console.log('[broker] restored session identity');
              
              // Reconstruct DelegationIdentity from chain + stored session key
              let importedIdentity = null;
              try {
                const chainData = JSON.parse(jsonStr);
                console.log('[broker] parsed delegation chain:', { delegationCount: chainData.delegations?.length });
                importedIdentity = DelegationIdentity.fromDelegation(storedSessionIdentity, DelegationChain.fromJSON(chainData));
                console.log('[broker] reconstructed DelegationIdentity from chain');
              } catch (e) {
                console.warn('[broker] failed to reconstruct from delegation chain', e);
              }
              
              if (!importedIdentity) {
                console.warn('[broker] importedIdentity empty');
                throw new Error('no-import');
              }
              
              console.log('[broker] successfully imported identity');
              
              // CRITICAL: Persist the delegation to AuthClient's storage so it survives app reloads
              // BUT: Don't recreate AuthClient as it will overwrite our identity with CryptoKey format
              try {
                const delegation = importedIdentity.getDelegation();
                const delegationJSON = delegation.toJSON();
                
                // For iOS, use both idb-keyval AND localStorage as fallback
                await set('delegation', delegationJSON);
                if (isNative) {
                  localStorage.setItem('ic-auth-delegation', JSON.stringify(delegationJSON));
                }
                console.log('[broker] delegation persisted to storage');
                
                // DON'T recreate AuthClient - use the identity directly
                // This prevents AuthClient from storing CryptoKey format which doesn't serialize
                setIdentity(importedIdentity);
                const newActor = await createActorWithIdentity(importedIdentity);
                setActor(newActor);
                setLoginStatus('success');
                console.log('[broker] login complete - using imported identity directly');
              } catch (e) {
                console.warn('[broker] failed to persist delegation', e);
                // Still try to use the identity even if persistence failed
                setIdentity(importedIdentity);
                const newActor = await createActorWithIdentity(importedIdentity);
                setActor(newActor);
                setLoginStatus('success');
              }
              
              console.log('[broker] login complete');
              window.removeEventListener("message", debugHandler);
              return;
            } catch (err) {
              console.warn('[broker] import failed', err);
              // Retry broker once before popup fallback
              if (window.__brokerRetried !== true && window?.webkit?.messageHandlers?.broker) {
                window.__brokerRetried = true;
                try {
                  // Generate new session key for retry
                  const sessionIdentity2 = Ed25519KeyIdentity.generate();
                  const sessionPublicKey2 = sessionIdentity2.getPublicKey().toDer();
                  const sessionPublicKeyHex2 = Array.from(sessionPublicKey2)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('');
                  
                  const rawOrigin2 = window.location.origin;
                  const isHttpOrigin2 = /^https?:/i.test(rawOrigin2);
                  const base2 = (isHttpOrigin2 ? rawOrigin2 : (import.meta?.env?.VITE_APP_WEB_URL || defaultWebHost)).replace(/\/$/, '');
                  const nonce2 = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
                  const ret2 = 'doocoins://ii-callback';
                  const relayUrl2 = `${base2}/auth/relay?nonce=${encodeURIComponent(nonce2)}&publicKey=${encodeURIComponent(sessionPublicKeyHex2)}&return=${encodeURIComponent(ret2)}`;
                  
                  // Store retry session key
                  try {
                    localStorage.setItem('broker_nonce', nonce2);
                    localStorage.setItem('broker_session_key', JSON.stringify(sessionIdentity2.toJSON()));
                  } catch {}
                  
                  window.addEventListener('broker:callback', onBroker);
                  settled = false;
                  window.webkit.messageHandlers.broker.postMessage({ relayUrl: relayUrl2 });
                  return;
                } catch (e2) {
                  console.warn('[broker] retry failed, falling back to popup', e2);
                }
              }
              window.removeEventListener("message", debugHandler);
              setLoginStatus('loginError');
              setLoginError(new Error('Sign-in could not be verified. Please try again.'));
              return;
            }
          } catch (err) {
            console.error('[broker] CALLBACK ERROR:', err);
            console.error('[broker] Error message:', err.message);
            console.error('[broker] Error stack:', err.stack);
            window.removeEventListener("message", debugHandler);
            setLoginStatus('loginError');
            setLoginError(new Error('Sign-in did not complete. Please try again.'));
          }
        };
        
        window.addEventListener('broker:callback', onBroker);
        
        const timeoutId = setTimeout(() => {
          if (!settled) {
            settled = true;
            window.removeEventListener('broker:callback', onBroker);
            console.warn('[broker] timeout (12s) waiting for callback');
            window.removeEventListener("message", debugHandler);
            setLoginStatus('loginError');
            setLoginError(new Error('Sign-in timed out. Please try again.'));
          }
        }, 12000);

        // Kick off native ASWebAuthenticationSession
        console.log('[broker] ⚡ CALLING NATIVE BRIDGE NOW with relayUrl:', relayUrl);
        window.webkit.messageHandlers.broker.postMessage({ relayUrl });
        return; // Defer to callback or timeout; do not create popup pre-emptively
      } catch (err) {
        console.warn('[broker] failed to start, falling back to popup', err);
        // Fall through to standard login below
      }
    } else {
      console.log('[login] Not using broker flow:', { isNativeiOS, brokerFlag, hasWebkit: !!window?.webkit?.messageHandlers?.broker });
    }
    
    // Standard non-broker login (for web or if broker fails)
    // Use windowOpenerFeatures to keep popup open and prevent full page redirect
    authClient.login({
      identityProvider,
      onSuccess: handleLoginSuccess,
      onError: handleLoginError,
      maxTimeToLive: THIRTY_DAYS_IN_NANOSECONDS,
      // Keep popup open during auth to prevent PWA context loss
      windowOpenerFeatures: "toolbar=0,location=0,menubar=0,width=500,height=600,left=100,top=100",
    });
  }, [authClient, identityProvider, handleLoginSuccess, handleLoginError, isLocal, createActorWithIdentity]);

  const logout = useCallback(async () => {
    if (!authClient) {
      setLoginStatus("loginError");
      setLoginError(new Error("Auth client not initialized"));
      return;
    }

    try {
      await authClient.logout();
      setIdentity(null);
      setActor(null);
      setLoginStatus("idle");
      setLoginError(null);
      
      // Clean up local storage
      del("childList");
      del("childGoal");
      del("rewardList");
      del("selectedChild");
      del("selectedChildName");
      del("taskList");
      del("transactionList");
      del("nfidDelegationChain");
      
      // Clear Keychain backup on native
      if (isNative && window?.webkit?.messageHandlers?.authClear) {
        console.log('[auth] Clearing Keychain backup...');
        window.webkit.messageHandlers.authClear.postMessage({});
      }
    } catch (error) {
      setLoginStatus("loginError");
      setLoginError(error instanceof Error ? error : new Error("Logout failed"));
    }
  }, [authClient]);

  const authValue = useMemo(() => {
    const isAuthenticated = loginStatus === "success" && !!identity;
    const isLoading = loginStatus === "initializing" || loginStatus === "logging-in";
    console.log('[auth] 🔍 useMemo recomputing:', { loginStatus, hasIdentity: !!identity, isAuthenticated, isLoading });
    
    return {
      isAuthenticated,
      login,
      logout,
      identity,
      principal: identity?.getPrincipal(),
      actor,
      isLoading,
      loginStatus,
      isInitializing: loginStatus === "initializing",
      isLoginIdle: loginStatus === "idle",
      isLoggingIn: loginStatus === "logging-in",
      isLoginSuccess: loginStatus === "success",
      isLoginError: loginStatus === "loginError",
      loginError,
    };
  }, [identity, login, logout, actor, loginStatus, loginError]);

  return (
    <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
