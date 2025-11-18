import * as React from "react";
import dc from "../assets/images/dc-thin-white.svg";
import styles from "../assets/css/golabal.module.css";
import {
  Box,
  HStack,
  Text,
  Spinner,
} from "@chakra-ui/react";
import ActionsMenu from "../../shared/components/ActionsMenu";
import { ActiveBackground } from "./BalanceCardBackgrounds";

// Inline icons for the actions menu
const ShareIcon = (props) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7a3.27 3.27 0 000-1.39l7.02-4.11A2.99 2.99 0 0018 7.91a3 3 0 10-2.83-4 3 3 0 00.21 1.11l-7.02 4.1a3 3 0 100 5.76l7.02 4.1c-.13.35-.2.72-.2 1.11a3 3 0 103-3z" />
  </svg>
);

const MailIcon = (props) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M20 4H4c-1.1 0-2 .9-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
  </svg>
);

const PencilIcon = (props) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 000-1.42L18.37 3.29a1.003 1.003 0 00-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.83z" />
  </svg>
);

/**
 * Balance Card V2 - New design with linear progress bar
 * Features: Linear progress bar, new background, vertical layout
 * Updated: Goal info displayed in button label (name + percentage or "Claim [name]")
 */
const BalanceCardV2 = ({
  child,
  goal,
  percentage,
  isAbleToClaim,
  isLoading,
  handleShareChild,
  handleNavigateToInvite,
  handleToggleEditPopup,
  handleOpenGoalPicker,
  handleClaimGoal,
}) => {
  // Ensure percentage is a valid number (handle both string and number)
  const safePercentage = (percentage !== undefined && percentage !== null && !isNaN(Number(percentage))) 
    ? Number(percentage) 
    : 0;

  // Check if user is creator - if not defined, default to true for backward compatibility
  const isCreator = child?.isCreator !== undefined ? child.isCreator : true;

  return (
    <header
      style={{
        borderRadius: "12px",
        overflow: "hidden",
        WebkitBorderRadius: "12px",
        position: "relative",
        paddingLeft: "10px",
        paddingRight: "10px",
        minHeight: "240px",
        maxHeight: "240px",
      }}
      className={`${styles.hero}`}
    >
      {/* Background SVG */}
      <ActiveBackground />

      {/* Actions Menu - Top Right - Only show if user is creator */}
      {isCreator && (
        <Box
          position="absolute"
          top="12px"
          right="12px"
          zIndex={10}
          onClick={(e) => e.stopPropagation()}
          sx={{
            backgroundColor: "rgba(255, 255, 255, 0.3)",
            borderRadius: "50%",
            width: "30px",
            height: "30px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActionsMenu
            actions={[
              {
                id: "share",
                label: `Share ${child?.name}`,
                icon: <ShareIcon />,
                onClick: handleShareChild,
              },
              {
                id: "invite",
                label: `Invite ${child?.name}`,
                icon: <MailIcon />,
                onClick: handleNavigateToInvite,
              },
              {
                id: "edit",
                label: `Edit ${child?.name}`,
                icon: <PencilIcon />,
                onClick: handleToggleEditPopup,
              },
            ]}
            ariaLabel="Child actions menu"
            iconColor="black"
            buttonBg="transparent"
            buttonHoverBg="whiteAlpha.200"
          />
        </Box>
      )}

      {/* TODO: Customize this layout for V2 design */}
      <Box
        display="flex"
        flexDirection="column"
        gap={1}
        sx={{
          paddingTop: "20px",
          paddingLeft: "10px",
          paddingRight: "10px",
          paddingBottom: "20px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Name - Top */}
        <Text 
          textStyle="largeLightWhite"
          sx={{
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            letterSpacing: "-0.5px",
            textAlign: "left",
            marginTop: "10px",
            fontSize: "36px",
            fontWeight: 300,
            color: "#fff",
          }}
          title={child?.name}
        >
          {child?.name}
        </Text>

        {/* Balance - Large in center */}
        {child?.balance >= 0 && (
          <Box 
            sx={{
              display: "flex",
              alignItems: "baseline",
              gap: "0px",
              whiteSpace: "nowrap",
              justifyContent: "flex-start",
              marginTop: { base: "-8px", md: "-5px" },
            }}
          >
            <Box 
              as="img" 
              src={dc} 
              alt="DooCoins symbol"
              sx={{
                display: "inline-block",
                transform: "translateY(-10px)",
                width: "33px !important",
                height: "auto",
              }}
            />
            <Box 
              as="span"
              className={styles.balance}
              sx={{
                marginLeft: "-3px",
                fontSize: "56px",
              }}
            >
              {child?.balance}
            </Box>
          </Box>
        )}

        {/* Button - Always shown (Set Goal or Claim Goal) with integrated progress */}
        <Box textAlign="center" mt="-17px" mb={2}>
          <Box
            as="button"
            onClick={(e) => {
              console.log("Button clicked!", { hasGoal: goal?.hasGoal, isLoading, isAbleToClaim });
              if (goal?.hasGoal && !isAbleToClaim) {
                handleOpenGoalPicker();
              } else if (goal?.hasGoal) {
                handleClaimGoal();
              } else {
                handleOpenGoalPicker();
              }
            }}
            disabled={isLoading}
            sx={{
              position: "relative",
              overflow: "hidden",
              borderRadius: "999px",
              padding: "14px 24px",
              color: "#fff",
              fontWeight: 700,
              fontSize: "18px",
              minWidth: "210px",
              maxWidth: "90%", // Prevent button from being too wide
              textAlign: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              border: "2px solid rgba(255,255,255,0.3)",
              cursor: isLoading ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              background: "rgba(255,255,255,0.2)",
              // Use pseudo-element for progress fill
              _before: goal?.hasGoal ? {
                content: '""',
                position: "absolute",
                top: 0,
                left: 0,
                bottom: 0,
                width: `${safePercentage}%`,
                background: "#00A4D7",
                borderRadius: "999px 0 0 999px", // Only round the left side
                transition: "width 0.3s ease",
                zIndex: 0,
              } : {},
              _hover: {
                transform: "scale(1.05)",
              },
              _active: {
                transform: "scale(0.98)",
              },
            }}
          >
            <Box 
              as="span"
              sx={{
                position: "relative",
                zIndex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                opacity: 1,
                transition: "opacity 0.3s ease",
              }}
            >
              {isLoading ? (
                <Spinner boxSize="32px" color="#0B334D" thickness="4px" speed="0.65s" />
              ) : goal?.hasGoal ? (
                <>
                  {isAbleToClaim ? (
                    // When goal is 100%, show "Claim [Goal Name]"
                    <Text as="span" noOfLines={1} overflow="hidden" textOverflow="ellipsis">
                      Claim {goal.name}
                    </Text>
                  ) : (
                    // When goal is in progress, show name + percentage
                    <>
                      <Text as="span" flexShrink={0}>
                        {goal.name}
                      </Text>
                      <Text as="span" flexShrink={0}>
                        {safePercentage}%
                      </Text>
                    </>
                  )}
                </>
              ) : (
                "Set a Goal"
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </header>
  );
};

export default BalanceCardV2;
