# EmptyStateMessage Styling Guide

## Component Location

- **Parent App**: `/src/frontend/components/EmptyStateMessage.jsx`
- **Kids App**: `/src/frontend_kids/components/EmptyStateMessage.jsx`

## Current Styling

The `EmptyStateMessage` component provides centralized styling for all empty state instructional messages across the app.

### Default Styles

```jsx
<Box
  padding="40px 20px" // Vertical and horizontal padding
  textAlign="center" // Center-aligned text
  backgroundColor="rgba(11, 51, 77, 0.05)" // Light blue tint
  borderRadius="12px" // Rounded corners
  margin="20px" // Outer spacing
>
  <Text
    fontSize="lg" // Large font size
    color="#0B334D" // Primary brand color
    lineHeight="1.6" // Comfortable line spacing
  />
</Box>
```

## Customization Options

### To Change Colors

- **Background**: Modify `backgroundColor` prop (currently: `rgba(11, 51, 77, 0.05)`)
- **Text Color**: Modify `color` prop (currently: `#0B334D`)

### To Change Spacing

- **Inner Padding**: Modify `padding` prop (currently: `40px 20px`)
- **Outer Margin**: Modify `margin` prop (currently: `20px`)
- **Border Radius**: Modify `borderRadius` prop (currently: `12px`)

### To Change Typography

- **Font Size**: Modify `fontSize` prop (currently: `lg`)
- **Line Height**: Modify `lineHeight` prop (currently: `1.6`)

### To Add Borders or Shadows

Add these props to the `Box` component:

```jsx
border = "1px solid #E2E8F0";
boxShadow = "sm";
```

## Usage Examples

### Basic Usage

```jsx
<EmptyStateMessage>
  No items yet. <br /> Tap the + icon to get started!
</EmptyStateMessage>
```

### With Custom Styling

```jsx
<EmptyStateMessage backgroundColor="rgba(255, 0, 0, 0.1)" padding="60px 30px">
  Custom message with different styling
</EmptyStateMessage>
```

## Current Implementations

1. **Child List**: Shown when no children added
2. **Tasks**: Shown when no tasks for selected child
3. **Rewards**: Shown when no rewards for selected child
4. **Wallet (Parent)**: Shown when no transactions for selected child
5. **Wallet (Kids)**: Shown when no transactions for the child

## Note on HTML Content

The component uses `dangerouslySetInnerHTML` to render HTML tags like `<br />` in the message content. This allows for rich text formatting while keeping the API simple.
