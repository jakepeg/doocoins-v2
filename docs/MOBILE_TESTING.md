# Mobile Testing Guide

## iOS Testing

### Prerequisites

- Xcode 15+ installed
- iOS device or simulator (iOS 14+)
- Apple Developer account (for device testing)

### Setup

1. **Install dependencies:**

   ```bash
   npm install
   npm run build
   ```

2. **Sync to iOS:**

   ```bash
   npx cap sync ios
   ```

3. **Open in Xcode:**
   ```bash
   npx cap open ios
   ```

### Running Tests

#### Simulator Testing

1. Select a simulator in Xcode (e.g., iPhone 15)
2. Click Run (⌘R)
3. App loads in simulator

#### Device Testing

1. Connect iPhone via USB
2. Select your device in Xcode
3. Sign with your Apple ID (Xcode → Preferences → Accounts)
4. Click Run (⌘R)

### Debug Logging

View console logs in Xcode:

- Open Debug Navigator (⌘7)
- Select your device/simulator
- Console shows all `console.log()` output with ⚡️ prefix

**Key logs to watch:**

```
[broker] 🚀 BROKER FLOW STARTING
[broker] ✅ Session identity reconstructed
[broker] 🎭 Creating delegation identity...
[auth] ✅ Authentication complete via broker
```

### Common iOS Issues

#### "Could not create sandbox extension"

- Harmless warning, ignore

#### "UIScene lifecycle" warning

- Non-critical, will be fixed in future Capacitor version

#### ASWebAuthenticationSession not showing

- Check `Info.plist` has URL scheme configured
- Verify relay URL is HTTPS
- Check device has internet connection

#### Authentication succeeds but state not updating

- Check event listener attached: `window.addEventListener('broker:auth-complete')`
- Verify `use-auth-client.jsx` has broker event handler

### Performance Testing

Monitor these in Xcode Instruments:

- Memory usage (should stay under 100MB)
- Network requests (II auth, backend calls)
- UI responsiveness (60fps during navigation)

## Android Testing

### Prerequisites

- Android Studio installed
- Android device or emulator (API 24+)
- USB debugging enabled (for device testing)

### Setup

1. **Install dependencies:**

   ```bash
   npm install
   npm run build
   ```

2. **Sync to Android:**

   ```bash
   npx cap sync android
   ```

3. **Open in Android Studio:**
   ```bash
   npx cap open android
   ```

### Running Tests

#### Emulator Testing

1. Create AVD in Android Studio (Tools → Device Manager)
2. Launch emulator
3. Click Run

#### Device Testing

1. Enable Developer Options on device:
   - Settings → About Phone → Tap "Build Number" 7 times
2. Enable USB Debugging in Developer Options
3. Connect device via USB
4. Click Run in Android Studio

### Debug Logging

View logs in Android Studio:

- Logcat window (View → Tool Windows → Logcat)
- Filter by package: `com.doocoins.parent`
- Console logs appear with ⚡️ prefix

### Common Android Issues

#### Chrome Custom Tabs not opening

- Check `AndroidManifest.xml` has intent filter
- Verify relay URL is HTTPS
- Check Chrome/WebView installed

#### Deep link not working

- Verify scheme matches: `doocoins://ii-callback`
- Check `AndroidManifest.xml` intent filter configuration
- Test with `adb shell am start -a android.intent.action.VIEW -d "doocoins://ii-callback#code=test"`

## Cross-Platform Testing

### Test Cases

- [ ] **Initial load**: App loads without errors
- [ ] **Sign in button**: Tapping opens ASWebAuthenticationSession/Chrome Custom Tabs
- [ ] **II authentication**: Can authenticate with passkey/security key/Google
- [ ] **Callback handling**: Returns to app after authentication
- [ ] **State update**: UI updates to show authenticated state
- [ ] **Backend calls**: Can fetch user data
- [ ] **Sign out**: Clears session and returns to login screen
- [ ] **Persistence**: Closing and reopening app maintains session
- [ ] **Network errors**: Graceful handling of offline/slow connections

### Manual Test Script

1. **Fresh install:**

   ```bash
   # iOS
   npx cap run ios --target="iPhone 15"

   # Android
   npx cap run android
   ```

2. **Sign in flow:**

   - Tap "Connect with Internet Identity"
   - Verify relay page opens in native browser
   - Authenticate with II
   - Verify redirect back to app
   - Check "Completing sign in..." message appears
   - Verify authenticated state loads

3. **Authenticated actions:**

   - Navigate through app
   - Check data loads correctly
   - Test any backend mutations

4. **Sign out:**

   - Tap sign out
   - Verify returns to login screen
   - Check localStorage cleared

5. **Re-authentication:**
   - Sign in again
   - Verify same principal/data

### Automated Testing (Future)

Consider adding:

- Detox (React Native E2E testing framework)
- Appium (cross-platform mobile automation)
- Maestro (mobile UI testing)

## Troubleshooting

### Clear App Data

**iOS:**

```bash
# Delete app from simulator
xcrun simctl uninstall booted com.doocoins.parent

# Reset simulator entirely
xcrun simctl erase all
```

**Android:**

```bash
# Clear app data
adb shell pm clear com.doocoins.parent

# Uninstall
adb uninstall com.doocoins.parent
```

### View Stored Data

**iOS (Simulator):**

```bash
# Find app container
xcrun simctl get_app_container booted com.doocoins.parent data

# View localStorage
cat ~/Library/Developer/CoreSimulator/Devices/*/data/Containers/Data/Application/*/Library/WebKit/WebsiteData/LocalStorage/*.localstorage
```

**Android:**

```bash
# Inspect localStorage
adb shell run-as com.doocoins.parent ls /data/data/com.doocoins.parent/app_webview/Local\ Storage
```

### Network Debugging

**iOS:**

```bash
# View all network requests in Charles/Proxyman
# Configure iOS Settings → Wi-Fi → HTTP Proxy
```

**Android:**

```bash
# Use Android Studio Network Profiler
# Or Charles/Proxyman with proxy configuration
```

## CI/CD Considerations

For automated mobile builds:

- Fastlane for iOS code signing
- Gradle for Android builds
- Store signing certificates securely
- Test on real devices via BrowserStack/Sauce Labs
