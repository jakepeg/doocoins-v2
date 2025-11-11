import * as React from "react";
import { get, set } from "idb-keyval";
import Balance from "../components/Balance";
import { useAuth } from "../use-auth-client";
import modelStyles from "../components/popup/confirmation_popup.module.css";
import {
  Skeleton,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import DeleteDialog from "../components/Dialogs/DeleteDialog";
import EditDialog from "../components/Dialogs/EditDialog";
import AddActionDialog from "../components/Tasks/AddActionDialog";
import { default as GoalDialog } from "../components/Dialogs/ApproveDialog";
import { default as ClaimDialog } from "../components/Dialogs/ApproveDialog";
import { useNavigate } from "react-router-dom";
import RemoveGoalDialog from "../components/Dialogs/RemoveGoalDialog";
import strings, { noGoalEntity } from "../utils/constants";
import { ChildContext } from "../contexts/ChildContext";
import LoadingSpinner from "../components/LoadingSpinner";
import RewardItem from "../components/Rewards/RewardItem";
import EmptyStateMessage from "../components/EmptyStateMessage";

const Rewards = () => {
  const { actor } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [rewards, setRewards] = React.useState([]);
  const [currentGoal, setCurrentGoal] = React.useState(null);
  const {
    child,
    setChild,
    setGoal,
    blockingChildUpdate,
    setBlockingChildUpdate,
    transactions,
    setTransactions,
  } = React.useContext(ChildContext);
  const [loader, setLoader] = React.useState({
    init: true,
    singles: false,
    child: !child ? true : false,
  });
  const [selectedReward, setSelectedReward] = React.useState(null);
  const [showPopup, setShowPopup] = React.useState({
    delete: false,
    edit: false,
    claim: false,
    goal: false,
    add_reward: false,
    remove_goal: false,
  });

  React.useEffect(() => {
    if(!blockingChildUpdate) {
      // getChildren({});
    }
  }, []);

  React.useEffect(() => {
    if (child) {
      setLoader((prevState) => ({
        ...prevState,
        child: false,
      }));
    }
  }, [child]);

  const getChildren = async ({ revokeStateUpdate = false }) => {
    await get("selectedChild").then(async (data) => {
      const [balance, name] = await Promise.all([
        get(`balance-${data}`),
        get(`selectedChildName`),
      ]);
      if (data) {
        if(!revokeStateUpdate) {
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

  async function getBalance(childID) {
    return new Promise((resolve, reject) => {
      get("balance-" + childID)
        .then((val) => {
          actor?.getBalance(childID).then((returnedBalance) => {
            set("balance-" + childID, parseInt(returnedBalance));
            resolve(returnedBalance);
          });
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  function getRewards({ disableFullLoader, callService = false, revokeStateUpdate = false }) {
    if (child.id) {
      if (!disableFullLoader) {
        setLoader((prevState) => ({ ...prevState, init: true }));
      }

      get("rewardList")
        .then(async (val) => {
          if (val === undefined || callService) {
            actor?.getGoals(child.id).then(async (returnedRewards) => {
              if ("ok" in returnedRewards) {
                const rewards = Object.values(returnedRewards);
                console.log("📦 Raw rewards from getGoals:", rewards[0]);
                console.log("📊 Reward details:", rewards[0]?.map(r => ({ id: r.id, name: r.name, archived: r.archived })));
                
                // Check for duplicates
                const ids = rewards[0]?.map(r => r.id) || [];
                const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
                if (duplicateIds.length > 0) {
                  console.error("🚨 DUPLICATES DETECTED in backend response! IDs:", duplicateIds);
                }
                
                let currentGoalId;
                await actor?.getCurrentGoal(child.id).then((returnedGoal) => {
                  currentGoalId = parseInt(returnedGoal);

                  return currentGoalId;
                });
                const filteredRewards = rewards?.[0].map((reward) => {
                  return {
                    ...reward,
                    value: parseInt(reward.value),
                    id: parseInt(reward.id),
                    active:
                      currentGoalId === parseInt(reward.id) ? true : false,
                  };
                });
                console.log("💾 Setting rewards to localStorage and state:", filteredRewards.length, "rewards");
                set("rewardList", filteredRewards);
                if (!revokeStateUpdate) {
                  setRewards(filteredRewards);
                }
                setLoader((prevState) => ({
                  ...prevState,
                  init: false,
                  singles: false,
                }));
              } else {
                console.error(returnedRewards.err);
              }
            });
          } else {
            if (!revokeStateUpdate) {
              setRewards(
                val?.map((reward) => {
                  return {
                    ...reward,
                    id: parseInt(reward.id),
                    value: parseInt(reward.value),
                  };
                })
              );
            }
            setLoader((prevState) => ({
              ...prevState,
              init: false,
              singles: false,
            }));
          }
        })
        .catch(() => {
          removeErrorItem();
        });

      return false;
    }
  }

  const removeErrorItem = () => {
    if (rewards?.length) {
      toast({
        title: "An error occurred.",
        description: `Apologies, please try again later.`,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
      const finalRewards = rewards.filter((reward) => !reward?.isLocal);
      set("rewardList", finalRewards);
      setRewards(finalRewards);
    } else {
      set("rewardList", undefined);
      setRewards([]);
    }
  };

  function updateReward(rewardID, rewardName, rewardValue) {
    const reward_object = {
      ...selectedReward,
      name: rewardName,
      value: rewardValue,
      id: rewardID,
      archived: false,
    };

    if (reward_object.active) {
      const returnedGoal = {
        hasGoal: true,
        value: parseInt(rewardValue),
        name: rewardName,
        id: parseInt(rewardID),
      };
      set("childGoal", returnedGoal);
      setGoal(returnedGoal);
    }
    handleCloseEditPopup();
    let prevReward;
    setRewards((currentRewards) => {
      const updatedList = currentRewards.map((reward) => {
        if (reward.id === reward_object.id) {
          prevReward = reward;
          return reward_object;
        } else {
          return reward;
        }
      });
      set("rewardList", updatedList);
      return updatedList;
    });
    
    actor
      ?.updateGoal(child.id, rewardID, reward_object)
      .then((response) => {
        if ("ok" in response) {
          // Success - no need to refetch, optimistic update is correct
          toast({
            title: "Reward updated successfully",
            status: "success",
            duration: 2000,
            isClosable: true,
          });
        } else {
          // Revert on error
          setRewards((currentRewards) => {
            const updatedList = currentRewards.map((reward) => {
              const updatedReward =
                reward.id === reward_object.id ? prevReward : reward;
              return updatedReward;
            });
            set("rewardList", updatedList);
            return updatedList;
          });
          toast({
            title: "Failed to update reward",
            status: "error",
            duration: 3000,
            isClosable: true,
          });
        }
      })
      .catch((error) => {
        // Revert on error
        setRewards((currentRewards) => {
          const updatedList = currentRewards.map((reward) => {
            const updatedReward =
              reward.id === reward_object.id ? prevReward : reward;
            return updatedReward;
          });
          set("rewardList", updatedList);
          return updatedList;
        });
      });
  }

  function deleteReward(rewardID, rewardName, rewardValue) {
    const reward_object = {
      ...selectedReward,
      name: rewardName,
      value: rewardValue,
      id: rewardID,
      archived: true,
    };
    console.log("🗑️ Deleting reward:", { rewardID, reward_object });
    console.log("🔍 selectedReward before delete:", selectedReward);
    console.log("🔍 reward_object.archived:", reward_object.archived);
    const finalRewards = rewards.filter((reward) => reward.id !== rewardID);
    setRewards(finalRewards);
    set("rewardList", finalRewards);
    handleCloseDeletePopup();
    
    actor
      ?.updateGoal(child.id, rewardID, reward_object)
      .then((response) => {
        console.log("✅ Delete response from backend:", response);
        if ("ok" in response) {
          // Success - optimistic update already removed it, no need to refetch
          toast({
            title: "Reward deleted successfully",
            status: "success",
            duration: 2000,
            isClosable: true,
          });
        } else {
          // Revert on error
          setRewards((prevState) => {
            const revertedList = [...prevState, reward_object];
            set("rewardList", revertedList);
            return revertedList;
          });
          toast({
            title: "An error occurred.",
            description: `Can't perform delete, please try again later.`,
            status: "error",
            duration: 4000,
            isClosable: true,
          });
        }
      })
      .catch((error) => {
        // Revert on error
        setRewards((prevState) => {
          const revertedList = [...prevState, reward_object];
          set("rewardList", revertedList);
          return revertedList;
        });
        toast({
          title: "An error occurred.",
          description: `Can't perform delete, please try again later.`,
          status: "error",
          duration: 4000,
          isClosable: true,
        });
      });
  }

  const handleTogglePopup = (isOpen, reward, popup) => {
    setSelectedReward(reward);
    setShowPopup((prevState) => ({ ...prevState, [popup]: isOpen }));
  };

  function handleSetGoal({ reward_id, isForSet, disableFullLoader }) {
    if (isForSet) {
      handleToggleGoalPopup();
      const returnedGoal = {
        hasGoal: true,
        value: parseInt(selectedReward.value),
        name: selectedReward.name,
        id: parseInt(selectedReward.id),
      };
      set("childGoal", returnedGoal);
      setGoal(returnedGoal);
      setRewards((currentRewards) => {
        const finalRewards = currentRewards.map((reward) => {
          if (reward.id === reward_id) {
            return { ...reward, active: true };
          } else {
            return { ...reward, active: false };
          }
        });
        set("rewardList", finalRewards);
        return finalRewards;
      });
    } else {
      set("childGoal", noGoalEntity);
      setGoal(noGoalEntity);
      handleCloseRemoveGoalPopup();
      setRewards((currentRewards) => {
        const finalRewards = currentRewards.map((reward) => {
          if (reward.id === selectedReward.id) {
            return { ...reward, active: false };
          } else {
            return reward;
          }
        });
        set("rewardList", finalRewards);
        return finalRewards;
      });
    }
    
    // API call currentGoal
    actor
      ?.currentGoal(child.id, reward_id)
      .then(async (returnedCurrentGoal) => {
        if ("ok" in returnedCurrentGoal) {
          setCurrentGoal(reward_id);
          if (isForSet) {
            toast({
              title: `Good luck achieving your goal, ${child.name}.`,
              status: "success",
              duration: 4000,
              isClosable: true,
            });
          } else {
            toast({
              title: `Goal removed for ${child.name}.`,
              status: "success",
              duration: 4000,
              isClosable: true,
            });
          }
          // No need to call getRewards with callService - state is already updated optimistically
          // Only sync localStorage if something went wrong
        } else {
          console.error(returnedCurrentGoal.err);
          // Revert optimistic update on error
          setRewards((currentRewards) => {
            const finalRewards = currentRewards.map((reward) => {
              if (reward.id === reward_id) {
                return { ...reward, active: !isForSet };
              } else {
                return reward;
              }
            });
            set("rewardList", finalRewards);
            return finalRewards;
          });
          
          // Revert goal
          if (isForSet) {
            set("childGoal", noGoalEntity);
            setGoal(noGoalEntity);
          }
        }
      })
      .catch((error) => {
        console.error("Error setting goal:", error);
        // Revert on error
        setRewards((currentRewards) => {
          const finalRewards = currentRewards.map((reward) => {
            if (reward.id === reward_id) {
              return { ...reward, active: !isForSet };
            } else {
              return reward;
            }
          });
          set("rewardList", finalRewards);
          return finalRewards;
        });
        
        if (isForSet) {
          set("childGoal", noGoalEntity);
          setGoal(noGoalEntity);
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

  function handleClaimReward(reward_id) {
    handleToggleClaimPopup();
    let dateNum = Math.floor(Date.now() / 1000);
    let date = dateNum.toString();
    
    let maxIdObject = null;

    // Iterate through the data array to find the object with the highest "id"
    for (const item of transactions) {
      if (!maxIdObject || Number(item.id) > Number(maxIdObject.id)) {
        maxIdObject = item;
      }
    }

    const new_transactions = {
      completedDate: date,
      id: maxIdObject?.id ? parseInt(maxIdObject?.id) + 1 : 1,
      value: selectedReward.value,
      name: selectedReward.name,
      transactionType: "GOAL_DEBIT",
    };
    set("transactionList", [new_transactions, ...transactions]);
    setTransactions([new_transactions, ...transactions]);
    setChild((prevState) => ({
      ...prevState,
      balance: prevState.balance - selectedReward.value,
    }));
    setBlockingChildUpdate(true)
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
            
            // Fetch updated transactions from backend to sync with wallet
            actor?.getTransactions(child.id).then((returnedTransactions) => {
              if ("ok" in returnedTransactions) {
                const backendTransactions = Object.values(returnedTransactions);
                if (backendTransactions.length) {
                  set("transactionList", backendTransactions[0]);
                  setTransactions(backendTransactions[0]);
                }
              }
            });
            
            setBlockingChildUpdate(false)
            setLoader((prevState) => ({ ...prevState, init: false }));
          });
        } else {
          const filteredTransactions = transactions.filter(
            (transaction) => transaction.id !== new_transactions.id
          );
          setTransactions(filteredTransactions);
          set("transactionList", filteredTransactions);
          setLoader((prevState) => ({ ...prevState, init: false }));
          setBlockingChildUpdate(false)
        }
      });
  }

  React.useEffect(() => {
    if (child) getRewards({ callService: true }); // Always fetch fresh data from backend
  }, [actor, child]);

  // Add listener to refresh rewards when returning to this screen
  React.useEffect(() => {
    const refreshRewardsFromStorage = async () => {
      // Always fetch from backend instead of just storage to ensure consistency
      if (child && actor && !loader.init) {
        getRewards({ callService: true, disableFullLoader: true });
      }
    };

    // Refresh on component mount/focus
    window.addEventListener("focus", refreshRewardsFromStorage);
    
    // Listen for custom event from Balance component
    window.addEventListener("rewardListUpdated", refreshRewardsFromStorage);
    
    // Refresh when navigating back to this page
    refreshRewardsFromStorage();

    return () => {
      window.removeEventListener("focus", refreshRewardsFromStorage);
      window.removeEventListener("rewardListUpdated", refreshRewardsFromStorage);
    };
  }, [loader.init]);

  const handleCloseDeletePopup = () => {
    setShowPopup((prevState) => ({ ...prevState, ["delete"]: false }));
  };

  const handleCloseEditPopup = () => {
    setShowPopup((prevState) => ({ ...prevState, ["edit"]: false }));
  };

  const handleToggleAddRewardPopup = () => {
    setShowPopup((prevState) => ({
      ...prevState,
      ["add_reward"]: !prevState.add_reward,
    }));
  };

  const handleToggleClaimPopup = () => {
    setShowPopup((prevState) => ({
      ...prevState,
      ["claim"]: !prevState.claim,
    }));
  };

  const handleCloseRemoveGoalPopup = () => {
    setShowPopup((prevState) => ({
      ...prevState,
      ["remove_goal"]: !prevState.remove_goal,
    }));
  };

  const handleToggleGoalPopup = () => {
    setShowPopup((prevState) => ({
      ...prevState,
      ["goal"]: !prevState.goal,
    }));
  };

  const handleSubmitReward = (rewardName, value) => {
    if (rewardName) {
      // Use timestamp as temporary unique ID for optimistic update
      const tempId = Date.now();
      
      // Calculate next ID: find the highest ID from current rewards and add 1
      const maxId = rewards.reduce((max, r) => Math.max(max, parseInt(r.id) || 0), 0);
      const nextId = maxId + 1;
      
      const reward = {
        name: rewardName,
        value: parseInt(value),
        active: false,
        archived: false,
        id: nextId, // Use calculated next ID
        isLocal: true,
        tempId: tempId,
      };
      const newRewardsList = [reward, ...rewards];
      setRewards(newRewardsList);
      set("rewardList", newRewardsList);
      handleToggleAddRewardPopup();
      
      actor
        .addGoal(reward, child.id)
        .then((response) => {
          if ("ok" in response) {
            // Backend returns ALL goals/rewards - replace with fresh data
            const allReturnedRewards = Object.values(response)[0];
            const activeRewards = allReturnedRewards
              .filter(r => r.archived === false)
              .map((reward) => ({
                ...reward,
                id: parseInt(reward.id),
                value: parseInt(reward.value),
                active: reward.active || false,
              }));
            
            setRewards(activeRewards);
            set("rewardList", activeRewards);
            
            toast({
              title: "Reward added successfully",
              status: "success",
              duration: 2000,
              isClosable: true,
            });
          } else {
            removeErrorItem();
          }
        })
        .catch((error) => {
          removeErrorItem();
        });
    }
  };

  const RewardList = React.useMemo(() => {
    return (
      <>
        {rewards?.length ? (
          <div className="example">
            <ul className="list-wrapper">
              {rewards.map((reward) => (
                <li key={reward.id} style={{ listStyle: "none" }}>
                  <RewardItem
                    reward={reward}
                    handleTogglePopup={handleTogglePopup}
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <EmptyStateMessage>
            {`Rewards are how children spend DooCoins. A reward can be a treat, like watching a movie, getting a new toy, or enjoying extra screen time. <br /><br /> Tap the + icon to set rewards for ${child?.name}.`}
          </EmptyStateMessage>
        )}
      </>
    );
  }, [rewards, child?.name]);

  const isModalOpen =
    showPopup.delete ||
    showPopup.edit ||
    showPopup.claim ||
    showPopup.goal ||
    showPopup.add_reward ||
    showPopup.remove_goal;

  if (loader.child) {
    return <LoadingSpinner />;
  }

  return (
    <>
      {showPopup.delete && (
        <DeleteDialog
          selectedItem={selectedReward}
          handleCloseDeletePopup={handleCloseDeletePopup}
          handleDelete={(childId) =>
            deleteReward(
              parseInt(selectedReward.id),
              selectedReward.name,
              parseInt(selectedReward.value)
            )
          }
        />
      )}
      {showPopup.remove_goal && (
        <RemoveGoalDialog
          selectedItem={selectedReward}
          handleClosePopup={handleCloseRemoveGoalPopup}
          handleRemove={() =>
            handleSetGoal({
              reward_id: 0,
              isForSet: false,
              disableFullLoader: false,
            })
          }
        />
      )}
      {showPopup.edit && (
        <EditDialog
          handleCloseEditPopup={handleCloseEditPopup}
          selectedItem={selectedReward}
          handleSubmitForm={(rewardId, rewardName, rewardValue) =>
            updateReward(
              parseInt(selectedReward.id),
              rewardName,
              parseInt(rewardValue)
            )
          }
        />
      )}
      {showPopup.claim && (
        <ClaimDialog
          handleClosePopup={handleToggleClaimPopup}
          selectedItem={selectedReward}
          handleApprove={() => handleClaimReward(parseInt(selectedReward.id))}
          submitBtnLabel="Claim Reward"
        />
      )}
      {showPopup.goal && (
        <GoalDialog
          handleClosePopup={handleToggleGoalPopup}
          selectedItem={selectedReward}
          title={selectedReward.name}
          handleApprove={() =>
            handleSetGoal({
              reward_id: parseInt(selectedReward.id),
              isForSet: true,
              disableFullLoader: false,
            })
          }
          submitBtnLabel="Set Goal"
        />
      )}
      {showPopup.add_reward && (
        <AddActionDialog
          handleSubmitForm={handleSubmitReward}
          handleClosePopup={handleToggleAddRewardPopup}
          title="Add a Reward"
          namePlaceHolder="Reward Name"
          valuePlaceHolder="Reward Value"
        />
      )}

      <div
        className={`${
          isModalOpen ? modelStyles.blur_background : undefined
        } light-panel`}
      >
        <div className={`panel-header-wrapper`} style={{ position: "relative" }}>
          <h2 className="title-button">
            <Text as="span" textStyle="smallHeavyDark">Rewards</Text>
            <span
              role="button"
              onClick={handleToggleAddRewardPopup}
              className="plus-sign"
            />
          </h2>
        </div>
        {loader.init ? (
          <Stack margin={"0 20px 20px 20px"}>
            <Skeleton height="20px" />
            <Skeleton height="20px" mt={"12px"} />
            <Skeleton height="20px" mt={"12px"} />
          </Stack>
        ) : (
          <>{RewardList}</>
        )}
        {loader.singles ? (
          <Stack margin={"0 20px 20px 20px"}>
            <Skeleton height="20px" mt={"12px"} />
          </Stack>
        ) : (
          <div></div>
        )}
      </div>
    </>
  );
};

export default Rewards;
