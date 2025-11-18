import { useLocation, useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { Box, Button, Text, IconButton, Icon, Spinner, useToast } from "@chakra-ui/react";
import { useAuth } from "../use-auth-client";

// Inline icons
const BackArrowIcon = (props) => (
  <Icon viewBox="0 0 24 24" {...props}>
    <path
      fill="currentColor"
      d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
    />
  </Icon>
);

const CopyIcon = (props) => (
  <Icon viewBox="0 0 24 24" {...props}>
    <path
      fill="currentColor"
      d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
    />
  </Icon>
);

const ShareChild = () => {
  const { actor } = useAuth();
  const child = useLocation()?.state?.child;
  const [loading, setLoading] = useState(true);
  const [shareCode, setShareCode] = useState([]);
  const [expiryTime] = useState(60); // 60 minutes
  const toast = useToast();

  const navigate = useNavigate();

  async function generateShareCode() {
    try {
      const response = await actor?.createShareCode(child?.id);
      if (response?.ok) {
        const code = response.ok.toString();
        setShareCode(code.split(''));
      } else {
        toast({
          title: "Error generating share code",
          description: response?.err || "Please try again",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate share code",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
    setLoading(false);
  }

  const copyCodeToClipboard = () => {
    const code = shareCode.join('');
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied!",
      description: "Share code copied to clipboard",
      status: "success",
      duration: 2000,
      isClosable: true,
    });
  };

  useEffect(() => {
    if (child?.id && actor) {
      generateShareCode();
    }
  }, [actor, child]);

  if (!child) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems={"center"}
        height={"100vh"}
        flexDirection='column'
        gap={'20px'}
      >
        <Text color={"#0B334D"} align={"center"} fontSize="xl">
          Please select a child to continue
        </Text>
        <Button onClick={() => navigate("/")}>Visit Home</Button>
      </Box>
    );
  }

  if (loading) {
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

  return (
    <Box className="container">
      <Box
        mx={"20px"}
        mt={"40px"}
        display="flex"
        gap={"20px"}
        flexDirection="column"
        justifyContent={"center"}
      >
        <Box display="flex" alignItems="center" gap="12px">
          <IconButton
            icon={<BackArrowIcon boxSize="1.5em" />}
            onClick={() => navigate("/")}
            aria-label="Back to child list"
            variant="ghost"
            color="#0B334D"
            _hover={{ bg: "rgba(11, 51, 77, 0.1)" }}
            size="lg"
          />
          <Text fontSize="22px" color="#0B334D" fontWeight="600">
            Share {child.name}
          </Text>
        </Box>

        <Text fontSize="lg" color="#0B334D">
          Share {child.name} with another adult (family member, teacher, etc.)
        </Text>

        <Box
          display="flex"
          flexDirection="column"
          gap="16px"
          p="20px"
          bg="rgba(11, 51, 77, 0.05)"
          borderRadius="12px"
          border="1px solid rgba(11, 51, 77, 0.1)"
        >
          <Text fontSize="md" color="#0B334D" fontWeight="600">
            Magic Code
          </Text>
          
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            gap={"8px"}
            mb="8px"
          >
            {shareCode.map((digit, index) => (
              <Box
                key={index}
                bg="white"
                border="2px solid #0B334D"
                borderRadius="8px"
                width="60px"
                height="80px"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize="4xl" color="#0B334D" fontWeight="700">
                  {digit}
                </Text>
              </Box>
            ))}
          </Box>

          <Button
            leftIcon={<CopyIcon />}
            onClick={copyCodeToClipboard}
            variant="outline"
            colorScheme="blue"
            size="md"
          >
            Copy Code
          </Button>

          <Text fontSize="sm" color="#0B334D" align="center" fontStyle="italic">
            Code expires in {expiryTime} minutes
          </Text>
        </Box>

        <Box
          display="flex"
          flexDirection="column"
          gap="12px"
          color="#0B334D"
        >
          <Text fontSize="md" fontWeight="600">
            How it works:
          </Text>
          <Box as="ol" ml="20px" fontSize="md">
            <Box as="li" mb="8px">
              Share this code with another adult
            </Box>
            <Box as="li" mb="8px">
              They open DooCoins and tap "+ Add Child"
            </Box>
            <Box as="li" mb="8px">
              They toggle "Use Magic Code"
            </Box>
            <Box as="li">
              They enter this code to add {child.name}
            </Box>
          </Box>
        </Box>

        <Text fontSize="sm" color="#0B334D" fontStyle="italic">
          Note: Deep links and QR codes will be available once the app is published to app stores.
        </Text>

        <Button
          onClick={() => navigate("/")}
          colorScheme="blue"
          size="lg"
          mt="20px"
        >
          Done
        </Button>
      </Box>
    </Box>
  );
};

export default ShareChild;
