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
  });
  const [selectedChild, setSelectedChild] = React.useState(null);
  const [loader, setLoader] = React.useState({ init: true, singles: false });
  const [showAll, setShowAll] = React.useState(false);
  const ITEM_LIMIT = 20;

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
                  const balance = await getBalance(child.id);
                  const currentGoal = await actor?.getCurrentGoal(child.id);
                  return {
                    ...child,
                    balance: parseInt(balance),
                    hasGoal: parseInt(currentGoal) > 0,
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
            const balance = await getBalance(child.id);
            const currentGoal = await actor?.getCurrentGoal(child.id);
            return {
              ...child,
              balance: parseInt(balance),
              hasGoal: parseInt(currentGoal) > 0,
            };
          }),
        );
        setChildren(updatedChildrenData);
        setLoader((prevState) => ({ ...prevState, init: false }));
      }
    });
  }

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
      <div
        className={`${
          showPopup.delete || showPopup.edit || showPopup.add_child || showPopup.revoke
            ? modelStyles.blur_background
            : undefined
        }`}
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

            {/* Dashboard Boxes */}
            <Box 
              display="grid"
              gridTemplateColumns="repeat(3, 1fr)"
              gap={4}
              marginTop={4}
            >
              {/* Box 1 - Children */}
              <Box 
                backgroundColor="#2C4F64"
                padding={4}
                borderRadius="md"
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

              {/* Box 2 - Total DooCoins */}
              <Box 
                backgroundColor="#2C4F64"
                padding={4}
                borderRadius="md"
              >
                <Text 
                  textStyle="largeHeavyWhite"
                >
                  {children?.reduce((total, child) => total + (child.balance || 0), 0) || 0}
                </Text>
                <Text 
                  textStyle="smallLightWhite"
                  marginTop={1}
                >
                  Total DooCoins
                </Text>
              </Box>

              {/* Box 3 - Active Goals */}
              <Box 
                backgroundColor="#2C4F64"
                padding={4}
                borderRadius="md"
              >
                <Text 
                  textStyle="largeHeavyWhite"
                >
                  {children?.filter(child => child.hasGoal).length || 0}
                </Text>
                <Text 
                  textStyle="smallLightWhite"
                  marginTop={1}
                >
                  Active Goals
                </Text>
              </Box>
            </Box>
          </Box>
        </Box>

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
      </div>
    </>
  );
}

export default ChildList;
