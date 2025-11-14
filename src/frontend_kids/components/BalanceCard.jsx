import * as React from "react";
import dc from "../assets/images/dc-thin-white.svg";
import styles from "../assets/css/golabal.module.css";
import {
  Box,
  HStack,
  Text,
  Spinner,
} from "@chakra-ui/react";
import { ActiveBackground } from "./BalanceCardBackgrounds";
import { Capacitor } from "@capacitor/core";

/**
 * Simplified Balance Card for Kids App
 * Features: Progress bar integrated into button, no kebab menu, Set Goal/Claim Goal button
 */
const BalanceCard = ({
  child,
  goal,
  percentage,
  isAbleToClaim,
  isLoading,
  isPendingApproval,
  handleOpenGoalPicker,
  handleClaimGoal,
}) => {
  const isNative = Capacitor.isNativePlatform();
  
  // Ensure percentage is a valid number (handle both string and number)
  const safePercentage = (percentage !== undefined && percentage !== null && !isNaN(Number(percentage))) 
    ? Number(percentage) 
    : 0;
  
  // Show loading spinner if no child data
  if (!child) {
    return (
      <header
        style={{
          minHeight: "275px",
          maxHeight: "275px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        className={`${styles.hero}`}
      >
        <ActiveBackground />
        <Box position="relative" zIndex={1}>
          <Spinner 
            size="xl" 
            color="#fff" 
            thickness="4px"
            width="60px"
            height="60px"
          />
        </Box>
      </header>
    );
  }
  
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

      {/* Content */}
      <Box
        display="flex"
        flexDirection="column"
        gap={0}
        sx={{
          paddingTop: "15px",
          paddingLeft: "10px",
          paddingRight: "10px",
          paddingBottom: "15px",
          position: "relative",
          zIndex: 1,
          marginTop: isNative ? "-20px" : "0",
        }}
      >
        {/* Name - Top */}
        <Text 
          textStyle="largeLightWhite"
          sx={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            letterSpacing: "-0.5px",
            textAlign: "left",
            marginTop: "15px",
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
              marginTop: { base: "-3px", md: "0px" },
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
                color: "#fff",
                fontWeight: 300,
              }}
            >
              {child?.balance}
            </Box>
          </Box>
        )}

        {/* Button - Always shown (Set Goal or Claim Goal) with integrated progress */}
        <Box textAlign="center" mt={goal?.hasGoal ? { base: "-26px", md: "-22px" } : { base: "-18px", md: "-10px" }} mb={1}>
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
            disabled={isLoading || isPendingApproval}
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
              cursor: (isLoading || isPendingApproval) ? "not-allowed" : "pointer",
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
              ) : isPendingApproval ? (
                "Waiting for approval"
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

export default BalanceCard;
