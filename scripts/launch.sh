#!/bin/bash
# Boot iOS Simulator + Android Emulator side by side, then run Expo on both.
set -u

AVD="${AVD:-Pixel_7}"
IOS_DEVICE="${IOS_DEVICE:-iPhone 16 Pro}"
SDK="$HOME/Library/Android/sdk"

echo "Dual device mode: $IOS_DEVICE + $AVD"

# iOS
xcrun simctl boot "$IOS_DEVICE" 2>/dev/null
open -a Simulator

# Android
if ! "$SDK/platform-tools/adb" devices | grep -q emulator; then
  "$SDK/emulator/emulator" -avd "$AVD" &
fi

# Tile the two windows once both are on screen.
# ponytail: needs Accessibility permission for your terminal (System Settings > Privacy).
(
  for _ in $(seq 30); do
    osascript 2>/dev/null <<'AS' && break
tell application "Finder" to set screen to bounds of window of desktop
set W to item 3 of screen
set H to item 4 of screen
set half to W div 2
tell application "System Events"
  set sim to first process whose name is "Simulator"
  if (count of windows of sim) is 0 then error -- not up yet, retry
  tell window 1 of sim
    set position to {0, 0}
    set size to {half, H - 60}
  end tell
  -- ponytail: Android Studio's embedded emulator runs -qt-hide-window and has no
  -- window to place. Tile it only if it has one; never block on it.
  repeat with emu in (processes whose name contains "qemu")
    if (count of windows of emu) > 0 then
      tell window 1 of emu
        set position to {half, 0}
        set size to {half, H - 60}
      end tell
    end if
  end repeat
end tell
AS
    sleep 2
  done
) &

npx expo run:ios --device "$IOS_DEVICE" &
sleep 4
npx expo run:android
