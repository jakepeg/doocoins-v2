/**
 * Migration Parameter Preserver
 * 
 * This utility runs early in the app lifecycle to detect and preserve
 * migration parameters before authentication redirects can clear them.
 */

import V2MigrationHelper from './v2-migration-helper';

export const preserveMigrationParameters = () => {
  // Extract migration data immediately when app loads
  // This will store parameters in localStorage if found
  const migrationData = V2MigrationHelper.extractMigrationDataFromUrl();
  
  if (migrationData.shouldMigrate) {
    console.log('Migration parameters detected and preserved for post-auth processing');
    return true;
  }
  
  return false;
};

// Auto-run when module is imported
preserveMigrationParameters();