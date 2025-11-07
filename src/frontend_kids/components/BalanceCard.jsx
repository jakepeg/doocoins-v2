import * as React from "react";
import dc from "../assets/images/dc-thin-white.svg";
import styles from "../assets/css/golabal.module.css";
import {
  Box,
  HStack,
  Text,
  Spinner,
  Progress,
} from "@chakra-ui/react";
import { ActiveBackground } from "./BalanceCardBackgrounds";

/**
 * Simplified Balance Card for Kids App
 * Features: Linear progress bar, no kebab menu, Set Goal/Claim Goal button
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
        width: "100%",
        maxWidth: "728px",
        margin: "0 auto 30px auto",
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

        {/* Button - Always shown (Set Goal or Claim Goal) */}
        <Box textAlign="center" mt={goal?.hasGoal ? { base: -4, md: -3 } : { base: -2, md: 0 }} mb={1}>
          <Box
            as="button"
            onClick={goal?.hasGoal ? handleClaimGoal : handleOpenGoalPicker}
            disabled={isLoading || (goal?.hasGoal && !isAbleToClaim)}
            sx={{
              background: "rgba(255,255,255,0.2)",
              borderRadius: "999px",
              padding: "12px 24px",
              color: "#fff",
              fontWeight: 700,
              fontSize: "18px",
              minWidth: "140px",
              textAlign: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              border: "2px solid rgba(255,255,255,0.3)",
              cursor: (isLoading || (goal?.hasGoal && !isAbleToClaim)) ? "not-allowed" : "pointer",
              opacity: (isLoading || (goal?.hasGoal && !isAbleToClaim)) ? 0.4 : 1,
              transition: "all 0.2s",
              _hover: {
                background: (goal?.hasGoal && !isAbleToClaim) ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.3)",
                transform: (goal?.hasGoal && !isAbleToClaim) ? "none" : "scale(1.05)",
              },
              _active: {
                transform: (goal?.hasGoal && !isAbleToClaim) ? "none" : "scale(0.98)",
              },
            }}
          >
            {isLoading ? (
              <Spinner size="sm" />
            ) : goal?.hasGoal ? (
              "Claim Goal"
            ) : (
              "Set a Goal"
            )}
          </Box>
        </Box>

        {/* Goal Section - Only shown if goal exists */}
        {goal?.hasGoal && (
          <Box mt={1}>
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
                <Text 
                  sx={{
                    fontSize: "14px",
                    fontWeight: 300,
                    color: "#fff",
                  }}
                >
                  Goal: {goal.name}
                </Text>
              </HStack>
              <Text 
                sx={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                {percentage}%
              </Text>
            </Box>

            {/* Linear Progress Bar */}
            <Box mt={2}>
              <Progress
                value={percentage}
                size="lg"
                height="12px"
                colorScheme="cyan"
                borderRadius="full"
                bg="rgba(255,255,255,0.2)"
                sx={{
                  "& > div": {
                    backgroundColor: "#00D4FF",
                  },
                }}
              />
            </Box>
          </Box>
        )}
      </Box>
    </header>
  );
};

export default BalanceCard;
