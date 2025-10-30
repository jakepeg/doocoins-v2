import * as React from "react";
import { get, set } from "idb-keyval";
import LoadingSpinner from "../components/LoadingSpinner";
import dc from "../assets/images/dc.svg";
import { useAuth } from "../use-auth-client";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, Skeleton, Stack } from "@chakra-ui/react";
import { ChildContext } from "../contexts/ChildContext";
import EmptyStateMessage from "../components/EmptyStateMessage";

const Wallet = () => {
  const { actor } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const {
    child,
    setChild,
    blockingChildUpdate,
    transactions,
    setTransactions
  } = React.useContext(ChildContext);
  const [isLoading, setIsLoading] = React.useState({
    transactions: false,
    child: !child ? true : false,
  });

  React.useEffect(() => {
    if (child) {
      setIsLoading((prevState) => ({
        ...prevState,
        child: false,
      }));
    }
  }, [child]);

  const humanReadableDate = (timestamp) => {
    const date = new Date(timestamp * 1000); // Convert timestamp to milliseconds
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(date);
  };

  React.useEffect(() => {
    if (!blockingChildUpdate) {
      get("selectedChild")
        .then(async (data) => {
          const [balance, name] = await Promise.all([
            get(`balance-${data}`),
            get(`selectedChildName`),
          ]);
          if (data) {
            // setChild({
            //   id: data,
            //   balance: parseInt(balance),
            //   name,
            // });
          } else {
            navigate("/");
          }
        })
        .finally(() =>
          setIsLoading((prevState) => ({ ...prevState, child: false }))
        );
    }
  }, []);

  function getTransactions({ callService = false }) {
    if (child) {
      get("transactionList").then(async (val) => {
        if (val == undefined || callService) {
          setIsLoading((prevState) => ({ ...prevState, transactions: true }));
          actor
            ?.getTransactions(child.id)
            .then((returnedTransactions) => {
              if ("ok" in returnedTransactions) {
                const transactions = Object.values(returnedTransactions);
                if (transactions.length) {
                  set("transactionList", transactions[0]);
                  setTransactions(transactions?.[0]);
                }
                setIsLoading((prevState) => ({
                  ...prevState,
                  transactions: false,
                }));
              } else {
                console.error(returnedTransactions.err);
                set("transactionList", undefined);
              }
            })
            .finally(() =>
              setIsLoading((prevState) => ({
                ...prevState,
                transactions: false,
              }))
            );
        } else {
          setTransactions(
            val?.map((transaction) => {
              return {
                ...transaction,
                id: parseInt(transaction.id),
                value: parseInt(transaction.value),
              };
            })
          );
          setIsLoading((prevState) => ({
            ...prevState,
            transactions: false,
          }));
        }
      });
      return false;
    }
  }

  React.useEffect(() => {
    if (child) getTransactions(child);
  }, [actor, child]);

  const sortTransactionsByDate = React.useCallback(() => {
    transactions.sort((a, b) => {
      const dateA = new Date(parseInt(a.completedDate) * 1000);
      const dateB = new Date(parseInt(b.completedDate) * 1000);
      return dateB - dateA;
    });

    return transactions;
  }, [transactions]);

  if (isLoading.child) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <div className="light-panel transactions">
        <h2 className="title-button dark">
          <span className="transaction-tile">Recent Activity</span>
        </h2>
        {isLoading.transactions ? (
          <Stack gap={"20px"} margin={"0 0 20px 0"}>
            {[1,2,3].map((i) => (
              <Box key={i} backgroundColor="white" borderRadius="md" padding={4} marginBottom={3} display="flex" justifyContent="space-between" alignItems="center" width="100%" boxSizing="border-box">
                <Skeleton height="20px" width={"15%"} />
                <Skeleton height="20px" />
              </Box>
            ))}
          </Stack>
        ) : (
          <>
            {transactions.length > 0 ? (
              <>
                {sortTransactionsByDate().map((transaction) => (
                  <Box
                    backgroundColor="white"
                    borderRadius="md"
                    padding={4}
                    marginBottom={3}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    width="100%"
                    boxSizing="border-box"
                    role="button"
                    key={parseInt(transaction.id)}
                  >
                    <Box>
                      <span style={{ fontSize: '22px', color: '#0B334D', fontWeight: 600 }}>
                        {transaction.name}
                      </span>
                      <span className="date">
                        {humanReadableDate(transaction.completedDate)}
                      </span>
                    </Box>
                    <Box display="flex" alignItems="center" gap={2}>
                      {transaction.transactionType === `GOAL_DEBIT` ? (
                        <span style={{ color: '#E53E3E', fontWeight: 600, fontSize: '22px' }}>-</span>
                      ) : null}
                      <img
                        src={dc}
                        alt="DooCoins symbol"
                        style={{ width: 20, height: 20, marginRight: -8, marginTop: -3, verticalAlign: 'middle' }}
                      />
                      <span style={{ fontWeight: 600, fontSize: '22px', color: '#0B334D' }}>{parseInt(transaction.value)}</span>
                    </Box>
                  </Box>
                ))}
              </>
            ) : (
              <EmptyStateMessage>
                {`No transactions yet. <br /> Get busy and start earning, ${child?.name}!`}
              </EmptyStateMessage>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default Wallet;
