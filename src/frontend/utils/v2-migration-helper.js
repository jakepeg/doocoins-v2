/**
 * V2 Migration Helper - Use this in your V2 frontend to handle migration
 */

import MigrationStorage from './migration-storage.js';

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
        localStorage.removeItem('pendingMigration');
        return null;
      }

      return {
        shouldMigrate: true,
        nfidPrincipal: data.nfidPrincipal
      };
    } catch (error) {
      console.error('[migration] Error reading pending migration:', error);
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
      return { success: false, reason: 'No migration data found' };
    }

    if (!actor || !iiPrincipal) {
      return { success: false, reason: 'Authentication not ready' };
    }

    const { nfidPrincipal } = migrationData;

    try {
      // Call your existing backend migration function
      const result = await actor.linkPrincipals(
        { fromText: nfidPrincipal }, 
        iiPrincipal
      );
      
      if ('ok' in result) {
        // Migration successful - use new cross-platform storage
        MigrationStorage.markComplete(nfidPrincipal);
        
        // Clear pending migration and URL parameters
        this.clearPendingMigration();
        this.cleanUrlParameters();
        
        return { success: true, nfidPrincipal };
      } else {
        // Backend returned error
        return { success: false, reason: result.err, nfidPrincipal };
      }
      
    } catch (error) {
      console.error('[migration] Failed:', error);
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

  // Check if user has already migrated (uses new cross-platform storage)
  isMigrationCompleted() {
    return MigrationStorage.isComplete();
  },

  // Get migration info for debugging
  getMigrationInfo() {
    return {
      ...MigrationStorage.getInfo(),
      currentUrlParams: this.extractMigrationDataFromUrl(),
      pendingMigration: this.getPendingMigration()
    };
  }
};

// Make available globally in V2 for easy access
if (typeof window !== 'undefined') {
  window.V2MigrationHelper = V2MigrationHelper;
}

export default V2MigrationHelper;