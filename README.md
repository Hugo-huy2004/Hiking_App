# M-Hike: Mobile Hiker Management App 🥾

M-Hike is a cross-platform mobile application built with **React Native (Expo Router)** and **TypeScript** for hikers to plan hikes, record field observations, track GPS routes, monitor live weather, and synchronize hike data across devices.

## 🚀 Key Features

- **Hike Management (CRUD)**: Plan hikes with full validation (Name, Location, Date, Parking, Length, Difficulty, Description, plus 13 custom fields).
- **Field Observations**: Record multiple observations per hike with timestamps, comments, photos, trail condition, wildlife, and vegetation.
- **Search & Filter**: Instant name search and multi-criteria advanced filter (Location, Length, Date, Difficulty).
- **Interactive Maps & GPS Tracking**: Single international standard map tile layer (**CartoDB Voyager**) with live GPS location tracking and route polylines.
- **Live Weather Forecast**: Real-time 5-day weather forecast integration via Open-Meteo REST API.
- **Trail Safety SOS**: Instant GPS coordinates broadcast via SMS and Emergency Contact dialing.
- **Local Persistence**: Built-in SQLite database engine with WAL mode (`expo-sqlite`).
- **Cloud Synchronization**: Real-time cross-device sync via Firebase Realtime Database API.
- **Dual Language (i18n)**: English (Default) and Vietnamese language support.

## 🛠️ Tech Stack

- **Framework**: React Native (Expo SDK 57, Expo Router)
- **Language**: TypeScript (Strict Mode)
- **Local Database**: SQLite (`expo-sqlite`)
- **Cloud Backend**: Firebase Realtime Database API
- **Location Services**: `expo-location`
- **UI Components**: SF-Symbols vector line glyphs, glassmorphism design system

## Getting Started

### Prerequisites

- Node.js (>= 18)
- npm / npx
- iOS Simulator (macOS) or Android Emulator

### Installation & Execution

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Run on both iOS Simulator and Android Emulator simultaneously:
   ```bash
   npm run dev:both
   ```
   *Alternative short command*:
   ```bash
   npm run dual
   ```

3. Code quality and unit tests:
   ```bash
   npm run typecheck
   npx eslint .
   node --experimental-strip-types src/lib/health.check.ts
   ```

## 📄 License

Academic Coursework Project for Greenwich University.
