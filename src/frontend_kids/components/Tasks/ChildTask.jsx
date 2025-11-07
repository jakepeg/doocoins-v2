import React, { useState } from "react";
import { ReactComponent as DCIcon } from "../../assets/images/dc.svg";
import { ReactComponent as TickIcon } from "../../assets/images/tick.svg";
import { Box, Text, useDisclosure } from "@chakra-ui/react";
import { ScaleFade } from "@chakra-ui/react";
import { ReactComponent as SmileyIcon } from "../../assets/images/smiley.svg";

const ChildTask = ({ task, handleReq }) => {
  const [showEmoji, setShowEmoji] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = (task) => {
    setShowEmoji(true);
    handleReq(task);
    setIsOpen(true);

    setTimeout(() => {
      setShowEmoji(false);
      setIsOpen(false);
    }, 2000);
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
        key={parseInt(task.id)}
        position="relative"
      >
        <Text fontSize="24px" fontWeight="400" color="#0b334d">
          {task.name}
        </Text>

        <Box display="flex" alignItems="center" gap={2}>
          <DCIcon className="balance-dc-icon" width="20px" height="20px" />
          <Text fontSize="24px" fontWeight="400" color="#0b334d">{parseInt(task.value)}</Text>
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
            <Box
              p={1}
              background="#00A4D7"
              ml={2}
              cursor="pointer"
              borderRadius={100}
            >
              <TickIcon
                onClick={() => handleClick(task)}
                width="18px"
                height="18px"
              />
            </Box>
          )}
        </Box>
      </Box>
    </>
  );
};

export default ChildTask;
