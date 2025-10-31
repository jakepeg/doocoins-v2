import * as React from "react";
import dc from "../assets/images/dc-thin-white.svg";
import PlainGoalBackground from "../assets/images/card-header/cc.svg";
import styles from "../assets/css/golabal.module.css";
import {
  Box,
  HStack,
  Text,
  Spinner,
} from "@chakra-ui/react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import ActionsMenu from "./common/ActionsMenu";

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
 * Balance Card V1 - Original design with circular progress bar
 * Features: Circular progress, gradient background, name + balance on left, goal area on right
 */
const BalanceCardV1 = ({
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
  return (
    <header
      style={{
        backgroundImage: `url(${PlainGoalBackground})`,
        borderRadius: "12px",
        overflow: "hidden",
        WebkitBorderRadius: "12px",
        position: "relative",
      }}
      className={`${styles.hero}`}
    >
      {/* Actions Menu - Top Right */}
      <Box
        position="absolute"
        top="12px"
        right="12px"
        zIndex={1000}
        onClick={(e) => e.stopPropagation()}
      >
        <ActionsMenu
          actions={[
            {
              id: "share",
              label: "Share child",
              icon: <ShareIcon />,
              onClick: handleShareChild,
            },
            {
              id: "invite",
              label: "Invite to app",
              icon: <MailIcon />,
              onClick: handleNavigateToInvite,
            },
            {
              id: "edit",
              label: "Edit name",
              icon: <PencilIcon />,
              onClick: handleToggleEditPopup,
            },
          ]}
          ariaLabel="Child actions menu"
          iconColor="white"
        />
      </Box>

      <Box
        display={"flex"}
        flexDirection={"row"}
        justifyContent={"space-between"}
        alignItems={"center"}
        height={"100%"}
      >
        <Box 
          display={"flex"} 
          flexDirection={"column"} 
          gap={0}
          flex="1"
          minWidth="0"
        >
          <Box 
            className={styles.name}
            sx={{
              maxWidth: { base: "180px", md: "280px", lg: "320px" },
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              letterSpacing: "-0.5px",
            }}
            title={child?.name}
          >
            {child?.name}
          </Box>
          {child?.balance >= 0 && (
            <Box 
              className={styles.balance}
              sx={{
                display: "flex",
                alignItems: "baseline",
                gap: "0px",
                whiteSpace: "nowrap",
                transform: "none !important",
              }}
            >
              <Box 
                as="img" 
                src={dc} 
                className="dc-img-big" 
                alt="DooCoins symbol"
                sx={{
                  display: "inline-block",
                  verticalAlign: "baseline",
                  marginBottom: "2px",
                }}
              />
              <Box 
                as="span"
                sx={{
                  marginLeft: "-3px",
                  fontSize: { base: "47px", md: "63px" },
                }}
              >
                {child?.balance}
              </Box>
            </Box>
          )}
        </Box>

        {/* Goal Area - right side, shows one of three states */}
        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            pr: { base: "5px", md: "40px", lg: "60px" },
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: { base: "auto", md: "160px" },
          }}
        >
          {/* State 1: Set Goal Button (no goal) */}
          {!goal?.hasGoal && (
            <Box
              as="button"
              onClick={handleOpenGoalPicker}
              disabled={isLoading}
              sx={{
                background: "rgba(255,255,255,0.15)",
                borderRadius: "999px",
                padding: "12px 20px",
                color: "#fff",
                fontWeight: 600,
                fontSize: "16px",
                minWidth: "120px",
                textAlign: "center",
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                border: "1px solid rgba(255,255,255,0.2)",
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.6 : 1,
                transition: "all 0.2s",
                _hover: {
                  background: "rgba(255,255,255,0.25)",
                  transform: "scale(1.02)",
                },
                _active: {
                  transform: "scale(0.98)",
                },
              }}
            >
              {isLoading ? <Spinner size="sm" /> : "Set a Goal"}
            </Box>
          )}

          {/* State 2: Progress Circle (has goal, not enough balance) */}
          {goal?.hasGoal && !isAbleToClaim && (
            <Box
              display={"flex"}
              className={styles.circular_progress}
              flexDirection={"column"}
              alignItems={"center"}
              sx={{
                width: { base: 160, md: 200 },
                height: { base: 160, md: 200 },
              }}
            >
              <CircularProgressbar
                value={percentage}
                text={`${percentage}%`}
                background
                backgroundPadding={6}
                strokeWidth={5}
                styles={buildStyles({
                  strokeLinecap: "butt",
                  backgroundColor: "transparent",
                  textColor: "#fff",
                  pathColor: "#00A4D7",
                  trailColor: "transparent",
                  textSize: "24px",
                })}
              />
              <HStack
                spacing={1}
                justify="center"
                align="flex-start"
                mt={0}
                cursor="pointer"
                onClick={handleOpenGoalPicker}
                _hover={{
                  opacity: 0.8,
                }}
              >
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
                  color="#fff"
                  fontSize="1.1em"
                  lineHeight="1.1em"
                  fontWeight="500"
                  textAlign="center"
                >
                  {goal.name}
                </Text>
              </HStack>
            </Box>
          )}

          {/* State 3: Claim Button (has goal, enough balance) */}
          {goal?.hasGoal && isAbleToClaim && (
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              gap={2}
            >
              <Box
                as="button"
                onClick={handleClaimGoal}
                disabled={isLoading}
                sx={{
                  background: "rgba(255,255,255,0.15)",
                  borderRadius: "999px",
                  padding: "12px 20px",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "16px",
                  minWidth: "120px",
                  textAlign: "center",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  opacity: isLoading ? 0.6 : 1,
                  transition: "all 0.2s",
                  marginBottom: "10px",
                  _hover: {
                    background: "rgba(255,255,255,0.25)",
                    transform: "scale(1.02)",
                  },
                  _active: {
                    transform: "scale(0.98)",
                  },
                }}
              >
                {isLoading ? <Spinner size="sm" /> : "Claim Goal"}
              </Box>
              <HStack
                spacing={1}
                justify="center"
                align="flex-start"
                mt={0}
                cursor="pointer"
                onClick={handleOpenGoalPicker}
                _hover={{
                  opacity: 0.8,
                }}
              >
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
                  color="#fff"
                  fontSize="1.1em"
                  lineHeight="1.1em"
                  fontWeight="500"
                  textAlign="center"
                >
                  {goal.name}
                </Text>
              </HStack>
            </Box>
          )}
        </Box>
      </Box>
    </header>
  );
};

export default BalanceCardV1;
