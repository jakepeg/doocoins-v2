import * as React from "react";
import { useToast, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, VStack, HStack, Text, Box } from "@chakra-ui/react";
import { get, set } from "idb-keyval";
import { ChildContext } from "../contexts/ChildContext";
import { useAuth } from "../use-auth-client";
import { noGoalEntity } from "../utils/constants";
import BalanceCard from "./BalanceCard";

const Balance = () => {
  const {
    child,
    goal,
    setGoal,
    blockingChildUpdate,
    setTransactions,
    refetchContent,
    refetching,
  } = React.useContext(ChildContext);
  const { actor, store } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isGoalPickerOpen, setIsGoalPickerOpen] = React.useState(false);
  const [availableRewards, setAvailableRewards] = React.useState([]);
  const balance = child?.balance || 0;
  const toast = useToast();

  React.useEffect(() => {
    if (!blockingChildUpdate) {
      getChildGoal();
    }
  }, []);

  const getChildGoal = () => {
    get("childGoal", store).then(async (data) => {
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
  };

  function getTransactions() {
    get("transactionList", store).then(async (val) => {
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
              set("childGoal", returnedGoal, store);
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
          set("rewardList", filteredRewards, store);
        } else {
          set("childGoal", noGoalEntity, store);
          if (!revokeStateUpdate) {
            setGoal(noGoalEntity);
          }
          console.error(returnedRewards.err);
        }
      })
      .finally(() => setIsLoading(false));
  };
  const calculatePercentage = () => {
    console.log('Percentage calc - full goal object:', goal);
    console.log('Percentage calc - full child object:', child);
    console.log('Percentage calc:', { 
      goalValue: goal?.value, 
      childBalance: child?.balance,
      hasGoal: goal?.hasGoal,
      goalValueType: typeof goal?.value,
      childBalanceType: typeof child?.balance
    });
    if (!goal?.value || goal?.value <= 0) {
      console.log('No goal value, returning 0');
      return 0;
    }
    if (child?.balance === undefined || child?.balance === null) {
      console.log('No child balance, returning 0');
      return 0;
    }
    const calc = (Number(child?.balance) / Number(goal?.value)) * 100;
    console.log('Calculated percentage:', calc);
    if (isNaN(calc)) {
      console.log('Result is NaN, returning 0');
      return 0;
    }
    const result = Math.min(calc, 100).toFixed(0);
    console.log('Final percentage result:', result);
    return result;
  };
  const percentage = calculatePercentage();
  const isAbleToClaim = balance >= goal?.value && goal?.value > 0;

  const handleOpenGoalPicker = async () => {
    // Open modal immediately
    setIsGoalPickerOpen(true);
    
    // Load from localStorage first for instant display
    const cachedRewards = await get("rewardList", store);
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
        await set("rewardList", updatedRewards, store);
        setAvailableRewards(updatedRewards);

        if (selectedReward) {
          const newGoal = {
            name: selectedReward.name,
            value: parseInt(selectedReward.value),
            hasGoal: true,
            id: selectedReward.id,
          };
          setGoal(newGoal);
          await set("childGoal", newGoal, store);
        }

        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('rewardListUpdated'));

        toast({
          title: "Goal set!",
          description: `${selectedReward?.name} is now your goal`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error("Error setting goal:", error);
      toast({
        title: "Error setting goal",
        description: "Please try again",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimGoal = async () => {
    if (!isAbleToClaim || isLoading) return;
    
    try {
      setIsLoading(true);
      await actor.requestClaimReward(
        child.id,
        parseInt(goal.id),
        parseInt(goal.value),
        goal.name
      );
      toast({
        title: `well done ${child.name}, the reward is pending`,
        status: "success",
        variant: "solid",
        duration: 4000,
        isClosable: true,
      });
    } catch (error) {
      console.log(`the error`, error);
      toast({
        title: "An error occurred.",
        description: `Apologies, please try again later.`,
        status: "error",
        variant: "solid",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <BalanceCard
        child={child}
        goal={goal}
        percentage={percentage}
        isAbleToClaim={isAbleToClaim}
        isLoading={isLoading}
        handleOpenGoalPicker={handleOpenGoalPicker}
        handleClaimGoal={handleClaimGoal}
      />

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
