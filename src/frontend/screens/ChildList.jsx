import React from "react";
import { useAuth } from "../use-auth-client";
import { set, get, del } from "idb-keyval";
import ChildItem from "../components/ChildItem";
import modelStyles from "../components/popup/confirmation_popup.module.css";
import AddChildDialog from "../components/ChildList/AddChildDialog";
import DeleteDialog from "../components/Dialogs/DeleteDialog";
import EditDialog from "../components/Dialogs/EditDialog";
import { Capacitor } from "@capacitor/core";
import EmptyStateMessage from "../components/EmptyStateMessage";
// Swipe interactions replaced by popup actions menu
import { 
  Skeleton, 
  Stack, 
  Text, 
  Box,
  VStack,
  HStack,
  Button,
  Link,
  useToast
} from "@chakra-ui/react";
import { ChildContext } from "../contexts/ChildContext";
import strings from "../utils/constants";
import { useNavigate } from "react-router-dom";

function ChildList() {
  const { actor, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const isNative = Capacitor.isNativePlatform();
  // Migration context removed - users directed to V1 to upgrade
  const {
    setGoal,
    setChild,
  } = React.useContext(ChildContext);
  const [children, setChildren] = React.useState(null);
  const [openItemId, setOpenItemId] = React.useState(null);
  const [showPopup, setShowPopup] = React.useState({
    delete: false,
    edit: false,
    add_child: false,
    revoke: false,
    remove: false,
  });
  const [selectedChild, setSelectedChild] = React.useState(null);
  const [loader, setLoader] = React.useState({ init: true, singles: false });
  const [showAll, setShowAll] = React.useState(false);
  const ITEM_LIMIT = 20;
  const [activeTab, setActiveTab] = React.useState("children");
  const [alertsList, setAlertsList] = React.useState({ tasks: [], rewards: [] });
  const [alertsLoading, setAlertsLoading] = React.useState(false);

  React.useEffect(() => {
    if (actor && isAuthenticated) {
      getChildren({ callService: false });
    }
  }, [actor, isAuthenticated]);

  function getChildren({ callService = false }) {
    del("selectedChild");
    del("selectedChildName");
    del("childGoal");
    del("rewardList");
    del("taskList");
    del("transactionList");
    setGoal(null);
    setChild(null);
    setLoader((prevState) => ({ ...prevState, init: true }));
    get("childList").then(async (val) => {
      if (val === undefined || callService) {
        setLoader((prevState) => ({ ...prevState, init: true }));
        actor
          ?.getChildren()
          .then(async (returnedChilren) => {
            if ("ok" in returnedChilren) {
              const children = Object.values(returnedChilren);
              const updatedChildrenData = await Promise.all(
                children[0].map(async (child) => {
                  const [balance, currentGoal, rewardCount, taskCount] = await Promise.all([
                    getBalance(child.id),
                    actor?.getCurrentGoal(child.id),
                    actor?.hasRewards(child.id),
                    actor?.hasTasks(child.id)
                  ]);
                  return {
                    ...child,
                    balance: parseInt(balance),
                    hasGoal: parseInt(currentGoal) > 0,
                    pendingRequests: (parseInt(rewardCount) || 0) + (parseInt(taskCount) || 0),
                  };
                }),
              );
              setChildren(updatedChildrenData);
              set("childList", updatedChildrenData);
            } else {
              console.error(returnedChilren.err);
            }
          })
          .finally(() => {
            setLoader((prevState) => ({ ...prevState, init: false }));
          });
      } else {
        const updatedChildrenData = await Promise.all(
          Object.values(val).map(async (child) => {
            const [balance, currentGoal, rewardCount, taskCount] = await Promise.all([
              getBalance(child.id),
              actor?.getCurrentGoal(child.id),
              actor?.hasRewards(child.id),
              actor?.hasTasks(child.id)
            ]);
            return {
              ...child,
              balance: parseInt(balance),
              hasGoal: parseInt(currentGoal) > 0,
              pendingRequests: (parseInt(rewardCount) || 0) + (parseInt(taskCount) || 0),
            };
          }),
        );
        setChildren(updatedChildrenData);
        setLoader((prevState) => ({ ...prevState, init: false }));
      }
    });
  }

  async function getAllChildrenAlerts() {
    setAlertsLoading(true);
    try {
      const childList = children || await get("childList");
      if (!childList || !childList.length) {
        setAlertsLoading(false);
        setAlertsList({ tasks: [], rewards: [] });
        return;
      }

      const allRequests = await Promise.all(
        childList.map(async (child) => {
          const [tasks, rewards] = await Promise.all([
            actor?.getTaskReqs(child.id).then(res => Object.values(res || {})),
            actor?.getRewardReqs(child.id)
          ]);
          
          const tasksWithChild = (tasks || []).map(task => ({
            ...task,
            childId: child.id,
            childName: child.name,
            type: 'task'
          }));
          
          const rewardsWithChild = (rewards || []).map(reward => ({
            ...reward,
            childId: child.id,
            childName: child.name,
            type: 'reward'
          }));
          
          return [...tasksWithChild, ...rewardsWithChild];
        })
      );

      const flatRequests = allRequests.flat().sort((a, b) => {
        return b.id?.localeCompare(a.id) || 0;
      });

      const tasks = flatRequests.filter(r => r.type === 'task');
      const rewards = flatRequests.filter(r => r.type === 'reward');

      setAlertsList({ tasks, rewards });
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast({
        title: "An error occurred.",
        description: `Apologies, please try again later.`,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setAlertsLoading(false);
    }
  }

  React.useEffect(() => {
    if (activeTab === "requests" && actor && children) {
      getAllChildrenAlerts();
      // Also refresh children data to update pendingRequests counts
      getChildren({ callService: true });
    }
  }, [activeTab, actor, children]);

  function updateChild(childID, childName) {
    handleCloseEditPopup();
    // Find the existing child to preserve creatorId and parentIds
    const existingChild = children.find(c => c.id === childID);
    
    // Build child object with proper Candid optional format
    const child_object = { 
      id: childID, 
      name: childName, 
      archived: false
    };
    
    // Only include creatorId/parentIds if they exist (preserve exact format from backend)
    if (existingChild?.creatorId !== undefined) {
      child_object.creatorId = existingChild.creatorId;
    }
    if (existingChild?.parentIds !== undefined) {
      child_object.parentIds = existingChild.parentIds;
    }
    
    // Optimistically update local state
    const updatedChildren = children.map(c => 
      c.id === childID ? { ...c, name: childName } : c
    );
    setChildren(updatedChildren);
    set("childList", updatedChildren);
    
    setLoader((prevState) => ({ ...prevState, init: true }));
    actor?.updateChild(childID, child_object).then((response) => {
      setLoader((prevState) => ({ ...prevState, init: false }));
    }).catch(() => {
      // On error, refetch from backend
      getChildren({ callService: true });
    });
  }

  function deleteChild(childID, childName) {
    handleCloseDeletePopup();
    // Find the existing child to preserve creatorId and parentIds
    const existingChild = children.find(c => c.id === childID);
    
    // Build child object with proper Candid optional format
    const child_object = { 
      id: childID, 
      name: childName, 
      archived: true
    };
    
    // Only include creatorId/parentIds if they exist (preserve exact format from backend)
    if (existingChild?.creatorId !== undefined) {
      child_object.creatorId = existingChild.creatorId;
    }
    if (existingChild?.parentIds !== undefined) {
      child_object.parentIds = existingChild.parentIds;
    }
    
    // Optimistically remove from local state
    const updatedChildren = children.filter(c => c.id !== childID);
    setChildren(updatedChildren);
    set("childList", updatedChildren);
    
    setLoader((prevState) => ({ ...prevState, init: true }));
    actor?.updateChild(childID, child_object).then((response) => {
      setLoader((prevState) => ({ ...prevState, init: false }));
    }).catch(() => {
      // On error, refetch from backend
      getChildren({ callService: true });
    });
  }

  async function getBalance(childID) {
    return new Promise((resolve, reject) => {
      let bal;
      get("balance-" + childID)
        .then((val) => {
          // if (val === undefined) {
          actor?.getBalance(childID).then((returnedBalance) => {
            set("balance-" + childID, parseInt(returnedBalance));
            resolve(returnedBalance);
          });
          // } else {
          //   bal = val;
          //   resolve(bal);
          // }
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  // update the childList after adding a new child
  async function updateChildList(returnedAddChild) {
    try {
      const childList = await get("childList");
      const updatedChildList = { ...childList, ...returnedAddChild };

      const updatedChildrenData = await Promise.all(
        Object.values(updatedChildList).map(async (child) => {
          const balance = await getBalance(child.id);
          return {
            ...child,
            balance: parseInt(balance),
          };
        }),
      );

      await set("childList", updatedChildrenData);
      setChildren(updatedChildrenData);
    } catch (error) {
      console.error("Error adding item to childList:", error);
    } finally {
      setLoader((prevState) => ({ ...prevState, singles: false }));
    }
  }

  const handleTogglePopup = (isOpen, child, popup) => {
    setSelectedChild(child);
    setShowPopup((prevState) => ({ ...prevState, [popup]: isOpen }));
  };

  const handleCloseDeletePopup = () => {
    setShowPopup((prevState) => ({ ...prevState, ["delete"]: false }));
  };

  const handleCloseEditPopup = () => {
    setShowPopup((prevState) => ({ ...prevState, ["edit"]: false }));
  };

  const handleCloseAddChildPopup = () => {
    setShowPopup((prevState) => ({
      ...prevState,
      ["add_child"]: false,
    }));
  };

  const handleToggleAddChildPopup = () => {
    setShowPopup((prevState) => ({
      ...prevState,
      ["add_child"]: !prevState["add_child"],
    }));
  };

  const handleCloseRevokePopup = () => {
    setShowPopup((prevState) => ({ ...prevState, ["revoke"]: false }));
  };

  const handleCloseRemovePopup = () => {
    setShowPopup((prevState) => ({ ...prevState, ["remove"]: false }));
  };

  function removeSharedChild(childID, childName) {
    handleCloseRemovePopup();
    setLoader((prevState) => ({ ...prevState, init: true }));
    actor?.removeSharedAccess(childID).then((response) => {
      if (response?.ok) {
        toast({
          title: "Child removed",
          description: `${childName} has been removed from your list`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        getChildren({ callService: true });
      } else {
        toast({
          title: "Error",
          description: "Failed to remove child",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        setLoader((prevState) => ({ ...prevState, init: false }));
      }
    });
  }

  function revokeShares(childID, childName) {
    handleCloseRevokePopup();
    setLoader((prevState) => ({ ...prevState, init: true }));
    actor?.revokeAllShares(childID).then((response) => {
      if (response?.ok) {
        toast({
          title: "Shares revoked",
          description: `All shares for ${childName} have been removed`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        getChildren({ callService: true });
      } else {
        toast({
          title: "Error",
          description: "Failed to revoke shares",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        setLoader((prevState) => ({ ...prevState, init: false }));
      }
    });
  }

  const handleSubmit = async (childName) => {
    if (childName) {
      handleToggleAddChildPopup();
      const child_object = { name: childName };
      
      // Optimistically add child to UI immediately
      const tempChild = {
        ...child_object,
        id: children?.length ? children[children.length - 1].id + 1 : 0,
        balance: 0,
        hasGoal: false,
        isLocal: true, // Flag to indicate this is temporary
      };
      
      setChildren((prevState) => {
        const newChildren = [...(prevState || []), tempChild];
        return newChildren;
      });
      
      setLoader((prevState) => ({ ...prevState, singles: true }));
      
      let me = await actor.whoami();
      actor?.addChild(child_object).then((returnedAddChild) => {
        if ("ok" in returnedAddChild) {
          updateChildList(returnedAddChild);
        } else {
          console.error(returnedAddChild.err);
          // Revert optimistic update on error
          setChildren((prevState) => 
            prevState.filter(child => child.id !== tempChild.id)
          );
          setLoader((prevState) => ({ ...prevState, singles: false }));
        }
      }).catch((error) => {
        console.error(error);
        // Revert optimistic update on error
        setChildren((prevState) => 
          prevState.filter(child => child.id !== tempChild.id)
        );
        setLoader((prevState) => ({ ...prevState, singles: false }));
      });
    }
  };

  const handleAcceptShare = async (code) => {
    handleToggleAddChildPopup();
    setLoader((prevState) => ({ ...prevState, init: true }));
    
    actor?.acceptShareCode(code).then((response) => {
      if (response?.ok) {
        toast({
          title: "Child added!",
          description: `${response.ok.name} has been shared with you`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        getChildren({ callService: true });
      } else {
        const errorMsg = response?.err?.NotFound 
          ? "Invalid or expired code" 
          : "Failed to add child";
        toast({
          title: "Error",
          description: errorMsg,
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        setLoader((prevState) => ({ ...prevState, init: false }));
      }
    }).catch((error) => {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to accept share code",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      setLoader((prevState) => ({ ...prevState, init: false }));
    });
  };

  // trailingActions removed

  const displayedChildren = React.useMemo(() => {
    if (!children) return [];
    return showAll ? children : children.slice(0, ITEM_LIMIT);
  }, [children, showAll]);

  const ChildrenList = React.useMemo(() => {
    return (
      <>
        {children?.length ? (
          <>
            <div className="example">
              <ul className="list-wrapper">
                {displayedChildren.length > 0 &&
                  displayedChildren.map((child, index) => (
                    <li key={child.id} style={{ listStyle: "none" }}>
                      <ChildItem
                        child={child}
                        handleUpdateOpenItemId={setOpenItemId}
                        openItemId={openItemId}
                        index={index}
                        handleTogglePopup={handleTogglePopup}
                      />
                    </li>
                  ))}
              </ul>
            </div>
            {children.length > ITEM_LIMIT && !showAll && (
              <Box textAlign="center" marginTop={4} marginBottom={2}>
                <Text
                  as="button"
                  textStyle="largeLightDark"
                  color="#00A4D7"
                  cursor="pointer"
                  onClick={() => setShowAll(true)}
                  textDecoration="underline"
                >
                  See all children ({children.length} total)
                </Text>
              </Box>
            )}
          </>
        ) : (
          // Empty state with V1 upgrade instructions
          <Box p={6} textAlign="center" color="white">
            <VStack spacing={4}>
              <EmptyStateMessage>
                {"How do you Doo? <br /> Tap the + icon to add a child."}
              </EmptyStateMessage>
              <Box my={4} width="100px" height="1px" bg="whiteAlpha.400" />
              <VStack spacing={3}>
                <Text fontSize="sm" color="blue.700">
                  Already added children but they're not displaying?
                </Text>
                <Text fontSize="sm" color="blue.700" maxWidth="280px">
                  Upgrade from DooCoins V1 to transfer your data, log in to V1, then return here.
                </Text>
                <Button
                  as="a"
                  href="https://fube5-gqaaa-aaaah-qdbfa-cai.icp0.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    logout();
                  }}
                  variant="outline"
                  size="sm"
                  colorScheme="blue"
                  color="blue.600"
                  borderColor="blue.400"
                  _hover={{
                    borderColor: "blue.500",
                    color: "blue.700",
                    bg: "blue.50"
                  }}
                >
                  Go to V1 to upgrade
                </Button>
              </VStack>
            </VStack>
          </Box>
        )}
      </>
    );
  }, [displayedChildren, children, showAll]);

  // Children Tab Content Component
  const ChildrenTabContent = () => (
    <>
      <div className={`child-list-wrapper`} style={{ position: "relative" }}>
        <h2 style={{ marginBottom: "20px" }} className="title-button">
          <Text as="span" textStyle="smallHeavyDark">Children</Text>
          <span
            role="button"
            onClick={handleToggleAddChildPopup}
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
        <>{ChildrenList}</>
      )}
      {loader.singles && (
        <Stack margin={"0 20px 20px 20px"}>
          <Skeleton height="20px" mt={"12px"} />
        </Stack>
      )}
    </>
  );

  // Requests Tab Content Component
  const RequestsTabContent = () => {
    const RequestItem = ({ request, type, onApprove, onDecline }) => (
      <Box 
        backgroundColor="white"
        padding={4}
        borderRadius="md"
        marginBottom={3}
        boxShadow="sm"
      >
        <VStack align="stretch" spacing={2}>
          <Text textStyle="largeLightDark">{request.name}</Text>
          <HStack justify="space-between">
            <Text textStyle="smallLightDark">{request.childName}</Text>
            <Text textStyle="smallLightDark">{request.value} DooCoins</Text>
          </HStack>
          <HStack spacing={2} marginTop={2}>
            <button
              className={modelStyles.popup_edit_action_btn}
              onClick={onApprove}
              style={{ flex: 1, margin: 0 }}
            >
              Approve
            </button>
            <p
              role="button"
              className={modelStyles.popup_cancel_action_btn}
              onClick={onDecline}
              style={{ 
                flex: 1, 
                textAlign: "center", 
                margin: 0,
                border: "1px solid #00A4D7",
                borderRadius: "8px",
                padding: "12px 8px"
              }}
            >
              Decline
            </p>
          </HStack>
        </VStack>
      </Box>
    );

    const approveRequest = async ({ task, reward }) => {
      try {
        if (task) {
          let dateNum = Math.floor(Date.now() / 1000);
          let date = dateNum.toString();
          await actor.approveTask(task.childId, parseInt(task.taskId), date);
          // Remove the task request after approval
          await actor.removeTaskReq(task.childId, task.id);
          toast({
            title: `Keep up the good work, ${task.childName}.`,
            status: "success",
            duration: 4000,
            isClosable: true,
          });
        } else if (reward) {
          let dateNum = Math.floor(Date.now() / 1000);
          let date = dateNum.toString();
          const targetChildId = reward.childId;
          await actor.claimGoal(targetChildId, parseInt(reward.id), date);
          await actor?.currentGoal(targetChildId, 0);
          // Remove the reward request after claiming
          await actor.removeRewardReq(reward.childId, reward.strId);
          toast({
            title: `Yay - well deserved, ${reward.childName}.`,
            status: "success",
            duration: 4000,
            isClosable: true,
          });
        }
        getAllChildrenAlerts();
        getChildren({ callService: true });
      } catch (error) {
        console.error('Approval error:', error);
        toast({
          title: "An error occurred.",
          description: `Apologies, please try again later.`,
          status: "error",
          duration: 4000,
          isClosable: true,
        });
      }
    };

    const rejectRequest = async ({ task, reward }) => {
      try {
        if (task) {
          await actor.removeTaskReq(task.childId, task.id);
        } else if (reward) {
          await actor.removeRewardReq(reward.childId, reward.strId);
        }
        getAllChildrenAlerts();
        getChildren({ callService: true });
      } catch (error) {
        console.error('Rejection error:', error);
        toast({
          title: "An error occurred.",
          description: `Apologies, please try again later.`,
          status: "error",
          duration: 4000,
          isClosable: true,
        });
      }
    };

    return (
      <div className={`child-list-wrapper`} style={{ position: "relative" }}>
        <h2 style={{ marginBottom: "20px" }} className="title-button">
          <Text as="span" textStyle="smallHeavyDark">Pending Requests</Text>
        </h2>
        {alertsLoading ? (
          <Stack>
            <Skeleton height="80px" />
            <Skeleton height="80px" />
            <Skeleton height="80px" />
          </Stack>
        ) : alertsList.rewards?.length || alertsList.tasks?.length ? (
          <>
            {alertsList.rewards?.map((reward) => (
              <RequestItem
                key={reward.id}
                request={{
                  ...reward,
                  value: parseInt(reward.value),
                  id: parseInt(reward.reward || reward.id),
                  strId: reward.id,
                }}
                type="reward"
                onApprove={() => approveRequest({ 
                  reward: {
                    ...reward,
                    value: parseInt(reward.value),
                    id: parseInt(reward.reward || reward.id),
                    strId: reward.id,
                  }
                })}
                onDecline={() => rejectRequest({ 
                  reward: {
                    ...reward,
                    value: parseInt(reward.value),
                    id: parseInt(reward.reward || reward.id),
                    strId: reward.id,
                  }
                })}
              />
            ))}
            {alertsList.tasks?.map((task) => (
              <RequestItem
                key={task.id}
                request={{ ...task, value: parseInt(task.value) }}
                type="task"
                onApprove={() => approveRequest({ task: { ...task, value: parseInt(task.value) }})}
                onDecline={() => rejectRequest({ task: { ...task, value: parseInt(task.value) }})}
              />
            ))}
          </>
        ) : (
          <EmptyStateMessage>
            There are no pending requests.
          </EmptyStateMessage>
        )}
      </div>
    );
  };

  // Purchases Tab Content Component
  const PurchasesTabContent = () => (
    <Box padding={4} textAlign="center" py={12}>
      <VStack spacing={4}>
        <Text textStyle="largeHeavyDark" color="#666">Coming Soon</Text>
        <Text textStyle="smallLight" color="#999" maxWidth="300px">
          In-app purchases and premium features will be available here.
        </Text>
      </VStack>
    </Box>
  );

  return (
    <>
      {showPopup.add_child && (
        <AddChildDialog
          handleClosePopup={handleToggleAddChildPopup}
          handleSubmit={handleSubmit}
          handleAcceptShare={handleAcceptShare}
        />
      )}
      {showPopup.delete && (
        <DeleteDialog
          handleCloseDeletePopup={handleCloseDeletePopup}
          selectedItem={selectedChild}
          handleDelete={deleteChild}
        />
      )}
      {showPopup.edit && (
        <EditDialog
          handleCloseEditPopup={handleCloseEditPopup}
          selectedItem={selectedChild}
          handleSubmitForm={updateChild}
          hasValueField={false}
          namePlaceholder="Child Name"
        />
      )}
      {showPopup.revoke && (
        <DeleteDialog
          handleCloseDeletePopup={handleCloseRevokePopup}
          selectedItem={selectedChild}
          handleDelete={revokeShares}
          title="Revoke all shares?"
          message={`This will remove access to ${selectedChild?.name} for all other adults. Only you will be able to see and manage this child.`}
          confirmText="Revoke"
        />
      )}
      {showPopup.remove && (
        <DeleteDialog
          handleCloseDeletePopup={handleCloseRemovePopup}
          selectedItem={selectedChild}
          handleDelete={removeSharedChild}
          title="Remove child?"
          message={`This will remove ${selectedChild?.name} from your child list. The child will still exist in the creator's account.`}
          confirmText="Remove"
        />
      )}
      <div
        style={{ background: "#DFF3FF" }}
      >
        {/* Hero Section - Full width with centered container */}
        <Box 
          backgroundColor="#0B334D"
          width="100vw"
          position="relative"
          left="50%"
          right="50%"
          marginLeft="-50vw"
          marginRight="-50vw"
          paddingY={4}
        >
          <Box 
            className="container"
            margin="0 auto"
            paddingX={4}
          >
            <Text 
              textStyle="largeHeavyWhite"
            >
              Doo Dashboard
            </Text>
            <Text 
              textStyle="smallLightWhite"
              marginTop={1}
            >
              Manage your children's accounts
            </Text>

            {/* Tab Buttons */}
            <Box 
              display="grid"
              gridTemplateColumns="repeat(3, 1fr)"
              gap={4}
              marginTop={4}
            >
              {/* Tab 1 - Children */}
              <Box 
                backgroundColor="#2C4F64"
                padding={4}
                borderRadius="md"
                cursor="pointer"
                borderTop={activeTab === "children" ? "4px solid #00A4D7" : "4px solid transparent"}
                _hover={{ backgroundColor: "#3A5F78" }}
                transition="all 0.2s"
                onClick={() => setActiveTab("children")}
              >
                <Text 
                  textStyle="largeHeavyWhite"
                >
                  {children?.length || 0}
                </Text>
                <Text 
                  textStyle="smallLightWhite"
                  marginTop={1}
                >
                  Children
                </Text>
              </Box>

              {/* Tab 2 - Requests */}
              <Box 
                backgroundColor="#2C4F64"
                padding={4}
                borderRadius="md"
                cursor="pointer"
                borderTop={activeTab === "requests" ? "4px solid #00A4D7" : "4px solid transparent"}
                _hover={{ backgroundColor: "#3A5F78" }}
                transition="all 0.2s"
                onClick={() => setActiveTab("requests")}
              >
                <Text 
                  textStyle="largeHeavyWhite"
                >
                  {children?.reduce((sum, child) => sum + (child.pendingRequests || 0), 0) || 0}
                </Text>
                <Text 
                  textStyle="smallLightWhite"
                  marginTop={1}
                >
                  Requests
                </Text>
              </Box>

              {/* Tab 3 - Purchases */}
              <Box 
                backgroundColor="#2C4F64"
                padding={4}
                borderRadius="md"
                cursor="pointer"
                borderTop={activeTab === "purchases" ? "4px solid #00A4D7" : "4px solid transparent"}
                _hover={{ backgroundColor: "#3A5F78" }}
                transition="all 0.2s"
                onClick={() => setActiveTab("purchases")}
              >
                <Text 
                  textStyle="largeHeavyWhite"
                >
                  0
                </Text>
                <Text 
                  textStyle="smallLightWhite"
                  marginTop={1}
                >
                  Purchases
                </Text>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Tab Content Area */}
        {activeTab === "children" && <ChildrenTabContent />}
        {activeTab === "requests" && <RequestsTabContent />}
        {activeTab === "purchases" && <PurchasesTabContent />}
      </div>
    </>
  );
}

export default ChildList;
