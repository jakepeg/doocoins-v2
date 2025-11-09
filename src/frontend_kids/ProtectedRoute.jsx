import { Navigate } from "react-router-dom";
import { useAuth } from "./use-auth-client";
import NavDrawer from "./components/NavDrawer/NavDrawer";
import { Box } from "@chakra-ui/react";
import BottomTabNav from "./components/BottomNav/BottomTabNav";
import Balance from "./components/Balance";
import React from "react";
import { ChildContext } from "./contexts/ChildContext";
import useIsMobileLayout from "./hooks/useIsMobileLayout";
import PullToRefresh from "react-simple-pull-to-refresh";
import ReloadIcon from "./components/icons/ReloadIcon";

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { child, refetchContent } = React.useContext(ChildContext);
  const showMobileLayout = useIsMobileLayout();
  if (!isLoading && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const contentPaddingTop = "48px";

  return (
    <>
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

        {/* Content area */}
        <Box
          backgroundColor="#DFF3FF"
          display="flex"
          flexDirection="column"
          flex="1"
          overflow="visible"
          paddingTop={contentPaddingTop}
          width="100vw"
          position="relative"
          left="50%"
          right="50%"
          marginLeft="-50vw"
          marginRight="-50vw"
        >
          <Box maxWidth="768px" width="100%" margin="0 auto">
            <PullToRefresh
              onRefresh={async () => {
                const data = await refetchContent({ refetch: true });
                return data
              }}
              className="text-center"
            >
              <Box px={"5px"}>
                {showMobileLayout && (
                  <Balance childName={child?.name} childBalance={child?.balance} />
                )}
                {children}
              </Box>
            </PullToRefresh>
          </Box>
        </Box>

        {showMobileLayout && <BottomTabNav />}
      </Box>
    </>
  );
}

export default ProtectedRoute;
