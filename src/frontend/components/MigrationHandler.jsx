import React, { useEffect, useState } from 'react';
import { useAuth } from '../use-auth-client';
import { Principal } from '@dfinity/principal';
import V2MigrationHelper from '../utils/v2-migration-helper';
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
  useToast,
} from '@chakra-ui/react';

// Create a context for migration functions that child components can use
export const MigrationContext = React.createContext();

export const MigrationHandler = ({ children }) => {
  const { actor, identity, isAuthenticated, isLoading } = useAuth();
  const [migrationState, setMigrationState] = useState('none'); // Start as 'none' instead of 'checking'
  const [migrationError, setMigrationError] = useState(null);
  const [progress, setProgress] = useState('');
  // Manual migration removed - users should go to V1 to upgrade
  const toast = useToast();

  useEffect(() => {
    console.log('MigrationHandler useEffect triggered. Auth state:', {
      isAuthenticated, 
      hasActor: !!actor, 
      hasIdentity: !!identity, 
      isLoading
    });

    const handleMigration = async () => {
      // If not authenticated yet, check if there are pending migration parameters
      if (!isAuthenticated || !actor || !identity || isLoading) {
        // Check for pending migration to inform the UI, but don't show migration screen yet
        const pendingMigration = V2MigrationHelper.getPendingMigration();
        if (pendingMigration && pendingMigration.shouldMigrate) {
          console.log('Pending migration detected, waiting for authentication');
          // Stay in 'none' state but let the app show normal login flow
        } else {
          console.log('No pending migration found');
        }
        return;
      }

      try {
        // Now that user is authenticated, start the migration check
        console.log('User authenticated, starting migration processing');
        setMigrationState('checking');
        setProgress('Checking migration status...');
        
        // First check if migration already completed
        const migrationStatus = await actor.getMigrationStatus();
        console.log('Migration status from backend:', migrationStatus);
        console.log('Migration status isLinked:', migrationStatus.isLinked);
        
        if (migrationStatus.isLinked) {
          // Already migrated, proceed normally
          console.log('Migration already completed - proceeding normally');
          setMigrationState('completed');
          return;
        } else {
          console.log('Migration not completed yet - checking for pending migration');
        }

        // Check for migration (URL parameters or pending from localStorage)
        let migrationData = V2MigrationHelper.extractMigrationDataFromUrl();
        console.log('URL migration data:', migrationData);
        
        // If no URL parameters, check for pending migration
        if (!migrationData.shouldMigrate) {
          migrationData = V2MigrationHelper.getPendingMigration();
          console.log('Pending migration data:', migrationData);
        }
        
        if (migrationData && migrationData.shouldMigrate && migrationData.nfidPrincipal) {
          console.log('Migration detected for NFID:', migrationData.nfidPrincipal);
          
          // Validate NFID principal format
          let validatedNfidPrincipal;
          try {
            validatedNfidPrincipal = Principal.fromText(migrationData.nfidPrincipal);
          } catch (error) {
            console.error('Invalid NFID principal:', migrationData.nfidPrincipal);
            V2MigrationHelper.clearPendingMigration();
            V2MigrationHelper.cleanUrlParameters();
            setMigrationState('none');
            return;
          }

          // Perform automatic migration
          setMigrationState('migrating');
          setProgress('Migrating your data from NFID to Internet Identity...');
          
          const result = await actor.linkPrincipals(validatedNfidPrincipal, identity.getPrincipal());
          
          if ('ok' in result) {
            // Success - mark complete and clean up
            localStorage.setItem('migrationCompleted', Date.now().toString());
            localStorage.setItem('migratedFromNfid', migrationData.nfidPrincipal);
            V2MigrationHelper.clearPendingMigration();
            V2MigrationHelper.cleanUrlParameters();
            
            setProgress('Migration successful! Loading your data...');
            setMigrationState('completed');
            
            toast({
              title: "Migration Successful!",
              description: "Your data has been transferred from NFID to Internet Identity.",
              status: "success",
              duration: 5000,
              isClosable: true,
            });
          } else {
            // Handle migration errors
            const errorMsg = result.err;
            console.error('Migration failed:', errorMsg);
            
            if (errorMsg.includes('already linked') || errorMsg.includes('AlreadyLinked')) {
              // Already migrated - this is okay
              setMigrationState('completed');
              V2MigrationHelper.clearPendingMigration();
              V2MigrationHelper.cleanUrlParameters();
              
              toast({
                title: "Already Migrated",
                description: "Your NFID account was already linked to this Internet Identity.",
                status: "info",
                duration: 5000,
                isClosable: true,
              });
            } else {
              // Real error
              setMigrationError(errorMsg);
              setMigrationState('error');
              V2MigrationHelper.clearPendingMigration();
              V2MigrationHelper.cleanUrlParameters();
            }
          }
          return;
        } else {
          // No migration detected
          console.log('No migration detected. migrationData:', migrationData);
          console.log('localStorage pendingMigration:', localStorage.getItem('pendingMigration'));
        }

        // No URL migration - check legacy localStorage migration
        const storedNfidPrincipal = localStorage.getItem('nfidPrincipal');
        const needsMigration = localStorage.getItem('needsMigration');
        
        if (storedNfidPrincipal && needsMigration) {
          // Legacy localStorage migration (fallback)
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

          setMigrationState('migrating');
          setProgress('Linking your Internet Identity to existing data...');
          
          const result = await actor.linkPrincipals(nfidPrincipal, identity.getPrincipal());
          
          if ('ok' in result) {
            localStorage.removeItem('nfidPrincipal');
            localStorage.removeItem('needsMigration');
            localStorage.setItem('migrationCompleted', Date.now().toString());
            
            setMigrationState('completed');
            toast({
              title: "Migration Successful!",
              description: "Your data has been linked to Internet Identity.",
              status: "success",
              duration: 5000,
              isClosable: true,
            });
          } else {
            const errorMsg = result.err;
            if (errorMsg.includes('already linked')) {
              localStorage.removeItem('nfidPrincipal');
              localStorage.removeItem('needsMigration');
              setMigrationState('completed');
            } else {
              setMigrationError(errorMsg);
              setMigrationState('error');
            }
          }
          return;
        }

        // No migration needed - let app handle it contextually
        setMigrationState('none');
        
      } catch (error) {
        console.error('Migration error:', error);
        setMigrationError(error.message || 'Unknown migration error');
        setMigrationState('error');
      }
    };

    handleMigration();
  }, [isAuthenticated, actor, identity, isLoading, toast]);

  // Manual migration removed - users go to V1 frontend to upgrade

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

  // Migration complete or not needed - show main app 
  // No manual migration needed - users go to V1 to upgrade
  const migrationContextValue = {
    // Context simplified since manual migration is removed
  };

  return (
    <MigrationContext.Provider value={migrationContextValue}>
      {children}
      {/* Manual migration modal removed - users directed to V1 frontend to upgrade */}
    </MigrationContext.Provider>
  );
};