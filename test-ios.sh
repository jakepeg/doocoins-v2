#!/bin/bash

# iOS Testing Script for DooCoins Parent App
# This script builds the web app and syncs it with the iOS project

set -e

echo "🔨 Building parent app..."
npm run build

echo "📱 Syncing with iOS..."
cd src/frontend
npx cap sync ios

echo "🚀 Opening Xcode..."
open ios/App/App.xcworkspace

echo "✅ Done! You can now build and run the app in Xcode on your device."
