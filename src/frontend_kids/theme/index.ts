import { extendBaseTheme } from "@chakra-ui/react";
import chakraTheme from "@chakra-ui/theme";

const { Button, Drawer, Menu, Modal, Alert, Skeleton } = chakraTheme.components;

const theme = extendBaseTheme({
  breakpoints: {
    base: "0em",    // 0px
    sm: "26.25em",  // 420px
    md: "45em",     // 720px
    lg: "62em",     // 992px (default)
    xl: "80em",     // 1280px (default)
    "2xl": "96em",  // 1536px (default)
  },
  // Standardized font styles
  colors: {
    brand: {
      white: "#ffffff",
      darkBlue: "#0b334d",
    },
  },
  textStyles: {
    // Small light white
    smallLightWhite: {
      fontSize: "18px",
      fontWeight: 400,
      color: "#ffffff",
    },
    // Small heavy white
    smallHeavyWhite: {
      fontSize: "18px",
      fontWeight: 700,
      color: "#ffffff",
    },
    // Small light dark-blue
    smallLightDark: {
      fontSize: "18px",
      fontWeight: 400,
      color: "#0b334d",
    },
    // Small heavy dark-blue
    smallHeavyDark: {
      fontSize: "18px",
      fontWeight: 700,
      color: "#0b334d",
    },
    // Large light white
    largeLightWhite: {
      fontSize: "24px",
      fontWeight: 400,
      color: "#ffffff",
    },
    // Large heavy white
    largeHeavyWhite: {
      fontSize: "24px",
      fontWeight: 700,
      color: "#ffffff",
    },
    // Large light dark-blue
    largeLightDark: {
      fontSize: "24px",
      fontWeight: 400,
      color: "#0b334d",
    },
    // Large heavy dark-blue
    largeHeavyDark: {
      fontSize: "24px",
      fontWeight: 700,
      color: "#0b334d",
    },
  },
  components: {
    Button,
    Drawer,
    Menu,
    Modal,
    Alert,
    Skeleton,
  },
});

export default theme;
