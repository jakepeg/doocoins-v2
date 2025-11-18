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
import DeleteDialog from "./components/Dialogs/DeleteDialog";
import EditDialog from "./components/Dialogs/EditDialog";
import { set, get } from "idb-keyval";
import modelStyles from "./components/popup/confirmation_popup.module.css";

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading, actor } = useAuth();
  const { child, setChild } = React.useContext(ChildContext);
  const showMobileLayout = useIsMobileLayout();
  const location = useLocation();
  const isNative = Capacitor.isNativePlatform();
  const [selectedChild, setSelectedChild] = React.useState(null);
  const [showPopup, setShowPopup] = React.useState({
    delete: false,
    edit: false,
  });
  
  // ChildList screen should be fully dark blue, others should have light background
  const isChildListRoute = location.pathname === "/" || location.pathname === "/invite";
  
  // Update body class and theme-color when authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      document.body.classList.add('authenticated');
      // Update theme-color meta tag for mobile browsers
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', '#DFF3FF');
      }
    } else {
      document.body.classList.remove('authenticated');
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', '#0B334D');
      }
    }
  }, [isAuthenticated]);
  
  const handleTogglePopup = (isOpen, childData, popup) => {
    setSelectedChild(childData);
    setShowPopup((prevState) => ({ ...prevState, [popup]: isOpen }));
  };

  const handleCloseDeletePopup = () => {
    setShowPopup((prevState) => ({ ...prevState, delete: false }));
  };

  const handleCloseEditPopup = () => {
    setShowPopup((prevState) => ({ ...prevState, edit: false }));
  };

  const updateChild = (childID, childName) => {
    handleCloseEditPopup();
    const child_object = { id: childID, name: childName, archived: false };
    actor?.updateChild(childID, child_object).then((response) => {
      // Update the selected child name in storage and context
      set("selectedChildName", childName);
      setChild((prev) => ({ ...prev, name: childName }));
      // Also update in childList
      get("childList").then((childList) => {
        const updatedList = childList.map((c) =>
          c.id === childID ? { ...c, name: childName } : c
        );
        set("childList", updatedList);
      });
    });
  };

  const deleteChild = (childID, childName) => {
    handleCloseDeletePopup();
    const child_object = { id: childID, name: childName, archived: true };
    actor?.updateChild(childID, child_object).then((response) => {
      // Force full page reload to properly clear state after deletion
      window.location.href = "/";
    });
  };
  
  // 🔥 FIX: Show loading screen while checking auth status
  // This prevents premature redirect to /login which was auto-triggering broker flow
  if (isLoading) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        backgroundColor="#0B334D"
      >
        <Box textAlign="center" color="white">
          <div>Loading...</div>
        </Box>
      </Box>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // On native iOS, nav already handles safe area, just need nav height
  // On web, add padding for the fixed nav
  const contentPaddingTop = "48px";

  return (
    <>
      {showPopup.delete && (
        <DeleteDialog
          handleCloseDeletePopup={handleCloseDeletePopup}
          selectedItem={selectedChild}
          handleDelete={deleteChild}
        />
      )}
      {showPopup.edit && (
        <EditDialog
          handleCloseEditPopup={handleCloseEditPopup}
          selectedItem={selectedChild}
          handleSubmitForm={updateChild}
          hasValueField={false}
          namePlaceholder="Child Name"
        />
      )}
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
          width="100vw"
          position="relative"
          left="50%"
          right="50%"
          marginLeft="-50vw"
          marginRight="-50vw"
        >
          <Box maxWidth="768px" width="100%" margin="0 auto">
            {showMobileLayout && !isChildListRoute && !(location.pathname === "/alerts" && location.search.includes('all=true')) && (
              <Balance 
                childName={child?.name} 
                childBalance={child?.balance}
                handleTogglePopup={handleTogglePopup}
              />
            )}
            {children}
          </Box>
        </Box>

        {showMobileLayout && <BottomTabNav />}
      </Box>
    </>
  );
}

export default ProtectedRoute;
