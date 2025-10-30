import React from "react";
import { Box, Text } from "@chakra-ui/react";

/**
 * EmptyStateMessage component for displaying instructional text when lists are empty.
 * Centralized styling allows easy theming across the app.
 */
const EmptyStateMessage = ({ children, ...props }) => {
  return (
    <Box
      padding="40px 20px"
      textAlign="center"
      backgroundColor="white"
      borderRadius="12px"
      margin="20px"
      border="1px solid #00A4D7"
      {...props}
    >
      <Text
        fontSize="lg"
        color="#0B334D"
        lineHeight="1.6"
        fontWeight="600"
        dangerouslySetInnerHTML={{ __html: children }}
      />
    </Box>
  );
};

export default EmptyStateMessage;
