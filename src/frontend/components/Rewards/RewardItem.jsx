import React from "react";
import { Box, Text, VStack } from "@chakra-ui/react";
import ActionsMenu from "../../../shared/components/ActionsMenu";
import { ChildContext } from "../../contexts/ChildContext";

// Inline icons
const CheckIcon = (props) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
  </svg>
);

const StarIcon = (props) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6L12 2z" />
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

const RewardItem = ({ reward, handleTogglePopup }) => {
  const { child } = React.useContext(ChildContext);
  
  // Build actions based on balance and reward status
  const actions = [];
  
  // If child has enough balance, show claim option
  if (child?.balance >= reward.value) {
    actions.push({
      id: "claim",
      label: "Claim reward",
      icon: <CheckIcon />,
      onClick: () => handleTogglePopup?.(true, reward, "claim"),
    });
  } else {
    // Otherwise show goal/remove goal option
    if (reward.active) {
      actions.push({
        id: "remove_goal",
        label: "Remove goal",
        icon: <StarIcon />,
        onClick: () => handleTogglePopup?.(true, reward, "remove_goal"),
      });
    } else {
      actions.push({
        id: "goal",
        label: "Set as goal",
        icon: <StarIcon />,
        onClick: () => handleTogglePopup?.(true, reward, "goal"),
      });
    }
  }
  
  // Add edit and delete actions
  actions.push(
    {
      id: "edit",
      label: "Edit reward",
      icon: <PencilIcon />,
      onClick: () => handleTogglePopup?.(true, reward, "edit"),
    },
    {
      id: "delete",
      label: "Delete reward",
      isDestructive: true,
      icon: <TrashIcon color="#E53E3E" />,
      onClick: () => handleTogglePopup?.(true, reward, "delete"),
    }
  );

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
        <Box display="flex" alignItems="center" gap={2}>
          {reward.active && (
            <Box
              as="svg"
              width="16px"
              height="16px"
              viewBox="0 0 24 24"
              fill="#00A4D7"
              color="#00A4D7"
            >
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill="currentColor"
              />
            </Box>
          )}
          <Text textStyle="largeLightDark">
            {reward.name}
          </Text>
        </Box>
        <Text textStyle="smallLightDark" pl={reward.active ? "24px" : "0"}>
          {parseInt(reward.value)} DooCoins
        </Text>
      </VStack>
      <Box onClick={(e) => e.stopPropagation()}>
        <ActionsMenu actions={actions} />
      </Box>
    </Box>
  );
};

export default RewardItem;
