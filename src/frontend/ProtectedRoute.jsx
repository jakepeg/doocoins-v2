import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./use-auth-client";
import NavDrawer from "./components/NavDrawer/NavDrawer";
import { Box } from "@chakra-ui/react";
import BottomTabNav from "./components/BottomNav/BottomTabNav";
import Balance from "./components/Balance";
import React from "react";
import { ChildContext } from "./contexts/ChildContext";
import useIsMobileLayout from "./hooks/useIsMobileLayout";
import { Capacitor } from "@capacitor/core";

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { child } = React.useContext(ChildContext);
  const showMobileLayout = useIsMobileLayout();
  const location = useLocation();
  const isNative = Capacitor.isNativePlatform();
  
  // ChildList screen should be fully dark blue, others should have light background
  const isChildListRoute = location.pathname === "/" || location.pathname === "/invite";
  
  if (!isLoading && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // On native iOS, nav already handles safe area, just need nav height
  // On web, add padding for the fixed nav
  const contentPaddingTop = "48px";

  return (
    <Box
      className="container"
      backgroundColor="#DFF3FF"
      gap={0}
      display="flex"
      flexDirection="column"
      minHeight="100vh"
    >
      {/* Dark blue header section with NavDrawer */}
      <Box 
        backgroundColor="#0B334D"
        width="100vw"
        position="relative"
        left="50%"
        right="50%"
        marginLeft="-50vw"
        marginRight="-50vw"
      >
        <NavDrawer />
      </Box>

      {/* Content area - light background for all screens */}
      <Box
        backgroundColor="#DFF3FF"
        display="flex"
        flexDirection="column"
        flex="1"
        overflow="visible"
        paddingTop={contentPaddingTop}
      >
        {showMobileLayout && !isChildListRoute && (
          <Balance childName={child?.name} childBalance={child?.balance} />
        )}
        {children}
      </Box>

      {showMobileLayout && <BottomTabNav />}
    </Box>
  );
}

export default ProtectedRoute;
