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
          borderRadius: "12px",
          overflow: "hidden",
          WebkitBorderRadius: "12px",
          position: "relative",
          paddingLeft: "15px",
          paddingRight: "15px",
          minHeight: "275px",
          maxHeight: "275px",
          width: "100%",
          maxWidth: "768px",
          margin: isNative ? "10px auto 30px auto" : "20px auto 30px auto",
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
        paddingLeft: "15px",
        paddingRight: "15px",
        minHeight: "275px",
        maxHeight: "275px",
        width: "100%",
        maxWidth: "768px",
        margin: isNative ? "10px auto 30px auto" : "20px auto 30px auto",
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
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            letterSpacing: "-0.5px",
            textAlign: "left",
            marginTop: "-10px",
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
              if (goal?.hasGoal) {
                handleClaimGoal();
              } else {
                handleOpenGoalPicker();
              }
            }}
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
              // Background with progress overlay
              background: goal?.hasGoal 
                ? `linear-gradient(to right, #00D4FF ${safePercentage}%, rgba(255,255,255,0.2) ${safePercentage}%)`
                : "rgba(255,255,255,0.2)",
              _hover: {
                transform: (goal?.hasGoal && !isAbleToClaim) ? "none" : "scale(1.05)",
              },
              _active: {
                transform: (goal?.hasGoal && !isAbleToClaim) ? "none" : "scale(0.98)",
              },
            }}
          >
            {isLoading ? (
              <Spinner size="sm" color="#0B334D" thickness="3px" />
            ) : goal?.hasGoal ? (
              "Claim Goal"
            ) : (
              "Set a Goal"
            )}
          </Box>
        </Box>

        {/* Goal Section - Only shown if goal exists */}
        {goal?.hasGoal && (
          <Box mt="2px" position="relative" zIndex={100}>
            {/* Goal info with star */}
            <Box 
              display="flex" 
              justifyContent="space-between" 
              alignItems="center" 
              mb={1}
              cursor="pointer"
              onClick={(e) => {
                console.log("Goal section clicked!", e);
                handleOpenGoalPicker();
              }}
              position="relative"
              zIndex={10}
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
                <Text 
                  sx={{
                    fontSize: "18px",
                    fontWeight: 400,
                    color: "#fff",
                  }}
                >
                  Goal: {goal.name}
                </Text>
              </HStack>
              <Text 
                sx={{
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                {safePercentage}%
              </Text>
            </Box>
          </Box>
        )}
      </Box>
    </header>
  );
};

export default BalanceCard;
