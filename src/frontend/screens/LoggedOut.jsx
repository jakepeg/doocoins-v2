import React from "react";
import { useAuth } from "../use-auth-client";
import { Navigate, useNavigate } from "react-router-dom";
import { Box, Button, Link, Text } from "@chakra-ui/react";
import ICBadge from "../assets/images/ic-badge.svg";
import ShareIcon from "../assets/images/share-icon.svg";
import logo from "../assets/images/logo.svg";
import useClearContextState from "../hooks/useClearContextState";
import { Capacitor } from "@capacitor/core";

function checkForIOS() {
  // Don't show PWA install prompt on native app
  if (Capacitor.isNativePlatform()) {
    return false;
  }

  // already installed
  if (navigator.standalone) {
    return false;
  }

  const ua = window.navigator.userAgent;
  const webkit = !!ua.match(/WebKit/i);
  const isIPad = !!ua.match(/iPad/i);
  const isIPhone = !!ua.match(/iPhone/i);
  const isMacOS = !!ua.match(/Macintosh/i);
  const isIOS = isIPad || isIPhone;
  const isSafari = isIOS && webkit && !ua.match(/CriOS/i);
  const isIOSWithSafari = isIOS && isSafari;
  const isMacOSWithSafari = isMacOS && webkit && !ua.match(/(Chrome|Firefox)/i);

  if (isIOSWithSafari) {
    return "iOS";
  } else if (isMacOSWithSafari) {
    return "macOS";
  } else {
    return false;
  }
}

function LoggedOut() {
  useClearContextState();
  const navigate = useNavigate();
  const { actor, isAuthenticated, login, isLoading } = useAuth();
  const [brokerProcessing, setBrokerProcessing] = React.useState(false);
  
  // Check if we're in the middle of a broker callback (redirect from II)
  const isBrokerCallback = React.useMemo(() => {
    try {
      const hash = window.location.hash;
      const hasCallback = hash.includes('code=') && hash.includes('nonce=');
      const processing = window.__brokerProcessing === true;
      return hasCallback || processing;
    } catch {
      return false;
    }
  }, []);
  
  // Also watch for broker processing changes
  React.useEffect(() => {
    const checkBroker = () => {
      setBrokerProcessing(window.__brokerProcessing === true);
    };
    const interval = setInterval(checkBroker, 100);
    return () => clearInterval(interval);
  }, []);
  
  if (!isLoading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  // Show loading state during broker callback processing
  if (isBrokerCallback || brokerProcessing) {
    return (
      <Box
        className="container"
        display="flex"
        flexDirection="column"
        justifyContent="flex-start"
        alignItems="center"
        minHeight="100vh"
        backgroundColor="#0B334D"
        pt="100px"
      >
        <img className="logo" src={logo} alt="DooCoins" style={{ width: '140px', marginBottom: '2rem' }} />
        <Text fontSize="xl" color="#fff">
          Completing sign in...
        </Text>
      </Box>
    );
  }

  return (
    <Box
      className="container"
      display="flex"
      flexDirection="column"
      justifyContent={"space-between"}
      alignItems={"center"}
      gap={6}
      py={8}
      backgroundColor={"#0B334D"}
    >
      <Box
        display="flex"
        flexDirection="column"
        justifyContent={"space-between"}
        alignItems={"center"}
        gap={2}
        mt={4}
        px={10}
        style={{ width: "100%" }}
      >
        <img className="logo" src={logo} alt="DooCoins" />
        <Text fontSize="3xl" color={"#fff"}>
          DooCoins Parent v2
        </Text>
        <Text fontSize="xl" color={"#fff"}>
          Kids Rewards dApp
        </Text>
        <Text fontSize="lg" mt={2} fontWeight={"bold"} color={"#00A4D7"}>
          <Link href="https://www.doo.co" target="_blank">
            learn more
          </Link>
        </Text>

        <ConnectWalletButton onClick={login} disabled={isLoading} isLoading={isLoading} />

        <Box>
          {checkForIOS() ? (
            <div className="install-prompt">
              <p className="light prompt-text">
                Install for a better experience
              </p>
              <p className="light prompt-text">
                Tap{" "}
                <img src={ShareIcon} className="share-icon" alt="Install PWA" />{" "}
                then "Add to Home Screen"{" "}
              </p>
            </div>
          ) : (
            ""
          )}
        </Box>
      </Box>
      <Box>
        <img src={ICBadge} alt="Internet Computer" />
      </Box>
    </Box>
  );
}

function ConnectWalletButton({ onClick, disabled, isLoading, ...props }) {
  return (
    <Button
      variant="ghost"
      color={"#fff"}
      mt={5}
      style={{ width: "100%" }}
      className="button"
      type="button"
      onClick={onClick}
      fontSize={18}
      fontWeight={"medium"}
      py={6}
      _hover={{}}
      _active={{}}
      disabled={disabled}
      isLoading={isLoading}
    >
      {isLoading ? "Connecting..." : "Connect"}
    </Button>
  );
}

// TODO(auth-broker): When enabling the broker flow on iOS, this Connect button can:
// - Generate a nonce and construct the relay URL:
//   `https://zks5c-sqaaa-aaaah-qqf4a-cai.icp0.io/auth/relay?nonce=<rand>&return=doocoins://ii-callback`
// - Call the native bridge to start ASWebAuthenticationSession:
//   `window.webkit?.messageHandlers?.broker?.postMessage({ relayUrl })`
// The web app listens for the deep link via a custom event injected by native:
//   `window.addEventListener('broker:callback', (e) => {/* parse e.detail */})`
// and then calls backend `takeAuthBlob(code, nonce)` to import the session.

export default LoggedOut;
