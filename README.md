# M-Hike Application - Coursework Submission

## Student Information

- **Student Name:** Le Gia Huy
- **Student ID:** GCS230377
- **Course Name:** Mobile Application Design and Development
- **Course Code:** COMP1786
- **Institution:** University of Greenwich (Vietnam)

---

## Application Overview

M-Hike is a comprehensive hiking management and safety application designed for outdoor enthusiasts, trail runners, and hikers. The application empowers users to plan hikes, log detailed field observations, track real-time GPS routes, receive live weather updates, and access emergency SOS signals.

### Key Features
- **Hike Management (CRUD):** Create, review, edit, search, and manage planned or completed hiking trips.
- **Field Observations:** Record observations linked to specific hikes (wildlife, trail conditions, weather, photos, ratings, and comments) with automatic cascade deletion.
- **Offline-First Storage:** Local SQLite database serves as the primary source of truth, enabling full app functionality without an active internet connection.
- **Real-Time Cloud Synchronization:** Background synchronization with Firebase Realtime Database across multiple devices.
- **Google Authentication:** Native Google Sign-In with real-time profile and avatar synchronization.
- **Smart GPS Journey Tracking:** Record and replay walking paths, pace, elevation gain, and session phases (Warmup, Steady, Halfway, Final, Done).
- **Personalized Training Plan:** Auto-generated training programs based on user BMI and WHO health guidelines.
- **Emergency SOS Signal:** Real-time GPS coordinate extraction with one-tap SMS/Call dispatch to emergency contacts.
- **Bilingual Interface (i18n):** Complete support for English (EN) and Vietnamese (VI).

---

## Repository Directory Structure

This repository contains two distinct implementations of the M-Hike application:

```
COMP1786-Le_Gia_Huy_GCS230377/
├── Android_Native_App/        # Native Android Application (Android Studio / Java)
├── Mobile- React_Native/      # Cross-Platform Application (React Native / Expo SDK 57)
└── README.md                  # Project Documentation & Execution Guide
```

### 1. Android_Native_App (Native Android Studio)
- **Tech Stack:** Java, Android SDK, SQLite (SQLiteOpenHelper), Firebase Realtime Database, XML Layouts.
- **Target Platform:** Android (API Level 24+).
- **Description:** Traditional native Android application implementing Material Design, local SQLite persistence, custom adapters, and Firebase authentication.

### 2. Mobile- React_Native (React Native & Expo)
- **Tech Stack:** React Native (Expo SDK 57), TypeScript, SQLite (WAL Mode), Expo Router (File-based navigation), Leaflet Maps, Open-Meteo API.
- **Target Platforms:** iOS and Android.
- **Description:** Cross-platform application featuring Apple HIG design tokens, dark mode, skeleton loaders, custom hooks (useJourney), and error handling (ErrorBoundary).

---

## How to Clone and Run

### 1. Clone the Repository

Open terminal or command prompt and run:

```bash
git clone https://github.com/Hugo-huy2004/COMP1786-Le_Gia_Huy_GCS230377.git
cd COMP1786-Le_Gia_Huy_GCS230377
```

---

### 2. Running Mobile- React_Native (React Native / Expo)

To run the cross-platform React Native app on iOS Simulator, Android Emulator, or a physical device:

```bash
# 1. Navigate to the React Native folder
cd "Mobile- React_Native"

# 2. Install dependencies
npm install

# 3. Start Expo development server
npm run start
```

#### Running Options:
- **Run on iOS Simulator:** Press `i` in the terminal or run `npm run ios`.
- **Run on Android Emulator:** Press `a` in the terminal or run `npm run android`.
- **Run on Both Devices Simultaneously (Dual Launch):**
  ```bash
  npm run dual
  ```
- **Run on Physical Device:** Scan the QR code in terminal using the Expo Go app (Android) or Camera App (iOS).

---

### 3. Running Android_Native_App (Android Studio)

To open and run the Native Java Android project:

1. Open Android Studio.
2. Click Open (or File > Open).
3. Select the `Android_Native_App` folder inside the cloned repository directory.
4. Allow Gradle to sync project dependencies (this may take a few minutes on first launch).
5. Select an Android Virtual Device (AVD Emulator) or connect a physical Android device via USB.
6. Click the Run button (or press Shift + F10).

---

## Verification & Quality Assurance

The React Native application includes built-in test suites and type safety checkers:

```bash
cd "Mobile- React_Native"

# Run automated logic test suite (BMI, Haversine, GPS, Safety checks)
npx tsx src/lib/health.check.ts

# Run TypeScript type safety checker
npm run typecheck
```

---

## Environment Configuration (.env)

Environment configuration templates are provided in `.env.example`:

```env
EXPO_PUBLIC_API_BASE_URL=https://YOUR-PROJECT-default-rtdb.asia-southeast1.firebasedatabase.app
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-google-ios-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-google-android-client-id.apps.googleusercontent.com
EXPO_PUBLIC_AUTHOR=Le Gia Huy
EXPO_PUBLIC_APP_VERSION=1.0.0
```

---

## Author

**Le Gia Huy** (Student ID: GCS230377)  
University of Greenwich (Vietnam)  
Coursework Submission for COMP1786 - Mobile Application Design and Development.
