import React, { useEffect, useState } from 'react';
import { useAuth } from '../use-auth-client';
import { Principal } from '@dfinity/principal';
import V2MigrationHelper from '../utils/v2-migration-helper';
import MigrationStorage from '../utils/migration-storage';
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
  const [migrationState, setMigrationState] = useState('idle'); // 'idle' | 'migrating' | 'completed' | 'error'
  const [migrationError, setMigrationError] = useState(null);
  const [progress, setProgress] = useState('');
  const toast = useToast();

  useEffect(() => {
    const handleMigration = async () => {
      // Wait for authentication to complete
      if (!isAuthenticated || !actor || !identity || isLoading) {
        return;
      }

      // OPTIMIZATION 1: Check persistent flag FIRST (no backend call needed)
      if (MigrationStorage.isComplete()) {
        // Migration already done - skip everything and proceed
        setMigrationState('completed');
        return;
      }

      // OPTIMIZATION 2: Quick check for any migration signals before backend call
      const urlData = V2MigrationHelper.extractMigrationDataFromUrl();
      const pendingData = V2MigrationHelper.getPendingMigration();
      const hasLegacyData = localStorage.getItem('nfidPrincipal') && localStorage.getItem('needsMigration');
      
      // If no migration signals at all, skip backend check and proceed
      if (!urlData.shouldMigrate && !pendingData && !hasLegacyData) {
        setMigrationState('completed');
        return;
      }

      // OPTIMIZATION 3: Only call backend if we have migration signals
      try {
        // Check backend migration status
        const migrationStatus = await actor.getMigrationStatus();
        
        if (migrationStatus.isLinked) {
          // Already migrated in backend - update local flag and proceed
          if (migrationStatus.nfidPrincipal && migrationStatus.nfidPrincipal.length > 0) {
            MigrationStorage.markComplete(migrationStatus.nfidPrincipal[0]);
          }
          setMigrationState('completed');
          return;
        }

        // Process pending migration
        let migrationData = urlData.shouldMigrate ? urlData : pendingData;
        
        if (migrationData && migrationData.shouldMigrate && migrationData.nfidPrincipal) {
          // Validate NFID principal format
          let validatedNfidPrincipal;
          try {
            validatedNfidPrincipal = Principal.fromText(migrationData.nfidPrincipal);
          } catch (error) {
            console.error('[migration] Invalid NFID principal:', migrationData.nfidPrincipal);
            V2MigrationHelper.clearPendingMigration();
            V2MigrationHelper.cleanUrlParameters();
            setMigrationState('completed');
            return;
          }

          // Perform automatic migration
          setMigrationState('migrating');
          setProgress('Migrating your data...');
          
          const result = await actor.linkPrincipals(validatedNfidPrincipal, identity.getPrincipal());
          
          if ('ok' in result) {
            // Success - mark complete and clean up
            MigrationStorage.markComplete(migrationData.nfidPrincipal);
            V2MigrationHelper.clearPendingMigration();
            V2MigrationHelper.cleanUrlParameters();
            
            setMigrationState('completed');
            
            toast({
              title: "Migration Successful!",
              description: "Your data has been transferred to Internet Identity.",
              status: "success",
              duration: 5000,
              isClosable: true,
            });
          } else {
            // Handle migration errors
            const errorMsg = result.err;
            
            if (errorMsg.includes('already linked') || errorMsg.includes('AlreadyLinked')) {
              // Already migrated - this is okay
              MigrationStorage.markComplete(migrationData.nfidPrincipal);
              setMigrationState('completed');
              V2MigrationHelper.clearPendingMigration();
              V2MigrationHelper.cleanUrlParameters();
            } else {
              // Real error
              setMigrationError(errorMsg);
              setMigrationState('error');
              V2MigrationHelper.clearPendingMigration();
              V2MigrationHelper.cleanUrlParameters();
            }
          }
          return;
        }

        // Legacy localStorage migration (fallback)
        if (hasLegacyData) {
          const storedNfidPrincipal = localStorage.getItem('nfidPrincipal');
          let nfidPrincipal;
          
          try {
            nfidPrincipal = Principal.fromText(storedNfidPrincipal);
          } catch (error) {
            console.error('[migration] Invalid legacy NFID principal:', storedNfidPrincipal);
            localStorage.removeItem('nfidPrincipal');
            localStorage.removeItem('needsMigration');
            setMigrationState('completed');
            return;
          }

          setMigrationState('migrating');
          setProgress('Linking your Internet Identity...');
          
          const result = await actor.linkPrincipals(nfidPrincipal, identity.getPrincipal());
          
          if ('ok' in result) {
            MigrationStorage.markComplete(storedNfidPrincipal);
            localStorage.removeItem('nfidPrincipal');
            localStorage.removeItem('needsMigration');
            
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
              MigrationStorage.markComplete(storedNfidPrincipal);
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

        // No migration needed
        setMigrationState('completed');
        
      } catch (error) {
        console.error('[migration] Error:', error);
        setMigrationError(error.message || 'Unknown migration error');
        setMigrationState('error');
      }
    };

    handleMigration();
  }, [isAuthenticated, actor, identity, isLoading, toast]);

  // OPTIMIZATION 4: Don't show spinner for auth loading when migration is complete
  // Only show migration-specific loading states
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
              <AlertTitle fontSize="sm">Please wait</AlertTitle>
              <AlertDescription fontSize="sm">
                Your data is being securely transferred. Don't close this window.
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
                setMigrationState('idle');
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
                V2MigrationHelper.clearPendingMigration();
                setMigrationState('completed');
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

  // Migration complete or not needed - show main app immediately
  // No context needed since manual migration is removed
  return <>{children}</>;
};