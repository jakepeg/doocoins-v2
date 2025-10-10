import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { AuthClient } from "@dfinity/auth-client";
import { DelegationIdentity, isDelegationValid } from "@dfinity/identity";
import { canisterId, createActor } from "../declarations/backend";
import { del } from "idb-keyval";

const THIRTY_DAYS_IN_NANOSECONDS = BigInt(30 * 24 * 3_600_000_000_000);

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [authClient, setAuthClient] = useState(null);
  const [actor, setActor] = useState(null);
  const [identity, setIdentity] = useState(null);
  const [loginStatus, setLoginStatus] = useState("initializing");
  const [loginError, setLoginError] = useState(null);

  const isLocal = process.env.NODE_ENV === "development";
  const identityProvider = isLocal 
    ? `http://rdmx6-jaaaa-aaaaa-aaadq-cai.localhost:4943`
    : "https://id.ai";

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
    };
  }, [createActorWithIdentity]);

  const login = useCallback(() => {
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
    
    authClient.login({
      identityProvider,
      onSuccess: handleLoginSuccess,
      onError: handleLoginError,
      maxTimeToLive: THIRTY_DAYS_IN_NANOSECONDS,
    });
  }, [authClient, identityProvider, handleLoginSuccess, handleLoginError, isLocal]);

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
