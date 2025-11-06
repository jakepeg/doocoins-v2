import * as React from "react";
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
} from "@chakra-ui/react";
import { get, set } from "idb-keyval";
import { ChildContext } from "../contexts/ChildContext";
import { useAuth } from "../use-auth-client";
import { useNavigate } from "react-router-dom";
import { noGoalEntity } from "../utils/constants";
import { FEATURE_FLAGS } from "../config/featureFlags";
import BalanceCardV1 from "./BalanceCardV1";
import BalanceCardV2 from "./BalanceCardV2";
import { Capacitor } from "@capacitor/core";

const Balance = ({ handleTogglePopup }) => {
  const {
    child,
    setChild,
    goal,
    setGoal,
    getBalance,
    handleUnsetGoal,
    handleUpdateTransactions,
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

  const handleShareChild = async () => {
    const shareData = {
      title: `DooCoins: ${child?.name}`,
      text: `${child?.name}'s DooCoins account`,
      url: typeof window !== "undefined" ? window.location.origin : undefined,
    };
    try {
      if (navigator.share && typeof navigator.share === "function") {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url ?? ""}`.trim());
        toast({ title: "Link copied", status: "success", duration: 2000, isClosable: true });
      } else {
        toast({ title: "Sharing not supported", status: "info", duration: 2000, isClosable: true });
      }
    } catch (e) {
      // user cancelled or error
    }
  };

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

  async function handleClaimGoal() {
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
    await handleUpdateTransactions([new_transactions, ...transactions]);

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
    // Open modal immediately
    setIsGoalPickerOpen(true);
    
    // Load from localStorage first for instant display
    const cachedRewards = await get("rewardList");
    if (cachedRewards) {
      setAvailableRewards(cachedRewards);
    }
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
        
        // Update the rewardList in localStorage with new active states
        const updatedRewards = availableRewards.map((reward) => ({
          ...reward,
          active: parseInt(reward.id) === parseInt(rewardId),
        }));
        await set("rewardList", updatedRewards);
        setAvailableRewards(updatedRewards);
        
        // Update the goal in context and localStorage
        const newGoal = {
          hasGoal: true,
          value: parseInt(selectedReward.value),
          name: selectedReward.name,
          id: parseInt(selectedReward.id),
        };
        await set("childGoal", newGoal);
        setGoal(newGoal);
        
        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('rewardListUpdated'));
        
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

  // Select card component based on feature flag
  const CardComponent = FEATURE_FLAGS.balanceCardDesign === 'v2' ? BalanceCardV2 : BalanceCardV1;

  // Card props to pass to both versions
  const cardProps = {
    child,
    goal,
    percentage,
    isAbleToClaim,
    isLoading,
    handleShareChild,
    handleNavigateToInvite: () => navigate("/invite", { state: { child } }),
    handleToggleEditPopup: () => handleTogglePopup?.(true, child, "edit"),
    handleOpenGoalPicker,
    handleClaimGoal,
  };

  return (
    <>
      <CardComponent {...cardProps} />

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
