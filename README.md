# Nodo (Expo + Bun)

Task list app similar to Google Keep: named lists, check/uncheck items, suggestions from already checked items, sorting (alphabetical / last added). Local storage. Hexagonal architecture for reuse of the business core on the web later.

## Stack

- **Bun** – dependency and script management
- **Expo** – React Native (Android, iOS, web)
- **TypeScript**

## Commands

```bash
bun install
bun run start    # Expo dev server
bun run android  # Run on Android
bun run ios      # Run on iOS (macOS)
bun run web      # Run on web
```

## Android Build

### Option 1: EAS Build (recommended)

Build in the cloud via [Expo Application Services](https://expo.dev/eas). Requires an Expo account (free).

```bash
bunx eas-cli login
bunx eas-cli build:configure   # creates eas.json if needed
bunx eas-cli build --platform android
```

- **APK** (debug or release): add `--profile preview` or configure a profile in `eas.json` with `"buildType": "apk"`.
- **AAB** (default): for Play Store publication.

### Option 2: Local build

Generates the native Android project then builds with Gradle. Prerequisites: Android SDK, `ANDROID_HOME` environment variable.

```bash
bunx expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

The APK is in `android/app/build/outputs/apk/release/`. For AAB (Play Store): `./gradlew bundleRelease` → `android/app/build/outputs/bundle/release/`.

## Structure (hexagonal)

- `src/domain` – Entities (Checklist, ChecklistItem), no dependencies
- `src/application` – Ports (storage) and use cases (list, get, save, create, toggle, add/remove item)
- `src/infrastructure` – Storage adapter (AsyncStorage)
- `src/presentation` – Theme (overridable), context, screens and React Native components

Domain and application are plain TypeScript, reusable by a future web app.

## Theme

Default Material/Android-style theme. To override: wrap the app with `<ThemeProvider initialTheme={customTheme}>` or use `useTheme().setTheme(...)`.
