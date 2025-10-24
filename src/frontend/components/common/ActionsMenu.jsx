import React from "react";
import {
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  Portal,
  Divider,
  HStack,
  Text,
  Icon,
} from "@chakra-ui/react";

// Simple vertical kebab icon (three dots)
const KebabIcon = (props) => (
  <Icon viewBox="0 0 24 24" {...props}>
    <circle cx="12" cy="5" r="1.8" fill="currentColor" />
    <circle cx="12" cy="12" r="1.8" fill="currentColor" />
    <circle cx="12" cy="19" r="1.8" fill="currentColor" />
  </Icon>
);

/**
 * ActionsMenu
 * Props:
 * - actions: [ { id, label, icon?: ReactNode, onClick, isDestructive?: boolean, isDisabled?: boolean } ]
 * - ariaLabel?: string (trigger)
 * - placement?: Chakra placement, default 'bottom-end'
 * - size?: Chakra IconButton size, default 'sm'
 */
const ActionsMenu = ({ actions = [], ariaLabel = "More options", placement = "bottom-end", size = "md" }) => {
  return (
    <Menu placement={placement} computePositionOnMount>
      <MenuButton
        as={IconButton}
        aria-label={ariaLabel}
  icon={<KebabIcon boxSize="1.5em" />}
        variant="ghost"
        size={size}
        fontSize={{ base: "xl", md: "lg" }}
        onClick={(e) => e.stopPropagation()}
      />
      <Portal>
        <MenuList borderRadius="16px" boxShadow="lg" py={{ base: "6px", md: "6px" }}>
          {actions
            .filter(Boolean)
            .map((action, idx) => {
              const item = (
                <MenuItem
                  key={action.id || idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    action.onClick?.();
                  }}
                  isDisabled={action.isDisabled}
                  color={action.isDestructive ? "red.500" : undefined}
                  _hover={action.isDestructive ? { bg: "red.50" } : undefined}
                  py={{ base: "12px", md: "10px" }}
                  fontSize={{ base: "md", md: "sm" }}
                >
                  <HStack spacing={3} align="center">
                    {action.icon}
                    <Text fontSize="md">{action.label}</Text>
                  </HStack>
                </MenuItem>
              );

              // Insert divider before the first destructive item if not first
              if (action.isDestructive && idx > 0) {
                return (
                  <React.Fragment key={(action.id || idx) + "-group"}>
                    <Divider my="4px" />
                    {item}
                  </React.Fragment>
                );
              }
              return item;
            })}
        </MenuList>
      </Portal>
    </Menu>
  );
};

export default ActionsMenu;
