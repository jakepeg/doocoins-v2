import React from "react";
import { Box, Spinner } from "@chakra-ui/react";

export default function LoadingSpinner() {
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      height="100vh"
    >
      <Spinner 
        width="50px" 
        height="50px" 
        color="#0B334D" 
        thickness="6px" 
      />
    </Box>
  );
}