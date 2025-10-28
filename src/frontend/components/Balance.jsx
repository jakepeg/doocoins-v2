import * as React from "react";
import dc from "../assets/images/dc-thin-white.svg";
import PlainGoalBackground from "../assets/images/card-header/cc.svg";
import styles from "../assets/css/golabal.module.css";
import {
  Box,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  HStack,
  Text,
  Spinner,
} from "@chakra-ui/react";
import { get, set } from "idb-keyval";
import { ChildContext } from "../contexts/ChildContext";
import { useAuth } from "../use-auth-client";
import { useNavigate } from "react-router-dom";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { noGoalEntity } from "../utils/constants";
import { Capacitor } from "@capacitor/core";

const Balance = () => {
  const {
    child,
    setChild,
    goal,
    setGoal,
    getBalance,
    handleUnsetGoal,
    setBlockingChildUpdate,
    blockingChildUpdate,
    transactions,
    setTransactions,
  } = React.useContext(ChildContext);
  const { actor } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isGoalPickerOpen, setIsGoalPickerOpen] = React.useState(false);
  const [availableRewards, setAvailableRewards] = React.useState([]);
  const balance = child?.balance || 0;
  const navigate = useNavigate();
  const toast = useToast();
  const isNative = Capacitor.isNativePlatform();

  React.useEffect(() => {
    if (!blockingChildUpdate) {
      getChildGoal()
    }
  }, []);

  React.useEffect(() => {
    if (!blockingChildUpdate) {
      get("selectedChild")
        .then(async (data) => {
          const [balance, name] = await Promise.all([
            get(`balance-${data}`),
            get(`selectedChildName`),
          ]);
          if (data) {
            setChild({
              id: data,
              balance: parseInt(balance),
              name,
            });
          } else {
            navigate("/");
          }
        })
        .finally(() =>
          setIsLoading((prevState) => ({ ...prevState, child: false }))
        );
    }
  }, []);

  const getChildGoal = () => {
    get("childGoal").then(async (data) => {
      if (data) {
        setGoal({
          ...data,
          name: data.name,
          value: parseInt(data.value),
          hasGoal: data.hasGoal,
        });
        setIsLoading(false);
      }
    });
  }

  function getTransactions() {
    get("transactionList").then(async (val) => {
      setTransactions(val || []);
    });
  }

  React.useEffect(() => {
    getTransactions();
  }, []);

  React.useEffect(() => {
    if (child?.id) {
      getReward({});
    }
  }, [child?.id]);

  const handleUpdateTransactions = (transactions) => {
    setTransactions(transactions);
    set("transactionList", transactions);
  };

  function handleClaimGoal() {
    const reward_id = goal.id;
    let dateNum = Math.floor(Date.now() / 1000);
    let date = dateNum.toString();
    setIsLoading(true);
    const new_transactions = {
      completedDate: date,
      id: transactions?.[0]?.id ? parseInt(transactions?.[0]?.id) + 1 : 1,
      value: goal.value,
      name: goal.name,
      transactionType: "GOAL_DEBIT",
    };
    handleUpdateTransactions([new_transactions, ...transactions]);

    setChild((prevState) => ({
      ...prevState,
      balance: prevState.balance - goal.value,
    }));
    setBlockingChildUpdate(true);
    handleUnsetGoal();
    actor
      ?.claimGoal(child.id, reward_id, date)
      .then(async (returnedClaimReward) => {
        if ("ok" in returnedClaimReward) {
          toast({
            title: `Yay - well deserved, ${child.name}.`,
            status: "success",
            duration: 4000,
            isClosable: true,
          });
          getReward({ rewardId: reward_id, revokeStateUpdate: true });
          actor?.getChildren().then(async (returnedChilren) => {
            const children = Object.values(returnedChilren);
            const updatedChildrenData = await Promise.all(
              children[0].map(async (child) => {
                const balance = await getBalance(child.id);

                return {
                  ...child,
                  balance: parseInt(balance),
                };
              })
            );
            set("childList", updatedChildrenData);
            await getChildren({ revokeStateUpdate: true });
            setIsLoading(false);
            setBlockingChildUpdate(false);
          });
        } else {
          console.error(returnedClaimReward.err);
          handleUpdateTransactions(
            transactions.filter(
              (transaction) => transaction.id !== new_transactions.id
            )
          );
          setBlockingChildUpdate(false);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }

  const getChildren = async ({ revokeStateUpdate = false }) => {
    console.log(`balance child`, revokeStateUpdate);
    await get("selectedChild").then(async (data) => {
      const [balance, name] = await Promise.all([
        get(`balance-${data}`),
        get(`selectedChildName`),
      ]);
      if (data) {
        if (!revokeStateUpdate) {
          setChild({
            id: data,
            balance: parseInt(balance),
            name,
          });
        }
      } else {
        navigate("/");
      }
    });
  };

  const getReward = ({ rewardId, revokeStateUpdate = false }) => {
    actor
      ?.getGoals(child?.id)
      .then(async (returnedRewards) => {
        if ("ok" in returnedRewards) {
          const rewards = Object.values(returnedRewards);
          let currentGoalId;
          if (!rewardId) {
            await actor?.getCurrentGoal(child?.id).then((returnedGoal) => {
              currentGoalId = parseInt(returnedGoal);

              return currentGoalId;
            });
          }

          if (rewards) {
            const reward = rewards?.[0]?.find(
              (reward) =>
                rewardId === parseInt(reward.id) ||
                currentGoalId === parseInt(reward.id)
            );

            if (reward) {
              const { name, value, id } = reward;
              const returnedGoal = {
                name,
                value: parseInt(value),
                hasGoal: true,
                id,
              };
              set("childGoal", returnedGoal);
              if (!revokeStateUpdate) {
                setGoal(returnedGoal);
              }
            }
          }
          const filteredRewards = rewards?.[0].map((reward) => {
            return {
              ...reward,
              value: parseInt(reward.value),
              id: parseInt(reward.id),
              active: currentGoalId === parseInt(reward.id) ? true : false,
            };
          });
          set("rewardList", filteredRewards);
        } else {
          set("childGoal", noGoalEntity);
          if (!revokeStateUpdate) {
            setGoal(noGoalEntity);
          }
          console.error(returnedRewards.err);
        }
      })
      .finally(() => setIsLoading(false));
  };
  const percentage = (
    (Number(child?.balance) / Number(goal?.value)) *
    100
  ).toFixed(0);
  const isAbleToClaim = balance >= goal?.value && goal?.value > 0;

  const handleOpenGoalPicker = async () => {
    // Refresh the reward list to ensure active state is current
    await getReward({ revokeStateUpdate: true });
    const rewards = await get("rewardList");
    // Include all rewards (both active and inactive) when changing goals
    setAvailableRewards(rewards || []);
    setIsGoalPickerOpen(true);
  };

  const handleSelectGoal = async (rewardId) => {
    setIsLoading(true);
    setIsGoalPickerOpen(false);
    try {
      const result = await actor?.currentGoal(child?.id, parseInt(rewardId));
      if ("ok" in result) {
        const selectedReward = availableRewards.find(
          (r) => parseInt(r.id) === parseInt(rewardId)
        );
        await getReward({ rewardId, revokeStateUpdate: false });
        toast({
          title: `Goal set: ${selectedReward?.name}`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: "Failed to set goal",
          description: result.err,
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error("Error setting goal:", error);
      toast({
        title: "Failed to set goal",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoalClick = () => {
    if (isAbleToClaim) {
      handleClaimGoal();
    }
  };

  return (
    <>
      <header
        style={{
          backgroundImage: `url(${PlainGoalBackground})`,
          borderRadius: "12px",
          overflow: "hidden",
          WebkitBorderRadius: "12px",
          // Add top margin on native to create small gap below nav
          marginTop: isNative ? "calc(env(safe-area-inset-top, 0px) + 56px)" : undefined,
        }}
        className={`${styles.hero}`}
      >
        <Box
          display={"flex"}
          flexDirection={"row"}
          justifyContent={"space-between"}
          alignItems={"center"}
          height={"100%"}
        >
          <Box display={"flex"} flexDirection={"column"} gap={0}>
            <Box className={styles.name}>{child?.name}</Box>
            {child?.balance >= 0 && (
              <Box className={styles.balance}>
                <img src={dc} className="dc-img-big" alt="DooCoins symbol" />
                {child?.balance}
              </Box>
            )}
          </Box>

          {/* Goal Area - right side, shows one of three states */}
          <Box
            sx={{
              position: "relative",
              zIndex: 10,
              pr: { base: "20px", md: "40px", lg: "60px" },
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
                    textSize: "1em",
                  })}
                />
                <HStack
                  spacing={1}
                  justify="center"
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
                    fontSize="1.4em"
                    lineHeight="1em"
                    fontWeight="500"
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
                  mt={0}
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
                    fontSize="1.4em"
                    lineHeight="1em"
                    fontWeight="500"
                  >
                    {goal.name}
                  </Text>
                </HStack>
              </Box>
            )}
          </Box>
        </Box>
      </header>

      {/* Goal Picker Modal */}
      <Modal
        isOpen={isGoalPickerOpen}
        onClose={() => setIsGoalPickerOpen(false)}
        isCentered
      >
        <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
        <ModalContent
          mx={4}
          borderRadius="16px"
          maxW="400px"
          bg="white"
          overflow="hidden"
          boxShadow="none"
          shadow="none"
        >
          <ModalHeader
            color="black"
            fontSize="20px"
            fontWeight="700"
            py={4}
            textShadow="none"
            boxShadow="none"
            shadow="none"
          >
            Choose a Goal
          </ModalHeader>
          <ModalCloseButton color="black" />
          <ModalBody py={4} px={4}>
            {availableRewards.length === 0 ? (
              <Box textAlign="center" py={6}>
                <Text fontSize="16px" color="gray.600" mb={4}>
                  No rewards available yet
                </Text>
                <Text fontSize="14px" color="gray.500">
                  Go to the Rewards screen to create some!
                </Text>
              </Box>
            ) : (
              <VStack spacing={3} align="stretch">
                {availableRewards.map((reward) => (
                  <Box
                    key={reward.id}
                    p={4}
                    borderRadius="12px"
                    bg="gray.50"
                    cursor="pointer"
                    transition="all 0.2s"
                    border="2px solid transparent"
                    _hover={{
                      bg: "blue.50",
                      borderColor: "#00A4D7",
                      transform: "translateX(4px)",
                    }}
                    _active={{
                      transform: "scale(0.98)",
                    }}
                    onClick={() => handleSelectGoal(reward.id)}
                  >
                    <HStack justify="space-between" align="center">
                      <VStack align="start" spacing={1} flex={1}>
                        <HStack spacing={2}>
                          {reward.active && (
                            <Box
                              as="svg"
                              width="16px"
                              height="16px"
                              viewBox="0 0 24 24"
                              fill="#00A4D7"
                              color="#00A4D7"
                            >
                              <path
                                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                                fill="currentColor"
                              />
                            </Box>
                          )}
                          <Text fontWeight="600" fontSize="16px" color="gray.800">
                            {reward.name}
                          </Text>
                        </HStack>
                        <HStack spacing={1} align="center" pl={reward.active ? "24px" : "0"}>
                          <Text fontSize="14px" color="gray.600" fontWeight="500">
                            {reward.value} DooCoins
                          </Text>
                        </HStack>
                      </VStack>
                      <Box
                        as="svg"
                        width="24px"
                        height="24px"
                        viewBox="0 0 24 24"
                        fill="none"
                        color="gray.400"
                      >
                        <path
                          d="M9 18l6-6-6-6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </Box>
                    </HStack>
                  </Box>
                ))}
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default React.memo(Balance);
