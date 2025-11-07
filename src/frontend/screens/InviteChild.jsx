import { useLocation, useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { Box, Button, Text, Image, IconButton, Icon, Spinner } from "@chakra-ui/react";
import { useAuth } from "../use-auth-client";
import qrChildImage from "../assets/images/qr-child.png";

// Inline back arrow icon
const BackArrowIcon = (props) => (
  <Icon viewBox="0 0 24 24" {...props}>
    <path
      fill="currentColor"
      d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
    />
  </Icon>
);

const InviteChild = () => {
  const { actor } = useAuth();
  const child = useLocation()?.state?.child;
  const [hasNFT] = useState(true);
  const [loading, setLoading] = useState(true);
  const [magicCode, setMagicCode] = useState([]);

  const navigate = useNavigate();

  async function generateOtp() {
    const response = await actor?.magicCode(child?.id);
    const code = response?.[0]?.toString()
    if (code) {
      setMagicCode(code?.split(''))
    }

    setLoading(false);
  }

  useEffect(() => {
    child?.id && generateOtp();
  }, [actor]);

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
        <Text color={"#fff"} align={"center"} fontSize="xl">
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
      {hasNFT && (
        <Box
          mx={"20px"}
          mt={"40px"}
          display="flex"
          gap={"12px"}
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
              Invite {child.name}
            </Text>
          </Box>
          <Text fontSize="lg" color="#0B334D">
            Get {child.name} on board with DooCoins Kids!
          </Text>

          <Text fontSize="lg" color="#0B334D">
            If the app is already installed, then skip to step 4
          </Text>

          <Box as="ol" ml="20px" color="#0B334D">
            <Box as="li" fontSize="lg" mb="16px">
              Scan the QR code below using your child's device camera
              <Box mt="8px" display="flex" justifyContent="center">
                <Image 
                  src={qrChildImage} 
                  alt="QR code for DooCoins Kids app" 
                  maxWidth="150px" 
                  height="auto"
                  border="1px solid #0B334D"
                  borderRadius="8px"
                />
              </Box>
            </Box>
            <Box as="li" fontSize="lg" mb="8px">
            Follow the instructions to install the app 
            </Box>
            <Box as="li" fontSize="lg" mb="8px">
            Launch the app by clicking the DooCoins icon on the home screen
            </Box>
            <Box as="li" fontSize="lg">
              Enter the magic code:
            </Box>
          </Box>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            gap={"4px"}
          >
            {magicCode.map((code) => {
              return (
                <Text key={code} fontSize="3xl" color="#0B334D" fontWeight="600">
                  {code}
                </Text>
              );
            })}
          </Box>
          <Text fontSize="lg" color="#0B334D" align="center">
            The code expires after 1 hour
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default InviteChild;
