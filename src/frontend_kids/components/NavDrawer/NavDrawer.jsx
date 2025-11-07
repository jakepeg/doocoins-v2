import {
  Divider,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerOverlay,
  Stack,
  Text,
  useDisclosure,
  IconButton,
} from "@chakra-ui/react";
import { Link as NavLink } from "react-router-dom";
import React from "react";
import ProfileIcon from "../../assets/images/profile-icon.svg";
import LogoIcon from "../../assets/images/logo.svg";
import { useAuth } from "../../use-auth-client";
import useClearContextState from "../../hooks/useClearContextState";

function NavDrawer() {
  const { logout } = useAuth();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const btnRef = React.useRef();
  const clearContextState = useClearContextState();

  return (
    <>
      <Stack
        display={"flex"}
        flexDirection={"row"}
        justifyContent={"space-between"}
        position="fixed"
        top={0}
        left={0}
        right={0}
        zIndex={100}
        backgroundColor="#0B334D"
        px={4}
        pt={0}
        pb={3}
      >
        <NavLink to="/">
          <img
            role="image"
            aria-label="doocoins"
            src={LogoIcon}
            style={{
              height: "28px",
              marginLeft: "0",
              marginTop: "10px",
              filter: "brightness(0) invert(1)",
            }}
          />
        </NavLink>
        <img
          onClick={onOpen}
          role="button"
          ref={btnRef}
          aria-label="open menu"
          src={ProfileIcon}
          style={{
            height: "28px",
            marginRight: "10px",
            marginTop: "10px",
            filter: "brightness(0) invert(1)",
            cursor: "pointer",
          }}
        />
      </Stack>
      <Drawer
        isOpen={isOpen}
        placement="right"
        onClose={onClose}
        finalFocusRef={btnRef}
      >
        <DrawerOverlay />
        <DrawerContent bg="white" maxW="240px" zIndex={1001}>
          <IconButton
            icon={<span style={{ fontSize: '20px', fontWeight: 'bold' }}>✕</span>}
            onClick={onClose}
            position="absolute"
            top="60px"
            right={4}
            size="sm"
            color="#0B334D"
            bg="transparent"
            _hover={{ bg: "#DFF3FF" }}
            aria-label="Close menu"
            zIndex={1002}
          />
          <DrawerBody position="relative" pb={16} pt="60px" px={6}>
            <Stack style={{ marginTop: "32px" }} spacing={3}>
              <Text
                fontSize="xl"
                color="#0B334D"
                fontWeight={600}
                cursor="pointer"
                as="a"
                href="https://www.doo.co"
                target="_blank"
                rel="noopener noreferrer"
              >
                About DooCoins
              </Text>
              <Divider />
              <Text
                onClick={() => {
                  logout();
                  clearContextState();
                  onClose();
                }}
                fontSize="xl"
                color="#0B334D"
                fontWeight={600}
                cursor="pointer"
              >
                Logout
              </Text>
            </Stack>
            {import.meta.env.VITE_APP_VERSION && (
              <Text
                position="absolute"
                bottom={4}
                left={6}
                fontSize="sm"
                color="#0B334D"
                fontWeight={300}
              >
                v{import.meta.env.VITE_APP_VERSION}
              </Text>
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}

export default NavDrawer;
