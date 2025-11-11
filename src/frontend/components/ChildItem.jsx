import React from "react";
import { Box, Text, VStack, useToast } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { set } from "idb-keyval";
import { ChildContext } from "../contexts/ChildContext";
import ActionsMenu from "./common/ActionsMenu";

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

const ChildItem = ({ child, handleTogglePopup }) => {
  const navigate = useNavigate();
  const { setChild } = React.useContext(ChildContext);
  const toast = useToast();

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

  const handleShareChild = async () => {
    const shareData = {
      title: `DooCoins: ${child.name}`,
      text: `${child.name}'s DooCoins account`,
      url: typeof window !== "undefined" ? window.location.origin : undefined,
    };
    try {
      if (navigator.share && typeof navigator.share === "function") {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url ?? ""}`.trim());
        toast({ title: "Link copied", status: "success", duration: 2000, isClosable: true });
      } else {
        toast({ title: "Sharing not supported", status: "info", duration: 2000, isClosable: true });
      }
    } catch (e) {
      // user cancelled or error
    }
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
        <Text textStyle="largeLightDark">
          {child.name}
        </Text>
        <Text textStyle="smallLightDark">
          {child.balance} DooCoins
        </Text>
      </VStack>
      <Box onClick={(e) => e.stopPropagation()}>
        <ActionsMenu
          actions={[
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
              onClick: handleShareChild,
            },
            {
              id: "invite",
              label: `Invite ${child.name}`,
              icon: <MailIcon />,
              onClick: () => navigate("/invite", { state: { child } }),
            },
            {
              id: "edit",
              label: `Edit ${child.name}`,
              icon: <PencilIcon />,
              onClick: () => handleTogglePopup?.(true, child, "edit"),
            },
            {
              id: "delete",
              label: `Delete ${child.name}`,
              icon: <TrashIcon />,
              onClick: () => handleTogglePopup?.(true, child, "delete"),
              isDestructive: true,
            },
          ]}
        />
      </Box>
    </Box>
  );
};

export default ChildItem;
