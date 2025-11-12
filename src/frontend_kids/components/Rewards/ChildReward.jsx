import { Box, ScaleFade, useDisclosure, Text } from "@chakra-ui/react";
import React, { useState } from "react";
import { ReactComponent as DCIcon } from "../../assets/images/dc.svg";
import { ReactComponent as TickIcon } from "../../assets/images/tick.svg";
import { ReactComponent as CloseIcon } from "../../assets/images/close.svg";
import { ReactComponent as GoalIcon } from "../../assets/images/goal.svg";
import { ReactComponent as SmileyIcon } from "../../assets/images/smiley.svg";
import ActionsMenu from "../../../shared/components/ActionsMenu";

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
                      icon: <TickIcon width="18px" height="18px" />,
                      onClick: () => handleClick(reward, "req"),
                    }
                  : reward.active
                  ? {
                      id: "remove-goal",
                      label: "Remove Goal",
                      icon: <CloseIcon stroke="currentColor" width="20px" height="20px" />,
                      onClick: () => handleClick(reward, "close"),
                      isDestructive: true,
                    }
                  : {
                      id: "set-goal",
                      label: "Set as Goal",
                      icon: <GoalIcon fill="currentColor" width="26px" height="26px" />,
                      onClick: () => handleClick(reward, "set"),
                    },
              ]}
              iconColor="#0b334d"
            />
          )}
        </Box>
      </Box>
    </>
  );
};

export default ChildReward;
