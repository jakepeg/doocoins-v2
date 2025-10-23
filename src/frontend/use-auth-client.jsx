import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { AuthClient } from "@dfinity/auth-client";
import { DelegationIdentity, isDelegationValid, Ed25519KeyIdentity, DelegationChain } from "@dfinity/identity";
import { Capacitor } from "@capacitor/core";
import { canisterId, createActor } from "../declarations/backend";
import { del, set } from "idb-keyval";

const THIRTY_DAYS_IN_NANOSECONDS = BigInt(30 * 24 * 3_600_000_000_000);

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [authClient, setAuthClient] = useState(null);
  const [actor, setActor] = useState(null);
  const [identity, setIdentity] = useState(null);
  const [loginStatus, setLoginStatus] = useState("initializing");
  const [loginError, setLoginError] = useState(null);

  const isLocal = process.env.NODE_ENV === "development" || 
    window.location.hostname.includes("localhost") || 
    window.location.hostname.includes("127.0.0.1");
  const identityProvider = isLocal 
    ? `http://rdmx6-jaaaa-aaaaa-aaadq-cai.localhost:4943/#authorize`
    : "https://id.ai/#authorize";

  const createActorWithIdentity = useCallback((identity) => {
    return createActor(canisterId, {
      agentOptions: {
        identity,
        host: isLocal ? "http://localhost:4943" : "https://icp-api.io",
      },
    });
  }, [isLocal]);

  const handleLoginSuccess = useCallback(() => {
    if (!authClient) return;
    
    const latestIdentity = authClient.getIdentity();
    if (!latestIdentity) {
      setLoginStatus("loginError");
      setLoginError(new Error("Identity not found after successful login"));
      return;
    }
    
    setIdentity(latestIdentity);
    
    const newActor = createActorWithIdentity(latestIdentity);
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
    const handleBrokerAuth = (event) => {
      const { identity: delegationIdentity } = event.detail;
      
      if (!delegationIdentity) {
        console.error('[auth] No identity in broker event');
        return;
      }
      
      setIdentity(delegationIdentity);
      const newActor = createActorWithIdentity(delegationIdentity);
      setActor(newActor);
      setLoginStatus("success");
    };
    
    window.addEventListener('broker:auth-complete', handleBrokerAuth);
    
    (async () => {
      try {
        setLoginStatus("initializing");
        
        const client = await AuthClient.create({
          idleOptions: {
            disableDefaultIdleCallback: true,
            disableIdle: true,
          },
        });
        
        if (cancelled) return;
        setAuthClient(client);
        
        const isAuthenticated = await client.isAuthenticated();
        if (cancelled) return;
        
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
          const newActor = createActorWithIdentity(loadedIdentity);
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
              try {
                const delegation = importedIdentity.getDelegation();
                const delegationJSON = delegation.toJSON();
                await set('delegation', delegationJSON);
                console.log('[broker] delegation persisted to idb-keyval');
                
                // Recreate AuthClient to pick up the persisted delegation
                if (authClient) {
                  const newClient = await AuthClient.create({
                    idleOptions: { disableDefaultIdleCallback: true, disableIdle: true },
                  });
                  setAuthClient(newClient);
                  console.log('[broker] AuthClient recreated');
                  
                  const isAuth = await newClient.isAuthenticated();
                  console.log('[broker] new AuthClient isAuthenticated:', isAuth);
                  
                  if (isAuth) {
                    const clientIdentity = newClient.getIdentity();
                    setIdentity(clientIdentity);
                    const newActor = createActorWithIdentity(clientIdentity);
                    setActor(newActor);
                    setLoginStatus('success');
                    console.log('[broker] login complete - using AuthClient identity');
                  } else {
                    console.warn('[broker] AuthClient still not authenticated, using manual identity');
                    setIdentity(importedIdentity);
                    const newActor = createActorWithIdentity(importedIdentity);
                    setActor(newActor);
                    setLoginStatus('success');
                  }
                } else {
                  setIdentity(importedIdentity);
                  const newActor = createActorWithIdentity(importedIdentity);
                  setActor(newActor);
                  setLoginStatus('success');
                }
              } catch (e) {
                console.warn('[broker] failed to persist delegation', e);
                // Still try to use the identity even if persistence failed
                setIdentity(importedIdentity);
                const newActor = createActorWithIdentity(importedIdentity);
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
    authClient.login({
      identityProvider,
      onSuccess: handleLoginSuccess,
      onError: handleLoginError,
      maxTimeToLive: THIRTY_DAYS_IN_NANOSECONDS,
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
    } catch (error) {
      setLoginStatus("loginError");
      setLoginError(error instanceof Error ? error : new Error("Logout failed"));
    }
  }, [authClient]);

  const authValue = useMemo(() => {
    const isAuthenticated = loginStatus === "success" && !!identity;
    const isLoading = loginStatus === "initializing" || loginStatus === "logging-in";
    
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
