import * as React from "react";
import { useToast } from "@chakra-ui/react";
import { get, set } from "idb-keyval";
import { ChildContext } from "../contexts/ChildContext";
import { useAuth } from "../use-auth-client";
import { noGoalEntity } from "../utils/constants";
import { useNavigate } from "react-router-dom";
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
  const balance = child?.balance || 0;
  const toast = useToast();
  const navigate = useNavigate();

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
  const percentage = (
    (Number(child?.balance) / Number(goal?.value)) *
    100
  ).toFixed(0);
  const isAbleToClaim = balance >= goal?.value && goal?.value > 0;

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

  const handleOpenGoalPicker = () => {
    // Navigate to the rewards page where goals can be selected
    navigate("/rewards");
  };

  return (
    <BalanceCard
      child={child}
      goal={goal}
      percentage={percentage}
      isAbleToClaim={isAbleToClaim}
      isLoading={isLoading}
      handleOpenGoalPicker={handleOpenGoalPicker}
      handleClaimGoal={handleClaimGoal}
    />
  );
};

export default React.memo(Balance);
