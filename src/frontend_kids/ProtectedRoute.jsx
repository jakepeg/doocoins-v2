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

  return (
    <>
      <NavDrawer />
      <Box
        width="100%"
        backgroundColor="#DFF3FF"
        minHeight="100vh"
        paddingTop="70px"
        paddingBottom={showMobileLayout ? "80px" : "0"}
      >
        <Box
          className="container"
          margin="0 auto"
        >
          <PullToRefresh
            onRefresh={async () => {
              const data = await refetchContent({ refetch: true });
              return data
            }}
            className="text-center"
          >
            <Box
              px={"5px"}
            >
              {showMobileLayout && (
                <Balance childName={child?.name} childBalance={child?.balance} />
              )}
            </Box>
            {children}
          </PullToRefresh>
        </Box>
      </Box>
      {showMobileLayout && <BottomTabNav />}
    </>
  );
}

export default ProtectedRoute;
