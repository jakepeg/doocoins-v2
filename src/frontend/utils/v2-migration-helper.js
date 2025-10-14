/**
 * V2 Migration Helper - Use this in your V2 frontend to handle migration
 */

export const V2MigrationHelper = {
  // Extract migration data from URL parameters (sent from V1)
  extractMigrationDataFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const migrate = urlParams.get('migrate') === 'true';
    const nfidPrincipal = urlParams.get('nfid');
    
    const migrationData = {
      shouldMigrate: migrate && nfidPrincipal,
      nfidPrincipal: nfidPrincipal ? decodeURIComponent(nfidPrincipal) : null,
      rawParams: Object.fromEntries(urlParams)
    };

    // If migration parameters are detected, store them in localStorage 
    // to survive the authentication redirect flow
    if (migrationData.shouldMigrate) {
      console.log('Migration parameters detected, storing for post-auth processing:', migrationData.nfidPrincipal);
      localStorage.setItem('pendingMigration', JSON.stringify({
        nfidPrincipal: migrationData.nfidPrincipal,
        timestamp: Date.now()
      }));
      // Clean URL immediately to prevent confusion
      this.cleanUrlParameters();
    }
    
    return migrationData;
  },

  // Check for pending migration from localStorage (after authentication)
  getPendingMigration() {
    try {
      const stored = localStorage.getItem('pendingMigration');
      if (!stored) return null;

      const data = JSON.parse(stored);
      const now = Date.now();
      const maxAge = 10 * 60 * 1000; // 10 minutes

      // Check if migration data is too old
      if (now - data.timestamp > maxAge) {
        console.log('Pending migration expired, removing');
        localStorage.removeItem('pendingMigration');
        return null;
      }

      return {
        shouldMigrate: true,
        nfidPrincipal: data.nfidPrincipal
      };
    } catch (error) {
      console.error('Error reading pending migration:', error);
      localStorage.removeItem('pendingMigration');
      return null;
    }
  },

  // Clear pending migration after processing
  clearPendingMigration() {
    localStorage.removeItem('pendingMigration');
  },

  // Process migration in V2 frontend with actor integration
  async processMigration(actor, iiPrincipal) {
    // First check URL parameters (immediate migration)
    let migrationData = this.extractMigrationDataFromUrl();
    
    // If no URL parameters, check for pending migration from localStorage
    if (!migrationData.shouldMigrate) {
      migrationData = this.getPendingMigration();
    }
    
    if (!migrationData || !migrationData.shouldMigrate || !migrationData.nfidPrincipal) {
      console.log('No migration required');
      return { success: false, reason: 'No migration data found' };
    }

    if (!actor || !iiPrincipal) {
      console.log('Actor or II principal not available');
      return { success: false, reason: 'Authentication not ready' };
    }

    const { nfidPrincipal } = migrationData;
    console.log('Processing migration for NFID principal:', nfidPrincipal);

    try {
      // Call your existing backend migration function
      const result = await actor.linkPrincipals(
        { fromText: nfidPrincipal }, 
        iiPrincipal
      );
      
      if ('ok' in result) {
        // Migration successful
        localStorage.setItem('migrationCompleted', 'true');
        localStorage.setItem('migratedFromNfid', nfidPrincipal);
        localStorage.setItem('migrationDate', new Date().toISOString());
        
        // Clear pending migration and URL parameters
        this.clearPendingMigration();
        this.cleanUrlParameters();
        
        console.log('Migration completed successfully');
        return { success: true, nfidPrincipal };
      } else {
        // Backend returned error
        console.error('Backend migration failed:', result.err);
        return { success: false, reason: result.err, nfidPrincipal };
      }
      
    } catch (error) {
      console.error('Migration failed:', error);
      return { success: false, reason: error.message, nfidPrincipal };
    }
  },

  // Clean migration parameters from URL
  cleanUrlParameters() {
    const url = new URL(window.location);
    url.searchParams.delete('migrate');
    url.searchParams.delete('nfid');
    
    // Update URL without page reload
    window.history.replaceState({}, '', url.toString());
  },

  // Check if user has already migrated
  isMigrationCompleted() {
    return localStorage.getItem('migrationCompleted') === 'true';
  },

  // Get migration info for debugging
  getMigrationInfo() {
    return {
      migrationCompleted: this.isMigrationCompleted(),
      migratedFromNfid: localStorage.getItem('migratedFromNfid'),
      migrationDate: localStorage.getItem('migrationDate'),
      currentUrlParams: this.extractMigrationDataFromUrl()
    };
  }
};

// Make available globally in V2 for easy access
if (typeof window !== 'undefined') {
  window.V2MigrationHelper = V2MigrationHelper;
}

export default V2MigrationHelper;