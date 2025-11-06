import {
  Divider,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerOverlay,
  Stack,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { Link as NavLink } from "react-router-dom";
import React from "react";
import ProfileIcon from "../../assets/images/profile-icon.svg";
import LogoIcon from "../../assets/images/logo.svg";
import { useAuth } from "../../use-auth-client";
import useIsMobileLayout from "../../hooks/useIsMobileLayout";
import useClearContextState from "../../hooks/useClearContextState";

function NavDrawer() {
  const { logout } = useAuth();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const btnRef = React.useRef();
  const showMobileLayout = useIsMobileLayout();
  const clearContextState = useClearContextState()

  return (
    <>
      <Stack
        display={"flex"}
        flexDirection={"row"}
        justifyContent={"space-between"}
        alignItems={"center"}
        backgroundColor="#0B334D"
        style={{ 
          zIndex: 999, 
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
        }}
        width="100%"
        px={showMobileLayout ? 3.5 : 4}
        pt={showMobileLayout ? 5 : 4}
        pb={showMobileLayout ? 3 : 3}
        m={0}
      >
        <NavLink to="/">
          <img
            role="image"
            aria-label="doocoins"
            src={LogoIcon}
            style={{
              height: "34px",
              filter: "brightness(0) invert(1)", // Make logo white
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
            height: "34px",
            filter: "brightness(0) invert(1)", // Make profile icon white
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
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerBody>
            <Stack style={{ marginTop: "32px" }} spacing={3}>

              <Text
                onClick={onClose}
                fontSize="xl"
                color="#0B334D"
                fontWeight={600}
              >
                <NavLink to="https://www.doo.co" target="_blank">About DooCoins</NavLink>
              </Text>
              <Divider />
              <Text
                onClick={() => {
                  logout();
                  clearContextState()
                }}
                fontSize="xl"
                color="#0B334D"
                fontWeight={600}
                cursor="pointer"
              >
                Logout
              </Text>




            </Stack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}

export default NavDrawer;
