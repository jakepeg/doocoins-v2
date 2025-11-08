import React, { createContext, useContext, useEffect, useState } from "react";
import { canisterId, createActor } from "../declarations/backend";
import { createStore, del, get } from "idb-keyval";
import { HttpAgent } from "@dfinity/agent";
import { Capacitor } from "@capacitor/core";

const AuthContext = createContext();

const store = createStore('db', 'kids');

// Check if we're in native Capacitor (production iOS/Android)
const isNative = Capacitor.isNativePlatform();

// Only use local development mode if NOT in native app AND hostname is localhost/127.0.0.1
const isLocal = !isNative && (
  process.env.NODE_ENV === "development" || 
  window.location.hostname.includes("localhost") || 
  window.location.hostname.includes("127.0.0.1")
);

export const useAuthClient = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [actor, setActor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true)
    
    // Create agent and fetch root key for local development
    const initActor = async () => {
      const agent = new HttpAgent({
        host: isLocal ? "http://localhost:4943" : "https://ic0.app",
      });
      
      // Fetch root key for local development
      if (isLocal) {
        try {
          console.log('[kids-auth] Fetching root key for local development...');
          await agent.fetchRootKey();
          console.log('[kids-auth] Root key fetched successfully');
        } catch (err) {
          console.warn('[kids-auth] Failed to fetch root key:', err);
        }
      }
      
      const actor = createActor(canisterId, { agent });
      setActor(actor);
      
      get("selectedChild", store)
        .then((data) => {
          if (data) {
            setIsAuthenticated(true);
            return;
          }
          setIsAuthenticated(false);
        })
        .catch(() => {
          setIsAuthenticated(false);
        })
        .finally(() => {
          setIsLoading(false);
        });
    };
    
    initActor();
  }, []);

  const login = async (code) => {
    try {
      const data = await actor?.checkMagiCode(Number(code));
      if (data?.[0]) {
        setIsAuthenticated(true);
      } else {
        del("selectedChild", store);
        setIsAuthenticated(false);
      }
      return data?.[0];
    } catch (error) {
      setIsAuthenticated(false);
      return { error: error?.message };
    }
  };

  async function logout() {
    const childId = await get("selectedChild", store)
    del("childList", store)
    del("childGoal", store)
    del("rewardList", store)
    del("balance-" + childId, store)
    del("selectedChild", store)
    del("selectedChildName", store)
    del("taskList", store)
    del("transactionList", store)

    setIsAuthenticated(false)
  }

  return {
    isAuthenticated,
    login,
    logout,
    actor,
    isLoading,
    store
  };
};

export const AuthProvider = ({ children }) => {
  const auth = useAuthClient();

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
