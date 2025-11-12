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
 * TODO: Customize this design with your new layout/styling
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

  return (
    <header
      style={{
        borderRadius: "12px",
        overflow: "hidden",
        WebkitBorderRadius: "12px",
        position: "relative",
        paddingLeft: "10px",
        paddingRight: "10px",
        minHeight: "275px",
        maxHeight: "275px",
      }}
      className={`${styles.hero}`}
    >
      {/* Background SVG */}
      <ActiveBackground />

      {/* Actions Menu - Top Right */}
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
              marginTop: { base: "-15px", md: "-10px" },
            }}
          >
            <Box 
              as="img" 
              src={dc} 
              className="dc-img-big" 
              alt="DooCoins symbol"
              sx={{
                display: "inline-block",
                transform: "translateY(-10px)",
                width: "33px",
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
        <Box textAlign="center" mt={goal?.hasGoal ? { base: "-22px", md: "-18px" } : { base: "-14px", md: "-6px" }} mb={2}>
          <Box
            as="button"
            onClick={goal?.hasGoal ? handleClaimGoal : handleOpenGoalPicker}
            disabled={isLoading || (goal?.hasGoal && !isAbleToClaim)}
            sx={{
              position: "relative",
              overflow: "hidden",
              borderRadius: "999px",
              padding: "14px 32px",
              color: "#fff",
              fontWeight: 700,
              fontSize: "18px",
              minWidth: "210px", // 50% wider than before (was 140px)
              textAlign: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              border: "2px solid rgba(255,255,255,0.3)",
              cursor: (isLoading || (goal?.hasGoal && !isAbleToClaim)) ? "not-allowed" : "pointer",
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
                transform: (goal?.hasGoal && !isAbleToClaim) ? "none" : "scale(1.05)",
              },
              _active: {
                transform: (goal?.hasGoal && !isAbleToClaim) ? "none" : "scale(0.98)",
              },
            }}
          >
            <Box 
              as="span"
              sx={{
                position: "relative",
                zIndex: 1,
                opacity: (goal?.hasGoal && !isAbleToClaim) ? 0.6 : 1,
                transition: "opacity 0.3s ease",
              }}
            >
              {isLoading ? (
                <Spinner boxSize="32px" color="#0B334D" thickness="4px" speed="0.65s" />
              ) : goal?.hasGoal ? (
                "Claim Goal"
              ) : (
                "Set a Goal"
              )}
            </Box>
          </Box>
        </Box>

        {/* Goal Section - Only shown if goal exists */}
        {goal?.hasGoal && (
          <Box mt="2px">
            {/* Goal info with star */}
            <Box 
              display="flex" 
              justifyContent="space-between" 
              alignItems="center" 
              mb={1}
              cursor="pointer"
              onClick={handleOpenGoalPicker}
              _hover={{
                opacity: 0.8,
              }}
            >
              <HStack spacing={2} align="center">
                <Box
                  as="svg"
                  width="18px"
                  height="18px"
                  viewBox="0 0 24 24"
                  fill="#fff"
                  color="#fff"
                >
                  <path
                    d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                    fill="currentColor"
                  />
                </Box>
                <Text textStyle="smallLightWhite">
                  Goal: {goal.name}
                </Text>
              </HStack>
              <Text textStyle="smallHeavyWhite">
                {safePercentage}%
              </Text>
            </Box>
          </Box>
        )}
      </Box>
    </header>
  );
};

export default BalanceCardV2;
