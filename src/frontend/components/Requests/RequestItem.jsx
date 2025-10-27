import React from "react";
import { Box, Text, VStack } from "@chakra-ui/react";
import ActionsMenu from "../common/ActionsMenu";

// Inline icons
const CheckIcon = (props) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
  </svg>
);

const CloseIcon = (props) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
  </svg>
);

const TrashIcon = (props) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12zm3.5-9h1v9h-1v-9zm4 0h1v9h-1v-9zM15.5 4l-1-1h-5l-1 1H5v2h14V4h-3.5z" />
  </svg>
);

const RequestItem = ({ request, onApprove, onDecline, onDelete, type = "task" }) => {
  return (
    <Box
      backgroundColor="white"
      borderRadius="md"
      padding={4}
      marginBottom={3}
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      width="100%"
      boxSizing="border-box"
    >
      <VStack align="start" spacing={1} flex={1}>
        <Text fontSize="22px" color="#0B334D" fontWeight="semibold">
          {request.name}
        </Text>
        <Text fontSize="16px" color="#0B334D">
          {parseInt(request.value)} DooCoins
        </Text>
      </VStack>
      <Box onClick={(e) => e.stopPropagation()}>
        <ActionsMenu
          actions={[
            {
              id: "approve",
              label: `Approve ${type}`,
              icon: <CheckIcon />,
              onClick: onApprove,
            },
            {
              id: "decline",
              label: `Decline ${type}`,
              icon: <CloseIcon />,
              onClick: onDecline,
            },
            {
              id: "delete",
              label: `Delete ${type}`,
              isDestructive: true,
              icon: <TrashIcon color="#E53E3E" />,
              onClick: onDelete,
            },
          ]}
        />
      </Box>
    </Box>
  );
};

export default RequestItem;
