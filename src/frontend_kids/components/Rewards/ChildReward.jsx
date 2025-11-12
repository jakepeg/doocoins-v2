import { Box, ScaleFade, useDisclosure, Text } from "@chakra-ui/react";
import React, { useState } from "react";
import { ReactComponent as DCIcon } from "../../assets/images/dc.svg";
import { ReactComponent as SmileyIcon } from "../../assets/images/smiley.svg";
import ActionsMenu from "../../../shared/components/ActionsMenu";

// Inline icons matching parent app style
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

const CloseIcon = (props) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
);

const ChildReward = ({
  reward,
  handleReq,
  child,
  handleRemove,
  handleSetGoal,
}) => {
  const [showEmoji, setShowEmoji] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = (reward, state) => {
    switch (state) {
      case "req":
        handleReq?.(reward);
        break;
      case "close":
        handleRemove?.(reward);
        break;
      case "set":
        handleSetGoal?.(reward);
        break;
    }
    setShowEmoji(true);
    setIsOpen(true); // trigger animation
    setTimeout(() => {
      setShowEmoji(false);
      setIsOpen(false); // end animation
    }, 2000); // display for 2 second
  };

  return (
    <>
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
        role="button"
        key={parseInt(reward.id)}
      >
        <Box display="flex" flexDirection="column" gap={1}>
          <Text fontSize="24px" fontWeight="400" color="#0b334d">
            {reward.name}
          </Text>
          <Text fontSize="18px" fontWeight="400" color="#0b334d">
            {parseInt(reward.value)} DooCoins
          </Text>
        </Box>
        <Box display="flex" alignItems="center" gap={2}>
          {showEmoji ? (
            <ScaleFade initialScale={0.9} in={isOpen}>
              <Box
                p={1}
                background="#FBB03B"
                ml={2}
                cursor="pointer"
                borderRadius={100}
              >
                <SmileyIcon 
                  width="18px"
                  height="18px"
                />
              </Box>
            </ScaleFade>
          ) : (
            <ActionsMenu
              actions={[
                child.balance >= reward.value
                  ? {
                      id: "claim",
                      label: "Claim Reward",
                      icon: <CheckIcon />,
                      onClick: () => handleClick(reward, "req"),
                    }
                  : reward.active
                  ? {
                      id: "remove-goal",
                      label: "Remove Goal",
                      icon: <CloseIcon color="#E53E3E" />,
                      onClick: () => handleClick(reward, "close"),
                      isDestructive: true,
                    }
                  : {
                      id: "set-goal",
                      label: "Set as Goal",
                      icon: <StarIcon />,
                      onClick: () => handleClick(reward, "set"),
                    },
              ]}
            />
          )}
        </Box>
      </Box>
    </>
  );
};

export default ChildReward;
