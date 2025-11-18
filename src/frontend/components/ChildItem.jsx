import React from "react";
import { Box, Text, VStack, useToast } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { set } from "idb-keyval";
import { ChildContext } from "../contexts/ChildContext";
import { useAuth } from "../use-auth-client";
import ActionsMenu from "../../shared/components/ActionsMenu";

export const swipeContainerStyles = {
  backgroundColor: "#FFF",
  paddingLeft: "1rem",
};

// Inline icons for View and Share to avoid external icon deps
const EyeIcon = (props) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 5c-5 0-9 4.5-10 7 1 2.5 5 7 10 7s9-4.5 10-7c-1-2.5-5-7-10-7zm0 12a5 5 0 110-10 5 5 0 010 10zm0-2.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
  </svg>
);

const ShareIcon = (props) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7a3.27 3.27 0 000-1.39l7.02-4.11A2.99 2.99 0 0018 7.91a3 3 0 10-2.83-4 3 3 0 00.21 1.11l-7.02 4.1a3 3 0 100 5.76l7.02 4.1c-.13.35-.2.72-.2 1.11a3 3 0 103-3z" />
  </svg>
);

const MailIcon = (props) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M20 4H4c-1.1 0-2 .9-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
  </svg>
);

const PencilIcon = (props) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 000-1.42L18.37 3.29a1.003 1.003 0 00-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.83z" />
  </svg>
);

const TrashIcon = (props) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12zm3.5-9h1v9h-1v-9zm4 0h1v9h-1v-9zM15.5 4l-1-1h-5l-1 1H5v2h14V4h-3.5z" />
  </svg>
);

const BlockIcon = (props) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31A7.902 7.902 0 0112 20zm6.31-3.1L7.1 5.69A7.902 7.902 0 0112 4c4.42 0 8 3.58 8 8 0 1.85-.63 3.55-1.69 4.9z" />
  </svg>
);

const ChildItem = ({ child, handleTogglePopup }) => {
  const navigate = useNavigate();
  const { setChild } = React.useContext(ChildContext);
  const { identity } = useAuth();
  const toast = useToast();
  
  // Backend now computes isCreator with principal resolution
  const isCreator = React.useMemo(() => {
    // isCreator is now a boolean from backend, not an optional
    if (child?.isCreator === undefined || child?.isCreator === null) {
      return true; // Default to true for backward compatibility
    }
    return child.isCreator;
  }, [child?.isCreator]);

  // Check if child is shared (has multiple parents)
  const isShared = React.useMemo(() => {
    // Handle optional field: parentIds comes as array from Candid optional
    if (!child?.parentIds || child.parentIds.length === 0) return false;
    const parentIds = Array.isArray(child.parentIds[0]) ? child.parentIds[0] : child.parentIds;
    return parentIds && parentIds.length > 1;
  }, [child?.parentIds]);

  const setChildData = async () => {
    setChild({
      id: child?.id,
      balance: parseInt(child?.balance),
      name: child.name,
    });
  };

  const handleSelectChild = async () => {
    setChildData();
    set("selectedChild", child.id);
    set("selectedChildName", child.name);

    navigate("/wallet");
  };



  return (
    <Box
      backgroundColor="white"
      borderRadius="md"
      padding={4}
      marginBottom={3}
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      cursor="pointer"
      onClick={handleSelectChild}
      _hover={{ boxShadow: "sm" }}
      width="100%"
      boxSizing="border-box"
    >
      <VStack align="start" spacing={1}>
        <Box display="flex" alignItems="center" gap={2}>
          <Text textStyle="largeLightDark">
            {child.name}
          </Text>
          {isShared && (
            <Text fontSize="lg" title="Shared with other adults">
              👥
            </Text>
          )}
        </Box>
        <Text textStyle="smallLightDark">
          {child.balance} DooCoins
        </Text>
      </VStack>
      <Box onClick={(e) => e.stopPropagation()}>
        <ActionsMenu
          actions={
            isCreator
              ? [
                  {
                    id: "view",
                    label: `View ${child.name}`,
                    icon: <EyeIcon />,
                    onClick: () => handleSelectChild(),
                  },
                  {
                    id: "share",
                    label: `Share ${child.name}`,
                    icon: <ShareIcon />,
                    onClick: () => navigate("/share", { state: { child } }),
                  },
                  {
                    id: "invite",
                    label: `Invite ${child.name}`,
                    icon: <MailIcon />,
                    onClick: () => navigate("/invite", { state: { child } }),
                  },
                  {
                    id: "edit",
                    label: `Rename ${child.name}`,
                    icon: <PencilIcon />,
                    onClick: () => handleTogglePopup?.(true, child, "edit"),
                  },
                  ...(isShared
                    ? [
                        {
                          id: "revoke",
                          label: `Revoke all shares`,
                          icon: <BlockIcon />,
                          onClick: () => handleTogglePopup?.(true, child, "revoke"),
                          isDestructive: true,
                        },
                      ]
                    : []),
                  {
                    id: "delete",
                    label: `Delete ${child.name}`,
                    icon: <TrashIcon />,
                    onClick: () => handleTogglePopup?.(true, child, "delete"),
                    isDestructive: true,
                  },
                ]
              : [
                  {
                    id: "view",
                    label: `View ${child.name}`,
                    icon: <EyeIcon />,
                    onClick: () => handleSelectChild(),
                  },
                ]
          }
        />
      </Box>
    </Box>
  );
};

export default ChildItem;
