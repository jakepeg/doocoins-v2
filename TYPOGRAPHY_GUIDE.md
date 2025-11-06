# Standardized Typography Guide - DooCoins v2

This document outlines the standardized typography system for the DooCoins v2 application.

## Design System

### Font Sizes

- **Small**: 18px
- **Large**: 24px

### Colors

- **White**: `#ffffff`
- **Dark Blue**: `#0b334d`

### Font Weights

- **Light**: 400
- **Heavy**: 700

## Available Styles

We have 8 standardized text style combinations:

1. `smallLightWhite` - 18px, 400 weight, white
2. `smallHeavyWhite` - 18px, 700 weight, white
3. `smallLightDark` - 18px, 400 weight, dark blue
4. `smallHeavyDark` - 18px, 700 weight, dark blue
5. `largeLightWhite` - 24px, 400 weight, white
6. `largeHeavyWhite` - 24px, 700 weight, white
7. `largeLightDark` - 24px, 400 weight, dark blue
8. `largeHeavyDark` - 24px, 700 weight, dark blue

## Usage Methods

### Method 1: Chakra UI textStyle prop (Recommended)

The styles are defined in the Chakra UI theme and can be used with the `textStyle` prop:

```jsx
import { Text, Box } from "@chakra-ui/react";

// Using Text component
<Text textStyle="smallLightWhite">Welcome to DooCoins</Text>
<Text textStyle="largeHeavyDark">Total Balance</Text>

// Using Box component with textStyle
<Box textStyle="smallHeavyDark">Account Details</Box>
```

### Method 2: CSS Classes

CSS classes are available for non-Chakra elements:

```jsx
<div className="text-small-light-white">Welcome to DooCoins</div>
<h1 className="text-large-heavy-dark">Total Balance</h1>
<span className="text-small-heavy-dark">Account Details</span>
```

### Method 3: JavaScript Constants (for inline styles)

Import the style objects for inline styles or Chakra's `sx` prop:

```jsx
import { TEXT_STYLES } from '../styles/typography';

// Inline styles
<span style={TEXT_STYLES.smallLightWhite}>Welcome to DooCoins</span>

// Chakra UI sx prop
<Box sx={TEXT_STYLES.largeLightDark}>Total Balance</Box>

// Mixing with other styles
<div style={{
  ...TEXT_STYLES.smallHeavyDark,
  marginTop: '10px',
  padding: '5px'
}}>
  Account Details
</div>
```

### Method 4: Individual Constants

You can also import individual constants for custom combinations:

```jsx
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from "../styles/typography";

<span
  style={{
    fontSize: FONT_SIZES.small,
    fontWeight: FONT_WEIGHTS.heavy,
    color: COLORS.white,
  }}
>
  Custom Text
</span>;
```

## Exception: Balance Card

**Important**: The balance DC symbol and balance amount on the cards should **remain unchanged** from their current styles. These have specific sizing that should not be affected by this standardization.

Files to preserve:

- `BalanceCardV1.jsx` - Balance display styles (dc symbol and amount)
- `BalanceCardV2.jsx` - Balance display styles (dc symbol and amount)

## Migration Strategy

When applying these styles to existing components:

1. **Identify the element** - What text element needs styling?
2. **Determine the size** - Should it be small (18px) or large (24px)?
3. **Determine the weight** - Should it be light (400) or heavy (700)?
4. **Determine the color** - Should it be white or dark blue?
5. **Apply the appropriate style** using one of the methods above

### Example Migration

**Before:**

```jsx
<Text fontSize="22px" color="#0B334D" fontWeight="600">
  Username
</Text>
```

**After:**

```jsx
<Text textStyle="largeHeavyDark">Username</Text>
```

## Files Created

1. **`theme.ts`** - Updated Chakra UI theme with textStyles
2. **`assets/css/typography.css`** - CSS classes for non-Chakra elements
3. **`styles/typography.js`** - JavaScript constants for inline styles
4. **`assets/css/main.css`** - Updated to import typography.css

## Quick Reference Table

| Style Name      | Size | Weight | Color   | Use Case                             |
| --------------- | ---- | ------ | ------- | ------------------------------------ |
| smallLightWhite | 18px | 400    | #ffffff | Body text on dark backgrounds        |
| smallHeavyWhite | 18px | 700    | #ffffff | Emphasized text on dark backgrounds  |
| smallLightDark  | 18px | 400    | #0b334d | Body text on light backgrounds       |
| smallHeavyDark  | 18px | 700    | #0b334d | Emphasized text on light backgrounds |
| largeLightWhite | 24px | 400    | #ffffff | Headings on dark backgrounds         |
| largeHeavyWhite | 24px | 700    | #ffffff | Strong headings on dark backgrounds  |
| largeLightDark  | 24px | 400    | #0b334d | Headings on light backgrounds        |
| largeHeavyDark  | 24px | 700    | #0b334d | Strong headings on light backgrounds |

## Next Steps

You can now go through each screen and apply the appropriate text styles. When you're ready, let me know which screen or component you'd like to update first, and I'll help you apply these standardized styles.
