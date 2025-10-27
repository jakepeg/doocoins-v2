import { extendBaseTheme } from "@chakra-ui/react";
import chakraTheme from "@chakra-ui/theme";

const { Button } = chakraTheme.components;

const theme = extendBaseTheme({
  breakpoints: {
    base: "0em",    // 0px
    sm: "26.25em",  // 420px
    md: "45em",     // 720px
    lg: "62em",     // 992px (default)
    xl: "80em",     // 1280px (default)
    "2xl": "96em",  // 1536px (default)
  },
  components: {
    Button
  },
});

export default theme;
