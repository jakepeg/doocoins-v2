import type { CapacitorConfig } from '@capacitor/cli';

// IMPORTANT: Internet Identity only issues delegations to HTTPS origins.
// Configure the iOS WebView to load your deployed app over HTTPS, not file:// or capacitor://
// Set APP_WEB_URL in your env when syncing/building, or replace the fallback below.
// TODO(auth-broker): Broker relay lives at `${APP_WEB_URL}auth/relay`.
// - For iOS, we'll open this URL via ASWebAuthenticationSession (native) instead of inside WKWebView.
// - Later, when Universal Links are enabled, the callback will be an HTTPS path like `${APP_WEB_URL}ii-callback`.
const APP_WEB_URL = process.env.APP_WEB_URL || 'https://zks5c-sqaaa-aaaah-qqf4a-cai.icp0.io/';
// For rapid on-device testing, allow using local bundled assets instead of the remote URL.
// Set USE_LOCAL_ASSETS_IN_NATIVE=1 when running `npx cap sync ios` to enable.
const USE_LOCAL_ASSETS = true; // TEMPORARILY HARDCODED FOR TESTING

const config: CapacitorConfig = {
  appId: 'com.doocoins.kids',
  appName: 'DooCoins Kids',
  webDir: 'dist',
  server: {
    // Load over HTTPS so Internet Identity can return a delegation
    // In testing, you can disable the remote URL and serve bundled assets by setting USE_LOCAL_ASSETS_IN_NATIVE=1
    ...(USE_LOCAL_ASSETS ? {} : { url: APP_WEB_URL, cleartext: false as const }),
    // Permit in-webview navigation to Internet Identity during auth
    // Notes:
    // - Your project docs reference id.ai in production
    // - identity.ic0.app is also commonly used by II
    // Add/remove domains here to match your II deployment
    allowNavigation: [
      'id.ai',
      'identity.ic0.app',
      'identity.internetcomputer.org',
      // Support Sign in with Apple flows if they occur inside the WebView
      'appleid.apple.com',
  'idmsa.apple.com',
  'appleid.cdn-apple.com',
      'apple.com',
      // Google OAuth flows should be opened externally, but include domains for any iframes/resources
      'accounts.google.com',
      'google.com',
      'apis.google.com',
      'ssl.gstatic.com'
    ]
  },
  // FORCE CACHE CLEARING ON iOS
  ios: {
    limitsNavigationsToAppBoundDomains: false
  }
};

export default config;
