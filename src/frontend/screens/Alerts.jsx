import React, { useEffect, useState } from "react";
import LoadingSpinner from "../components/LoadingSpinner";
import { ChildContext } from "../contexts/ChildContext";
import { del, get, set } from "idb-keyval";
import { useToast, Text, Skeleton, Stack, Box } from "@chakra-ui/react";
import { useAuth } from "../use-auth-client";
import RequestItem from "../components/Requests/RequestItem";
import useHasRewards from "../hooks/useHasRewards";
import EmptyStateMessage from "../components/EmptyStateMessage";

const Alerts = () => {
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const ITEM_LIMIT = 20;

  const toast = useToast();
  const {
    child,
    setChild,
    getBalance,
    transactions,
    setTransactions,
    handleUpdateTransactions,
    setBlockingChildUpdate,
    list,
    setList,
  } = React.useContext(ChildContext);
  const { actor } = useAuth();
  const { hasNewData, reqCount, setReqCount } = useHasRewards(child?.id, false);

  React.useEffect(() => {
    if (!child) {
      setLoading(false);
    }
  }, [child]);

  React.useEffect(() => {
    if (child?.id && hasNewData) {
      getAlerts({ callService: true });
    }
  }, [actor, child?.id, hasNewData]);

  React.useEffect(() => {
    if (child?.id) {
      getAlerts({ callService: true });
    }
  }, [actor, child?.id]);

  useEffect(() => {
    if (!list?.rewards?.length && !list?.tasks?.length && reqCount > 0) {
      setReqCount(0);
    }
  }, [list?.rewards, list?.tasks, reqCount]);

  function getAlerts({
    disableFullLoader = false,
    callService = false,
    revokeStateUpdate = false,
  }) {
    if (child.id) {
      if (!disableFullLoader) {
        setLoading(true);
      }
      get("tasksReq")
        .then(async (val) => {
          if (val === undefined || callService) {
            actor?.getTaskReqs(child.id).then(async (returnedTasksReq) => {
              const tasksReq = Object.values(returnedTasksReq);
              set("tasksReq", tasksReq);
              if (!revokeStateUpdate) {
                setList((prevState) => ({
                  ...prevState,
                  tasks: tasksReq,
                }));
              }

              setLoading(false);
            });
          } else {
            if (!revokeStateUpdate) {
              setList((prevState) => ({
                ...prevState,
                tasks: val?.map((task) => {
                  return {
                    ...task,
                    id: parseInt(task.id),
                    value: parseInt(task.value),
                  };
                }),
              }));
            }
            setLoading(false);
          }
        })
        .catch((error) => {
          removeErrorItem();
        });

      get("rewardsReq")
        .then(async (val) => {
          if (val === undefined || callService) {
            actor?.getRewardReqs(child.id).then(async (returnedRewardsReq) => {
              set("rewardsReq", returnedRewardsReq);
              if (!revokeStateUpdate) {
                setList((prevState) => ({
                  ...prevState,
                  rewards: returnedRewardsReq,
                }));
              }
              setLoading(false);
            });
          } else {
            if (!revokeStateUpdate) {
              setList((prevState) => ({
                ...prevState,
                rewards: val?.map((reward) => {
                  return {
                    ...reward,
                    id: parseInt(reward.id),
                    value: parseInt(reward.value),
                  };
                }),
              }));
            }
            setLoading(false);
          }
        })
        .catch((error) => {
          removeRewardsErrorItem();
        });

      return false;
    }
  }

  const removeErrorItem = () => {
    if (list.tasks?.length) {
      toast({
        title: "An error occurred.",
        description: `Apologies, please try again later.`,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
      const finalTasks = list.tasks.filter((reward) => !reward?.isLocal);
      set("tasksReq", finalTasks);
      setList((prevState) => ({ ...prevState, tasks: finalTasks }));
    } else {
      del("tasksReq", undefined);
      setList((prevState) => ({ ...prevState, tasks: [] }));
    }

    getAlerts({
      callService: true,
      disableFullLoader: false,
      revokeStateUpdate: false,
    });
  };

  const removeRewardsErrorItem = () => {
    if (list.tasks?.length) {
      toast({
        title: "An error occurred.",
        description: `Apologies, please try again later.`,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
      const rewardsTasks = list.rewards.filter((reward) => !reward?.isLocal);
      set("rewardsReq", rewardsTasks);
      setList((prevState) => ({ ...prevState, rewards: rewardsTasks }));
    } else {
      del("rewardsReq", undefined);
      setList((prevState) => ({ ...prevState, rewards: [] }));
    }

    getAlerts({
      callService: true,
      disableFullLoader: false,
      revokeStateUpdate: false,
    });
  };

  const getChildren = async ({ revokeStateUpdate = false }) => {
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

  const approveRequest = async ({ task, reward }) => {
    // setLoading(true);
    let dateNum = Math.floor(Date.now() / 1000);
    let date = dateNum.toString();

    if (task) {
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
        value: task.value,
        name: task.name,
        transactionType: "TASK_CREDIT",
      };
      setChild((prevState) => ({
        ...prevState,
        balance: prevState.balance + task.value,
      }));
      
      // Get current transactions and add new one
      const currentTransactions = await get("transactionList");
      await handleUpdateTransactions([new_transactions, ...(currentTransactions || [])]);
      
      // API call approveTask
      setBlockingChildUpdate(true);

      setList((prevState) => ({
        ...prevState,
        tasks: prevState.tasks?.filter((_task) => _task.id !== task.id),
      }));

      toast({
        title: `Keep up the good work, ${child.name}.`,
        status: "success",
        duration: 4000,
        isClosable: true,
      });

      try {
        await actor
          .approveTask(task.childId, parseInt(task.taskId), date)
          .then(async (returnedApproveTask) => {
            if ("ok" in returnedApproveTask) {
              actor?.getChildren().then(async (returnedChilren) => {
                if ("ok" in returnedChilren) {
                  rejectRequest({ task });
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
                  // setLoader((prevState) => ({ ...prevState, init: false }));
                  setBlockingChildUpdate(false);
                } else {
                  toast({
                    title: `Oops, something went wrong.`,
                    description:
                      "Could not approve the task, please try again later.",
                    status: "error",
                    duration: 4000,
                    isClosable: true,
                  });
                  // setLoader((prevState) => ({ ...prevState, init: false }));
                  console.error(returnedChilren.err);
                }
              });
            } else {
              // setLoader((prevState) => ({ ...prevState, init: false }));
              // Revert transaction on error
              const currentTransactions = await get("transactionList");
              const filteredTransactions = (currentTransactions || []).filter(
                (transaction) => transaction.id !== new_transactions.id
              );
              await handleUpdateTransactions(filteredTransactions);
              setChild((prevState) => ({
                ...prevState,
                balance: prevState.balance - task.value,
              }));
              // Restore task to the list
              setList((prevState) => ({
                ...prevState,
                tasks: [...(prevState.tasks || []), task],
              }));
              console.error(returnedApproveTask.err);
              setBlockingChildUpdate(false);
              toast({
                title: `Oops, sorry something went wrong.`,
                status: "error",
                duration: 4000,
                isClosable: true,
              });
            }
          });
        // toast({
        //   title: `Approved`,
        //   status: "success",
        //   duration: 4000,
        //   isClosable: true,
        // });
        // getAlerts({ callService: true });
      } catch (error) {
        // Restore task to the list on catch error
        setList((prevState) => ({
          ...prevState,
          tasks: [...(prevState.tasks || []), task],
        }));
        // Revert transaction on error
        const currentTransactions = await get("transactionList");
        handleUpdateTransactions(
          (currentTransactions || []).filter(
            (transaction) => transaction.id !== new_transactions.id
          )
        );
        toast({
          title: "An error occurred.",
          description: `Apologies, please try again later.`,
          status: "error",
          duration: 4000,
          isClosable: true,
        });
        setLoading(false);
        console.log(`error block`, error);
      }
    } else if (reward) {
      const new_transactions = {
        completedDate: date,
        id: transactions?.[0]?.id ? parseInt(transactions?.[0]?.id) + 1 : 1,
        value: reward.value,
        name: reward.name,
        transactionType: "GOAL_DEBIT",
      };
      
      // Get current transactions and add new one
      const currentTransactions = await get("transactionList");
      handleUpdateTransactions([new_transactions, ...(currentTransactions || [])]);

      setChild((prevState) => ({
        ...prevState,
        balance: prevState.balance - reward.value,
      }));

      setList((prevState) => ({
        ...prevState,
        rewards: prevState.rewards?.filter((_reward) => _reward.id !== reward.strId),
      }));

      toast({
        title: `Yay - well deserved, ${child.name}.`,
        status: "success",
        duration: 4000,
        isClosable: true,
      });

      try {
        await actor
          .claimGoal(child.id, parseInt(reward.id), date)
          .then(async (returnedClaimReward) => {
            if ("ok" in returnedClaimReward) {
              // Clear the current goal after claiming (reset to no goal)
              await actor?.currentGoal(child.id, 0);
              
              rejectRequest({ reward });
              // getReward({ rewardId: reward_id, revokeStateUpdate: true });
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
                // setIsLoading(false);
                setBlockingChildUpdate(false);
              });
            } else {
              console.error(returnedClaimReward.err);
              // Revert transaction on error
              const currentTransactions = await get("transactionList");
              handleUpdateTransactions(
                (currentTransactions || []).filter(
                  (transaction) => transaction.id !== new_transactions.id
                )
              );
              // Restore balance
              setChild((prevState) => ({
                ...prevState,
                balance: prevState.balance + reward.value,
              }));
              // Restore reward to the list
              setList((prevState) => ({
                ...prevState,
                rewards: [...(prevState.rewards || []), reward],
              }));
              setBlockingChildUpdate(false);
              toast({
                title: "Unable to claim reward.",
                description: returnedClaimReward.err?.BalanceNotEnough ? "Not enough balance." : "Please try again.",
                status: "error",
                duration: 4000,
                isClosable: true,
              });
            }
          })
          .finally(() => {
            // setIsLoading(false);
          });
        // toast({
        //   title: `Approved`,
        //   status: "success",
        //   duration: 4000,
        //   isClosable: true,
        // });
        // getAlerts({ callService: true });
      } catch (error) {
        // Restore reward to the list on catch error
        setList((prevState) => ({
          ...prevState,
          rewards: [...(prevState.rewards || []), reward],
        }));
        // Revert transaction on error
        const currentTransactions = await get("transactionList");
        handleUpdateTransactions(
          (currentTransactions || []).filter(
            (transaction) => transaction.id !== new_transactions.id
          )
        );
        toast({
          title: "An error occurred.",
          description: `Apologies, please try again later.`,
          status: "error",
          duration: 4000,
          isClosable: true,
        });
        setLoading(false);
        console.log(`error block`, error);
      }
    }
  };

  const rejectRequest = async ({ task, reward }) => {
    if (task) {
      try {
        await actor.removeTaskReq(child.id, task.id);
        getAlerts({
          disableFullLoader: true,
          callService: true,
          revokeStateUpdate: true,
        });
      } catch (error) {
        toast({
          title: "An error occurred.",
          description: `Apologies, please try again later.`,
          status: "error",
          duration: 4000,
          isClosable: true,
        });
        setLoading(false);
        console.log(`error block`, error);
      }
    } else if (reward) {
      try {
        await actor.removeRewardReq(child.id, reward.strId);
        getAlerts({
          disableFullLoader: true,
          callService: true,
          revokeStateUpdate: true,
        });
      } catch (error) {
        toast({
          title: "An error occurred.",
          description: `Apologies, please try again later.`,
          status: "error",
          duration: 4000,
          isClosable: true,
        });
        setLoading(false);
        console.log(`error block`, error);
      }
    }
  };

  const displayedRequests = React.useMemo(() => {
    const allRequests = [...(list.rewards || []), ...(list.tasks || [])];
    return showAll ? allRequests : allRequests.slice(0, ITEM_LIMIT);
  }, [list.rewards, list.tasks, showAll]);

  const displayedRewards = React.useMemo(() => {
    return displayedRequests.filter(item => list.rewards?.some(r => r.id === item.id));
  }, [displayedRequests, list.rewards]);

  const displayedTasks = React.useMemo(() => {
    return displayedRequests.filter(item => list.tasks?.some(t => t.id === item.id));
  }, [displayedRequests, list.tasks]);

  const totalRequests = (list.tasks?.length || 0) + (list.rewards?.length || 0);

  const AlertsList = React.useMemo(() => {
    return (
      <>
        {list.tasks?.length || list.rewards?.length ? (
          <>
            <div className="example">
              <ul className="list-wrapper">
                {displayedRewards.map((reward, idx) => (
                  <li key={reward.id || idx} style={{ listStyle: "none" }}>
                    <RequestItem
                      request={{
                        ...reward,
                        value: parseInt(reward.value),
                        id: parseInt(reward.reward || reward.id),
                        strId: reward.id,
                      }}
                      type="reward"
                      onApprove={() => approveRequest({ reward: {
                        ...reward,
                        value: parseInt(reward.value),
                        id: parseInt(reward.reward || reward.id),
                        strId: reward.id,
                      }})}
                      onDecline={() => {
                        setList((prevState) => ({
                          ...prevState,
                          rewards: prevState.rewards?.filter((_reward) => _reward.id !== reward.id),
                        }));
                        rejectRequest({ reward: {
                          ...reward,
                          value: parseInt(reward.value),
                          id: parseInt(reward.reward || reward.id),
                          strId: reward.id,
                        }});
                      }}
                    />
                  </li>
                ))}
                {displayedTasks.map((task, idx) => (
                  <li key={task.id || idx} style={{ listStyle: "none" }}>
                    <RequestItem
                      request={{ ...task, value: parseInt(task.value) }}
                      type="task"
                      onApprove={() => approveRequest({ task: { ...task, value: parseInt(task.value) }})}
                      onDecline={() => {
                        setList((prevState) => ({
                          ...prevState,
                          tasks: prevState.tasks?.filter((_task) => _task.id !== task.id),
                        }));
                        rejectRequest({ task: { ...task, value: parseInt(task.value) }});
                      }}
                    />
                  </li>
                ))}
              </ul>
            </div>
            {totalRequests > ITEM_LIMIT && !showAll && (
              <Box textAlign="center" marginTop={4} marginBottom={2}>
                <Text
                  as="button"
                  textStyle="largeLightDark"
                  color="#00A4D7"
                  cursor="pointer"
                  onClick={() => setShowAll(true)}
                  textDecoration="underline"
                >
                  See all requests ({totalRequests} total)
                </Text>
              </Box>
            )}
          </>
        ) : null}

        {!list.tasks?.length && !list.rewards?.length && (
          <EmptyStateMessage>
            There are no pending requests.
          </EmptyStateMessage>
        )}
      </>
    );
  }, [displayedRewards, displayedTasks, list.tasks, list.rewards, showAll, totalRequests]);

  // if (loading) {
  //   return <LoadingSpinner />;
  // }

  if (!child) {
    return (
      <div className={`light-panel`}>
        <div
          className={`panel-header-wrapper`}
          style={{ position: "relative" }}
        >
          <h2 className="title-button dark">
            <span>Please select a child to see the alerts.</span>{" "}
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className={`light-panel`}>
      <div className={`panel-header-wrapper`} style={{ position: "relative" }}>
        <h2 className="title-button">
          <Text as="span" textStyle="smallHeavyDark">Requests</Text>
        </h2>
      </div>

      {loading ? (
        <Stack margin={"0 20px 20px 20px"}>
          <Skeleton height="20px" />
          <Skeleton height="20px" mt={"12px"} />
          <Skeleton height="20px" mt={"12px"} />
        </Stack>
      ) : (
        <>{AlertsList}</>
      )}
    </div>
  );
};

export default Alerts;
