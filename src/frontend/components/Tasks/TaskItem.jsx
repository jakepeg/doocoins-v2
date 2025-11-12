import React from "react";
import { Box, Text, VStack, HStack } from "@chakra-ui/react";
import ActionsMenu from "../../../shared/components/ActionsMenu";

// Inline icons
const CheckIcon = (props) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
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

const TaskItem = ({ task, handleTogglePopup }) => {
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
        <Text textStyle="largeLightDark">
          {task.name}
        </Text>
        <Text textStyle="smallLightDark">
          {parseInt(task.value)} DooCoins
        </Text>
      </VStack>
      <Box onClick={(e) => e.stopPropagation()}>
        <ActionsMenu
          actions={[
            {
              id: "approve",
              label: "Approve task",
              icon: <CheckIcon />,
              onClick: () => handleTogglePopup?.(true, task, "approve"),
            },
            {
              id: "edit",
              label: "Edit task",
              icon: <PencilIcon />,
              onClick: () => handleTogglePopup?.(true, task, "edit"),
            },
            {
              id: "delete",
              label: "Delete task",
              isDestructive: true,
              icon: <TrashIcon color="#E53E3E" />,
              onClick: () => handleTogglePopup?.(true, task, "delete"),
            },
          ]}
        />
      </Box>
    </Box>
  );
};

export default TaskItem;
