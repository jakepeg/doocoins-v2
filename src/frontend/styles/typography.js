/**
 * Standardized Typography Styles for DooCoins v2
 * 
 * Font Sizes:
 * - Small: 18px
 * - Large: 24px
 * 
 * Colors:
 * - White: #ffffff
 * - Dark Blue: #0b334d
 * 
 * Weights:
 * - Light: 400
 * - Heavy: 700
 * 
 * Usage Examples:
 * 
 * 1. With Chakra UI Text component:
 *    <Text textStyle="smallLightWhite">Hello</Text>
 * 
 * 2. With inline styles:
 *    <span style={TEXT_STYLES.smallLightWhite}>Hello</span>
 * 
 * 3. With Chakra UI sx prop:
 *    <Box sx={TEXT_STYLES.largeLightDark}>Hello</Box>
 */

// Style objects for inline styles or Chakra UI sx prop
export const TEXT_STYLES = {
  smallLightWhite: {
    fontSize: '18px',
    fontWeight: 400,
    color: '#ffffff',
  },
  smallHeavyWhite: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#ffffff',
  },
  smallLightDark: {
    fontSize: '18px',
    fontWeight: 400,
    color: '#0b334d',
  },
  smallHeavyDark: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#0b334d',
  },
  largeLightWhite: {
    fontSize: '24px',
    fontWeight: 400,
    color: '#ffffff',
  },
  largeHeavyWhite: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#ffffff',
  },
  largeLightDark: {
    fontSize: '24px',
    fontWeight: 400,
    color: '#0b334d',
  },
  largeHeavyDark: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#0b334d',
  },
};

// Color constants
export const COLORS = {
  white: '#ffffff',
  darkBlue: '#0b334d',
};

// Font size constants
export const FONT_SIZES = {
  small: '18px',
  large: '24px',
};

// Font weight constants
export const FONT_WEIGHTS = {
  light: 400,
  heavy: 700,
};

export default TEXT_STYLES;
