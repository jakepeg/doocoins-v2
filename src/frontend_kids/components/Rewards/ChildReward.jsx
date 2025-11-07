import { Box, ScaleFade, useDisclosure, Text } from "@chakra-ui/react";
import React, { useState } from "react";
import { ReactComponent as DCIcon } from "../../assets/images/dc.svg";
import { ReactComponent as TickIcon } from "../../assets/images/tick.svg";
import { ReactComponent as CloseIcon } from "../../assets/images/close.svg";
import { ReactComponent as GoalIcon } from "../../assets/images/goal.svg";
import { ReactComponent as SmileyIcon } from "../../assets/images/smiley.svg";

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
        <Text fontSize="24px" fontWeight="400" color="#0b334d">
          {reward.name}
        </Text>
        <Box display="flex" alignItems="center" gap={2}>
          <DCIcon className="balance-dc-icon" width="20px" height="20px" />
          <Text fontSize="24px" fontWeight="400" color="#0b334d">{parseInt(reward.value)}</Text>
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
            <>
              {child.balance >= reward.value ? (
                <Box
                  ml={2}
                  p={1}
                  background="#129FAA"
                  cursor="pointer"
                  borderRadius={100}
                  onClick={() => handleClick(reward, "req")}
                >
                  <TickIcon 
                    width="18px"
                    height="18px"
                   />
                </Box>
              ) : reward.active ? (
                <Box
                  ml={2}
                  p={1}
                  background="red"
                  cursor="pointer"
                  borderRadius={100}
                  onClick={() => handleClick(reward, "close")}
                >
                  <CloseIcon 
                    stroke="#fff" 
                    width="20px" 
                    height="20px" 
                  />
                </Box>
              ) : (
                <Box
                  ml={2}
                  p={0}
                  cursor="pointer"
                  borderRadius={100}
                  onClick={() => handleClick(reward, "set")}
                >
                  <GoalIcon 
                    fill="#129FAA" 
                    width="26px" 
                    height="26px" />
                </Box>
              )}
            </>
          )}
        </Box>
      </Box>
    </>
  );
};

export default ChildReward;
