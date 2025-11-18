import { useLocation, useNavigate } from "react-router-dom";
import React from "react";
import { Box, Button, Text, Icon } from "@chakra-ui/react";

// Lock icon
const LockIcon = (props) => (
  <Icon viewBox="0 0 24 24" {...props}>
    <path
      fill="currentColor"
      d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"
    />
  </Icon>
);

const PermissionDenied = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const action = location?.state?.action || "perform this action";
  const childName = location?.state?.childName || "this child";

  // Convert action to user-friendly verb
  const getActionVerb = (action) => {
    const actionMap = {
      rename: "rename them",
      delete: "delete them",
      share: "share access",
      invite: "invite them to the kids app",
      revoke: "revoke sharing",
    };
    return actionMap[action] || action;
  };

  return (
    <Box
      className="container"
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      px="20px"
    >
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        gap="24px"
        maxWidth="400px"
        textAlign="center"
      >
        <Box
          bg="rgba(239, 68, 68, 0.1)"
          borderRadius="full"
          p="20px"
        >
          <LockIcon boxSize="60px" color="#EF4444" />
        </Box>

        <Box display="flex" flexDirection="column" gap="12px">
          <Text fontSize="24px" color="#0B334D" fontWeight="700">
            Permission Required
          </Text>
          
          <Text fontSize="md" color="#0B334D" lineHeight="1.6">
            You don't have permission for this action.
          </Text>

          <Text fontSize="md" color="#0B334D" lineHeight="1.6">
            Please ask the person who created <strong>{childName}</strong> to {getActionVerb(action)}.
          </Text>
        </Box>

        <Box display="flex" flexDirection="column" gap="12px" width="100%" mt="12px">
          <Button
            onClick={() => navigate(-1)}
            colorScheme="blue"
            size="lg"
            width="100%"
          >
            Go Back
          </Button>

          <Button
            onClick={() => navigate("/")}
            variant="outline"
            colorScheme="blue"
            size="lg"
            width="100%"
          >
            Go to Child List
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default PermissionDenied;
