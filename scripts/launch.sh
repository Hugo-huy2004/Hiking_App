#!/bin/bash

echo "🚀 Starting Dual Device Mode (iOS + Android)..."

# Boot Android Emulator if not running
if ! $HOME/Library/Android/sdk/platform-tools/adb devices | grep -q "emulator"; then
  echo "📱 Launching Android Emulator Pixel_7..."
  $HOME/Library/Android/sdk/emulator/emulator -avd Pixel_7 &
  sleep 5
fi

# Bring Simulator & Android Emulator to front
osascript -e 'tell application "Simulator" to activate' -e 'tell application "System Events" to set frontmost of first process whose name contains "qemu" to true' 2>/dev/null || true

# Run Expo on iOS and Android
npx expo run:ios & (sleep 4 && npx expo run:android)
