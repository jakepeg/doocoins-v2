# iOS Native Bridge Implementation Guide

## Overview

The migration optimization includes hooks for native storage persistence on iOS. This guide shows how to implement the Swift side of the bridge.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│ JavaScript (React)                                        │
│                                                           │
│ MigrationStorage.markComplete(nfid)                      │
│   ↓                                                       │
│ window.webkit.messageHandlers.migrationStorage.postMessage()│
└───────────────────┬──────────────────────────────────────┘
                    │ WKWebView Bridge
                    ↓
┌──────────────────────────────────────────────────────────┐
│ Swift (iOS Native)                                        │
│                                                           │
│ MigrationStorageHandler.userContentController()          │
│   ↓                                                       │
│ Save to iOS Keychain (persistent across app restarts)   │
└──────────────────────────────────────────────────────────┘
```

## JavaScript API (Already Implemented)

### Save Migration State

```javascript
// src/frontend/utils/migration-storage.js
window.webkit.messageHandlers.migrationStorage.postMessage({
  action: "set",
  complete: true,
  nfidPrincipal: "abc123...",
  timestamp: Date.now(),
});
```

### Clear Migration State

```javascript
window.webkit.messageHandlers.migrationStorage.postMessage({
  action: "clear",
});
```

### Restore Migration State (Optional)

```javascript
// On app startup, before checking migration
window.webkit.messageHandlers.migrationRestore.postMessage({});
// Swift handler should inject data back into localStorage
```

## iOS Swift Implementation

### 1. Add Message Handler to WKWebView

```swift
// File: ios/App/App/WebViewHandler.swift (or similar)

import WebKit
import Security

class MigrationStorageHandler: NSObject, WKScriptMessageHandler {

    // MARK: - Keychain Keys
    private let serviceName = "com.doocoins.v2"
    private let migrationCompleteKey = "doocoins_migration_v2_complete"
    private let migratedFromKey = "doocoins_migrated_from_nfid"
    private let migrationDateKey = "doocoins_migration_date"

    // MARK: - WKScriptMessageHandler

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard let body = message.body as? [String: Any] else {
            print("[MigrationStorage] Invalid message body")
            return
        }

        let action = body["action"] as? String

        switch action {
        case "set":
            handleSet(body: body)
        case "clear":
            handleClear()
        default:
            print("[MigrationStorage] Unknown action: \(action ?? "nil")")
        }
    }

    // MARK: - Handlers

    private func handleSet(body: [String: Any]) {
        guard let complete = body["complete"] as? Bool,
              let nfidPrincipal = body["nfidPrincipal"] as? String,
              let timestamp = body["timestamp"] as? Int else {
            print("[MigrationStorage] Missing required fields for 'set' action")
            return
        }

        // Save to Keychain (persists across app restarts and localStorage clearing)
        saveToKeychain(key: migrationCompleteKey, value: String(timestamp))
        saveToKeychain(key: migratedFromKey, value: nfidPrincipal)

        // Also save ISO date string
        let dateFormatter = ISO8601DateFormatter()
        let dateString = dateFormatter.string(from: Date())
        saveToKeychain(key: migrationDateKey, value: dateString)

        print("[MigrationStorage] ✅ Migration state saved to Keychain")
        print("[MigrationStorage]   - Complete: \(complete)")
        print("[MigrationStorage]   - NFID: \(nfidPrincipal.prefix(10))...")
        print("[MigrationStorage]   - Timestamp: \(timestamp)")
    }

    private func handleClear() {
        deleteFromKeychain(key: migrationCompleteKey)
        deleteFromKeychain(key: migratedFromKey)
        deleteFromKeychain(key: migrationDateKey)

        print("[MigrationStorage] 🗑️ Migration state cleared from Keychain")
    }

    // MARK: - Keychain Utilities

    private func saveToKeychain(key: String, value: String) {
        let data = value.data(using: .utf8)!

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]

        // Delete existing item first
        SecItemDelete(query as CFDictionary)

        // Add new item
        let status = SecItemAdd(query as CFDictionary, nil)

        if status != errSecSuccess {
            print("[MigrationStorage] ⚠️ Failed to save to Keychain: \(status)")
        }
    }

    private func loadFromKeychain(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess,
              let data = result as? Data,
              let value = String(data: data, encoding: .utf8) else {
            return nil
        }

        return value
    }

    private func deleteFromKeychain(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: key
        ]

        SecItemDelete(query as CFDictionary)
    }
}

// MARK: - Restore Handler (Optional but Recommended)

class MigrationRestoreHandler: NSObject, WKScriptMessageHandler {

    weak var webView: WKWebView?
    private let storageHandler = MigrationStorageHandler()

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        // Restore migration state from Keychain to localStorage
        restoreMigrationState()
    }

    private func restoreMigrationState() {
        guard let webView = webView else { return }

        // Read from Keychain
        let complete = storageHandler.loadFromKeychain(key: "doocoins_migration_v2_complete")
        let migratedFrom = storageHandler.loadFromKeychain(key: "doocoins_migrated_from_nfid")
        let migrationDate = storageHandler.loadFromKeychain(key: "doocoins_migration_date")

        guard let complete = complete,
              let migratedFrom = migratedFrom else {
            print("[MigrationRestore] No migration data to restore")
            return
        }

        // Inject into localStorage via JavaScript
        let script = """
        localStorage.setItem('doocoins_migration_v2_complete', '\(complete)');
        localStorage.setItem('doocoins_migrated_from_nfid', '\(migratedFrom)');
        \(migrationDate.map { "localStorage.setItem('doocoins_migration_date', '\($0)');" } ?? "")
        console.log('[MigrationRestore] ✅ Migration state restored from Keychain');
        """

        webView.evaluateJavaScript(script) { _, error in
            if let error = error {
                print("[MigrationRestore] ⚠️ Failed to inject localStorage: \(error)")
            } else {
                print("[MigrationRestore] ✅ Migration state injected into localStorage")
            }
        }
    }
}
```

### 2. Register Handlers in ViewController

```swift
// File: ios/App/App/ViewController.swift (or similar)

import UIKit
import WebKit

class ViewController: UIViewController {

    var webView: WKWebView!

    override func loadView() {
        let configuration = WKWebViewConfiguration()
        let contentController = WKUserContentController()

        // Register migration handlers
        let migrationStorage = MigrationStorageHandler()
        contentController.add(migrationStorage, name: "migrationStorage")

        let migrationRestore = MigrationRestoreHandler()
        migrationRestore.webView = webView // Set after webView creation
        contentController.add(migrationRestore, name: "migrationRestore")

        // ... other handlers (broker, authStorage, etc.)

        configuration.userContentController = contentController
        webView = WKWebView(frame: .zero, configuration: configuration)
        migrationRestore.webView = webView // Set reference
        view = webView
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        // Load app...
    }
}
```

### 3. Optional: Restore on App Launch

```swift
// File: ios/App/App/AppDelegate.swift

import UIKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {

        // Restore migration state from Keychain to localStorage
        // This ensures data survives iOS localStorage clearing
        restoreMigrationStateIfNeeded()

        return true
    }

    private func restoreMigrationStateIfNeeded() {
        // Check if localStorage has migration data
        // If not, restore from Keychain
        // This is done in MigrationRestoreHandler when JS calls it
        print("[AppDelegate] App launched - migration restore will run on webView load")
    }
}
```

## Testing the Implementation

### Test 1: Save to Keychain

```javascript
// In browser console (on iOS device):
window.webkit.messageHandlers.migrationStorage.postMessage({
  action: "set",
  complete: true,
  nfidPrincipal: "test-nfid-123",
  timestamp: Date.now(),
});

// Expected Swift log:
// [MigrationStorage] ✅ Migration state saved to Keychain
```

### Test 2: Restore from Keychain

```javascript
// Clear localStorage
localStorage.clear();

// Request restore
window.webkit.messageHandlers.migrationRestore.postMessage({});

// Check if restored
console.log(localStorage.getItem("doocoins_migration_v2_complete"));
// Expected: timestamp string

// Expected Swift log:
// [MigrationRestore] ✅ Migration state restored from Keychain
```

### Test 3: Clear Keychain

```javascript
window.webkit.messageHandlers.migrationStorage.postMessage({
  action: "clear",
});

// Expected Swift log:
// [MigrationStorage] 🗑️ Migration state cleared from Keychain
```

### Test 4: App Restart Persistence

1. Run migration (sets Keychain)
2. Force quit app
3. Relaunch app
4. Check if `MigrationStorage.isComplete()` returns true
5. Expected: Should be true (restored from Keychain)

## Alternative: UserDefaults Instead of Keychain

If Keychain is overkill, use UserDefaults (simpler but less secure):

```swift
private func saveToUserDefaults(key: String, value: String) {
    UserDefaults.standard.set(value, forKey: key)
    UserDefaults.standard.synchronize()
}

private func loadFromUserDefaults(key: String) -> String? {
    return UserDefaults.standard.string(forKey: key)
}

private func deleteFromUserDefaults(key: String) {
    UserDefaults.standard.removeObject(forKey: key)
    UserDefaults.standard.synchronize()
}
```

**Note:** UserDefaults is sufficient for migration flags (not sensitive data). Keychain is better for delegation chains (sensitive).

## Android Equivalent

For Android (Kotlin), use Encrypted SharedPreferences:

```kotlin
// File: android/app/src/main/java/com/doocoins/v2/MigrationStorageHandler.kt

import android.webkit.JavascriptInterface
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class MigrationStorageHandler(private val context: Context) {

    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val sharedPreferences = EncryptedSharedPreferences.create(
        context,
        "doocoins_migration_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    @JavascriptInterface
    fun saveComplete(nfidPrincipal: String, timestamp: Long) {
        sharedPreferences.edit()
            .putLong("doocoins_migration_v2_complete", timestamp)
            .putString("doocoins_migrated_from_nfid", nfidPrincipal)
            .apply()
    }

    @JavascriptInterface
    fun clear() {
        sharedPreferences.edit().clear().apply()
    }

    @JavascriptInterface
    fun isComplete(): Boolean {
        return sharedPreferences.contains("doocoins_migration_v2_complete")
    }
}
```

## Benefits of Native Storage

1. **Survives localStorage Clearing:** iOS WebView clears localStorage on app termination
2. **Platform Native:** Uses iOS Keychain / Android Encrypted Preferences
3. **Secure:** Data encrypted at rest
4. **Reliable:** Persists across app updates and restarts
5. **Fast:** No network calls needed

## Migration Without Native Bridge

If you don't implement native storage:

**Still works!** The app will:

1. Check localStorage first (fastest)
2. If cleared, call backend `getMigrationStatus()` (slower but works)
3. Update localStorage from backend response
4. Future opens use localStorage until cleared again

**Trade-off:** Extra backend call after localStorage clearing, but not a breaking issue.

## Recommendation

**Implement native storage for production iOS app.** It's a 30-minute task that saves 500ms on every app restart after localStorage clearing (common on iOS).

For PWA/desktop, localStorage is sufficient (more persistent than iOS WebView).

---

_Ready to implement? Follow the Swift code above and test thoroughly!_
