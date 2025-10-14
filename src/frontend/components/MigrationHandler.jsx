import React, { useEffect, useState } from 'react';
import { useAuth } from '../use-auth-client';
import { Principal } from '@dfinity/principal';
import {
  Box,
  Text,
  Button,
  VStack,
  HStack,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
  Input,
  FormControl,
  FormLabel,
  FormHelperText,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
} from '@chakra-ui/react';

// Create a context for migration functions that child components can use
export const MigrationContext = React.createContext();

export const MigrationHandler = ({ children }) => {
  const { actor, identity, isAuthenticated, isLoading } = useAuth();
  const [migrationState, setMigrationState] = useState('checking');
  const [migrationError, setMigrationError] = useState(null);
  const [progress, setProgress] = useState('');
  const [showManualMigration, setShowManualMigration] = useState(false);
  const [manualNfidPrincipal, setManualNfidPrincipal] = useState('');
  const toast = useToast();

  useEffect(() => {
    const handleMigration = async () => {
      if (!isAuthenticated || !actor || !identity || isLoading) return;

      try {
        setProgress('Checking migration status...');
        
        // First check if migration already completed
        const migrationStatus = await actor.getMigrationStatus();
        
        if (migrationStatus.isLinked) {
          // Already migrated, proceed normally
          setMigrationState('completed');
          return;
        }

        // Check for stored NFID principal from V1 (automatic migration)
        const storedNfidPrincipal = localStorage.getItem('nfidPrincipal');
        const needsMigration = localStorage.getItem('needsMigration');
        
        if (!storedNfidPrincipal || !needsMigration) {
          // No automatic migration needed - let app handle it contextually
          setMigrationState('none');
          return;
        }

        // Validate stored principal format
        let nfidPrincipal;
        try {
          nfidPrincipal = Principal.fromText(storedNfidPrincipal);
        } catch (error) {
          console.error('Invalid NFID principal format:', storedNfidPrincipal);
          localStorage.removeItem('nfidPrincipal');
          localStorage.removeItem('needsMigration');
          setMigrationState('none');
          return;
        }

        // Perform automatic migration (only when coming from V1)
        setMigrationState('migrating');
        setProgress('Linking your Internet Identity to existing data...');
        
        const result = await actor.linkPrincipals(nfidPrincipal, identity.getPrincipal());
        
        if ('ok' in result) {
          // Success - clean up and mark complete
          localStorage.removeItem('nfidPrincipal');
          localStorage.removeItem('needsMigration');
          localStorage.setItem('migrationCompleted', Date.now().toString());
          
          setProgress('Migration successful! Loading your data...');
          setMigrationState('completed');
          
          toast({
            title: "Migration Successful!",
            description: "Your data has been linked to Internet Identity.",
            status: "success",
            duration: 5000,
            isClosable: true,
          });
        } else {
          // Handle specific error cases
          const errorMsg = result.err;
          if (errorMsg.includes('already linked')) {
            // Edge case: already linked, just clean up
            localStorage.removeItem('nfidPrincipal');
            localStorage.removeItem('needsMigration');
            setMigrationState('completed');
          } else {
            setMigrationError(errorMsg);
            setMigrationState('error');
          }
        }
        
      } catch (error) {
        console.error('Migration error:', error);
        setMigrationError(error.message || 'Unknown migration error');
        setMigrationState('error');
      }
    };

    handleMigration();
  }, [isAuthenticated, actor, identity, isLoading, toast]);

  const openMigrationModal = () => {
    setShowManualMigration(true);
  };

  const handleManualMigration = async () => {
    if (!actor || !identity || !manualNfidPrincipal.trim()) return;

    try {
      setMigrationState('migrating');
      setProgress('Linking your Internet Identity to existing NFID data...');
      
      const nfidPrincipal = Principal.fromText(manualNfidPrincipal.trim());
      const result = await actor.linkPrincipals(nfidPrincipal, identity.getPrincipal());
      
      if ('ok' in result) {
        localStorage.setItem('migrationCompleted', Date.now().toString());
        setMigrationState('completed');
        setShowManualMigration(false);
        
        toast({
          title: "Migration Successful!",
          description: "Your NFID data has been linked to Internet Identity.",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        
        // Refresh the page to reload data
        window.location.reload();
      } else {
        setMigrationError(result.err);
        setMigrationState('error');
      }
    } catch (error) {
      console.error('Manual migration error:', error);
      setMigrationError(error.message || 'Invalid principal format');
      setMigrationState('error');
    }
  };

  const dismissMigration = () => {
    setShowManualMigration(false);
    localStorage.setItem('dismissedMigration', 'true');
  };

  // Loading states
  if (isLoading || migrationState === 'checking') {
    return (
      <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" bg="gray.50">
        <VStack spacing={4}>
          <Spinner size="lg" color="blue.500" />
          <Text color="gray.600">
            {migrationState === 'checking' ? 'Checking for data migration...' : 'Loading...'}
          </Text>
        </VStack>
      </Box>
    );
  }

  if (migrationState === 'migrating') {
    return (
      <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" bg="gray.50">
        <VStack spacing={6} maxW="md" p={6}>
          <Spinner size="xl" color="blue.500" />
          <VStack spacing={2} textAlign="center">
            <Text fontSize="xl" fontWeight="semibold" color="gray.900">
              Migrating Your Data
            </Text>
            <Text color="gray.600">{progress}</Text>
          </VStack>
          <Alert status="info" borderRadius="md">
            <AlertIcon />
            <Box>
              <AlertTitle fontSize="sm">Please wait!</AlertTitle>
              <AlertDescription fontSize="sm">
                Your existing data is being securely transferred to Internet Identity.
                Please don't close this window.
              </AlertDescription>
            </Box>
          </Alert>
        </VStack>
      </Box>
    );
  }

  if (migrationState === 'error') {
    return (
      <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" bg="gray.50">
        <VStack spacing={6} maxW="md" p={6}>
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <Box>
              <AlertTitle>Migration Error</AlertTitle>
              <AlertDescription>{migrationError}</AlertDescription>
            </Box>
          </Alert>
          <HStack spacing={3}>
            <Button 
              colorScheme="red" 
              onClick={() => {
                setMigrationState('none');
                setMigrationError(null);
              }}
            >
              Try Again
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                localStorage.removeItem('nfidPrincipal');
                localStorage.removeItem('needsMigration');
                setMigrationState('none');
                setMigrationError(null);
              }}
            >
              Skip Migration
            </Button>
          </HStack>
        </VStack>
      </Box>
    );
  }

  // Migration complete or not needed - show main app with migration context
  const migrationContextValue = {
    openMigrationModal,
    canMigrate: isAuthenticated && actor && identity,
  };

  return (
    <MigrationContext.Provider value={migrationContextValue}>
      {children}
      
      {/* Manual Migration Modal */}
      <Modal 
        isOpen={showManualMigration} 
        onClose={dismissMigration}
        closeOnOverlayClick={false}
        size="md"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Transfer Your Data</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <Text color="gray.600" textAlign="center" mb={4}>
                If you previously used this app with NFID authentication, we can transfer your data to Internet Identity.
              </Text>
              
              <Alert status="warning" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle fontSize="sm">Migration Process:</AlertTitle>
                  <AlertDescription fontSize="sm">
                    We'll help you connect your NFID account to transfer your children and doocoins data.
                  </AlertDescription>
                </Box>
              </Alert>
              
              <VStack spacing={3} w="full">
                <Button
                  colorScheme="blue"
                  size="lg"
                  w="full"
                  onClick={() => {
                    // Open NFID in new tab for user to get their principal
                    window.open('https://nfid.one', '_blank');
                  }}
                >
                  1. Open NFID Wallet →
                </Button>
                
                <Text fontSize="sm" color="gray.600" textAlign="center">
                  Login to NFID, then copy your Principal ID and paste it below:
                </Text>
                
                <FormControl>
                  <Input
                    value={manualNfidPrincipal}
                    onChange={(e) => setManualNfidPrincipal(e.target.value)}
                    placeholder="Paste your NFID Principal ID here"
                    disabled={migrationState === 'migrating'}
                    size="lg"
                  />
                  <FormHelperText textAlign="center">
                    Your Principal ID looks like: abc12-def34-ghi56...
                  </FormHelperText>
                </FormControl>
              </VStack>

              <Box bg="gray.50" p={3} borderRadius="md" w="full">
                <Text fontSize="sm" color="gray.700" mb={1}>
                  <strong>New II Principal:</strong>
                </Text>
                <Text fontSize="xs" fontFamily="mono" wordBreak="break-all">
                  {identity?.getPrincipal().toString()}
                </Text>
              </Box>

              {migrationError && (
                <Alert status="error" borderRadius="md">
                  <AlertIcon />
                  <AlertDescription>{migrationError}</AlertDescription>
                </Alert>
              )}

              <HStack spacing={3} w="full">
                <Button
                  colorScheme="blue"
                  onClick={handleManualMigration}
                  isDisabled={!manualNfidPrincipal.trim() || migrationState === 'migrating'}
                  isLoading={migrationState === 'migrating'}
                  flex={1}
                >
                  Migrate Data
                </Button>
                
                <Button
                  variant="outline"
                  onClick={dismissMigration}
                  isDisabled={migrationState === 'migrating'}
                  flex={1}
                >
                  Cancel
                </Button>
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </MigrationContext.Provider>
  );
};