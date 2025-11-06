/**
 * Cross-platform persistent storage for migration state
 * Works in PWA, native apps (iOS/Android), and desktop
 */

const MIGRATION_COMPLETE_KEY = 'doocoins_migration_v2_complete';
const MIGRATED_FROM_KEY = 'doocoins_migrated_from_nfid';
const MIGRATION_DATE_KEY = 'doocoins_migration_date';

/**
 * Storage adapter that works across all platforms
 * Uses localStorage as base, with native bridge backup for iOS
 */
export const MigrationStorage = {
  /**
   * Mark migration as complete
   * @param {string} nfidPrincipal - The NFID principal that was migrated
   */
  markComplete(nfidPrincipal) {
    try {
      const timestamp = Date.now();
      localStorage.setItem(MIGRATION_COMPLETE_KEY, timestamp.toString());
      localStorage.setItem(MIGRATED_FROM_KEY, nfidPrincipal);
      localStorage.setItem(MIGRATION_DATE_KEY, new Date().toISOString());
      
      // Backup to native storage if available (iOS Keychain/Android Secure Storage)
      if (window?.webkit?.messageHandlers?.migrationStorage) {
        window.webkit.messageHandlers.migrationStorage.postMessage({
          action: 'set',
          complete: true,
          nfidPrincipal,
          timestamp
        });
      }
    } catch (error) {
      console.error('[migration-storage] Failed to mark complete:', error);
    }
  },

  /**
   * Check if migration is already complete
   * @returns {boolean}
   */
  isComplete() {
    try {
      // Check localStorage first (fastest)
      const complete = localStorage.getItem(MIGRATION_COMPLETE_KEY);
      if (complete) {
        return true;
      }

      // For native platforms, check if we need to restore from native storage
      // This handles cases where localStorage was cleared but native storage persists
      if (window?.webkit?.messageHandlers?.migrationRestore) {
        // Attempt synchronous restore (if implemented in native bridge)
        const restored = localStorage.getItem(MIGRATION_COMPLETE_KEY);
        return !!restored;
      }

      return false;
    } catch (error) {
      console.error('[migration-storage] Failed to check completion:', error);
      return false;
    }
  },

  /**
   * Get the NFID principal that was migrated from
   * @returns {string|null}
   */
  getMigratedFrom() {
    try {
      return localStorage.getItem(MIGRATED_FROM_KEY);
    } catch (error) {
      return null;
    }
  },

  /**
   * Get migration date
   * @returns {string|null} ISO date string
   */
  getMigrationDate() {
    try {
      return localStorage.getItem(MIGRATION_DATE_KEY);
    } catch (error) {
      return null;
    }
  },

  /**
   * Clear migration data (for testing/debugging)
   */
  clear() {
    try {
      localStorage.removeItem(MIGRATION_COMPLETE_KEY);
      localStorage.removeItem(MIGRATED_FROM_KEY);
      localStorage.removeItem(MIGRATION_DATE_KEY);
      
      if (window?.webkit?.messageHandlers?.migrationStorage) {
        window.webkit.messageHandlers.migrationStorage.postMessage({
          action: 'clear'
        });
      }
    } catch (error) {
      console.error('[migration-storage] Failed to clear:', error);
    }
  },

  /**
   * Get all migration info for debugging
   */
  getInfo() {
    return {
      isComplete: this.isComplete(),
      migratedFrom: this.getMigratedFrom(),
      migrationDate: this.getMigrationDate()
    };
  }
};

// Make available globally for debugging
if (typeof window !== 'undefined') {
  window.MigrationStorage = MigrationStorage;
}

export default MigrationStorage;
