import { extendBaseTheme } from "@chakra-ui/react";
import chakraTheme from "@chakra-ui/theme";

const { Button, Modal, Drawer } = chakraTheme.components;

const theme = extendBaseTheme({
  components: {
    Button,
    Modal,
    Drawer,
  },
});

export default theme;