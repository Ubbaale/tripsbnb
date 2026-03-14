# Tripsbnb — EAS Build & Store Submission Guide

This guide walks you through building the native iOS and Android apps using EAS Build and publishing them to the App Store and Play Store.

---

## Prerequisites

Before you begin, make sure you have:

1. **Node.js 18+** installed on your local machine
2. **An Expo account** — Sign up at https://expo.dev
3. **EAS CLI** installed globally:
   ```bash
   npm install -g eas-cli
   ```
4. **Apple Developer Account** ($99/year) — https://developer.apple.com
5. **Google Play Developer Account** ($25 one-time) — https://play.google.com/console

---

## Step 1: Clone the Project Locally

Download or clone this project to your local machine. EAS Build runs in the cloud but needs to be initiated from a local terminal.

---

## Step 2: Log In to Expo

```bash
eas login
```

Enter your Expo account credentials.

---

## Step 3: Initialize the EAS Project

```bash
eas init
```

This will:
- Create a project on your Expo account
- Generate a unique `projectId`
- Update `app.json` with the `extra.eas.projectId` value

**Important:** After running this, copy the `projectId` value into `app.json` under `extra.eas.projectId`.

---

## Step 4: Configure Your Credentials

### iOS (Apple)

EAS will prompt you to log in to your Apple Developer account during the first build. It handles:
- Creating App IDs
- Generating provisioning profiles
- Creating distribution certificates

You can also pre-configure:
```bash
eas credentials --platform ios
```

Update `eas.json` → `submit.production.ios` with:
- `appleId`: Your Apple ID email
- `ascAppId`: Your App Store Connect app ID (created in App Store Connect)
- `appleTeamId`: Your Apple Developer Team ID

### Android (Google Play)

1. Go to **Google Play Console** → **Settings** → **API Access**
2. Create a **Service Account** with "Release Manager" permissions
3. Download the JSON key file
4. Place it in your project (e.g., `./google-service-account.json`)
5. Update `eas.json` → `submit.production.android.serviceAccountKeyPath` to point to this file

**Do NOT commit the service account key to version control.**

---

## Step 5: Update Production API URL

In `eas.json`, update the `EXPO_PUBLIC_DOMAIN` value under each build profile to point to your deployed backend:

```json
"env": {
  "EXPO_PUBLIC_DOMAIN": "your-deployed-backend.replit.app:443"
}
```

Make sure your backend is deployed and accessible before building the production app. The app needs to connect to a live backend, not `localhost`.

---

## Step 6: Build for Both Platforms

### Development Build (for testing on devices)

```bash
# iOS
eas build --profile development --platform ios

# Android
eas build --profile development --platform android
```

### Preview Build (internal testing)

```bash
# iOS (installs via TestFlight-like internal distribution)
eas build --profile preview --platform ios

# Android (generates APK for sideloading)
eas build --profile preview --platform android
```

### Production Build (for store submission)

```bash
# iOS (.ipa for App Store)
eas build --profile production --platform ios

# Android (.aab for Play Store)
eas build --profile production --platform android

# Or build both at once
eas build --profile production --platform all
```

---

## Step 7: Submit to Stores

### Submit to App Store

```bash
eas submit --platform ios --profile production
```

EAS will upload the .ipa to App Store Connect. Then:
1. Log in to **App Store Connect** (https://appstoreconnect.apple.com)
2. Select your app
3. Fill in the store listing details (use `store-listing.json` as reference)
4. Upload screenshots (sizes: 6.7", 6.5", 5.5" for iPhone; 12.9" for iPad)
5. Set age rating to **17+** (due to companion/dating features)
6. Add your privacy policy URL
7. Submit for review

### Submit to Google Play

```bash
eas submit --platform android --profile production
```

EAS will upload the .aab to Google Play Console. Then:
1. Log in to **Google Play Console** (https://play.google.com/console)
2. Select your app
3. Complete the store listing (use `store-listing.json` as reference)
4. Upload screenshots (phone + 7" tablet + 10" tablet)
5. Complete the content rating questionnaire
6. Set up pricing (Free with in-app purchases)
7. Submit for review

---

## Step 8: OTA Updates (After Initial Publish)

Once your app is live, you can push JavaScript-only updates without going through store review:

```bash
eas update --branch production --message "Bug fix for chat screen"
```

This uses Expo Updates (EAS Update) to deliver changes directly to users' devices.

---

## App Store Screenshots Needed

### iOS
- **6.7" iPhone** (1290 x 2796px) — iPhone 15 Pro Max
- **6.5" iPhone** (1284 x 2778px) — iPhone 14 Plus
- **5.5" iPhone** (1242 x 2208px) — iPhone 8 Plus
- **12.9" iPad** (2048 x 2732px) — iPad Pro

### Android
- **Phone** (1080 x 1920px minimum)
- **7" Tablet** (1200 x 1920px)
- **10" Tablet** (1800 x 2560px)

Recommended screens to screenshot:
1. Discover/Home screen with hero
2. Stays listing with filters
3. Restaurant with menu and ordering
4. Safari experience detail
5. Companion discovery (swipe interface)
6. Destination Guide with AI content
7. Travel Toolkit (currency converter)
8. Chat conversation

---

## Important Notes

- **Backend must be deployed** before building production apps. The `EXPO_PUBLIC_DOMAIN` environment variable in `eas.json` must point to your live backend URL.
- **Stripe keys**: In production, the Replit Stripe connector automatically uses your production Stripe keys when `REPLIT_DEPLOYMENT=1` is set.
- **Content rating**: Due to the companion/dating features, the app should be rated **17+** (iOS) / **Mature 17+** (Android).
- **Privacy policy**: Required by both stores. Must cover location data, user profiles, chat messages, and payment processing.
- **App Review tips**:
  - Apple may ask about the companion feature — explain it's for travel companionship, not dating
  - Provide demo credentials if needed for review
  - Ensure all features work with the production backend
- **Build times**: iOS builds typically take 15-30 minutes; Android builds 10-20 minutes.

---

## File Reference

| File | Purpose |
|------|---------|
| `app.json` | Expo app configuration, permissions, plugins |
| `eas.json` | EAS Build profiles (dev/preview/production) and submission config |
| `store-listing.json` | App Store & Play Store listing metadata |
| `assets/images/icon.png` | App icon (1024x1024) |
| `assets/images/splash-icon.png` | Splash screen icon |
| `assets/images/android-icon-foreground.png` | Android adaptive icon foreground |
| `assets/images/android-icon-monochrome.png` | Android monochrome icon |
