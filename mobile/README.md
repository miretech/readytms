# ReadyTMS Driver — Mobile App

Native iOS + Android app for drivers, wrapped around the existing
ReadyTMS backend at `readytms.com`. The app reuses the same login
credentials drivers already have on the web portal.

## What it does

- **Sign in** with the same email/password drivers use on the web portal
- **See active loads** assigned to you (pickup, delivery, rate, broker)
- **Background GPS tracking** while On Duty — works even when phone is
  locked or app is backgrounded (this is the killer feature vs. the
  browser portal)
- **One-tap status updates** — Picked Up, In Transit, Delivered
- **POD photo upload** straight from the camera
- **Push notifications** (planned — server-side stub pending)

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Native shell (iOS / Android via Capacitor)              │
│  ┌────────────────────────────────────────────────────┐  │
│  │  React WebView app (mobile/src/*)                  │  │
│  │  ┌─────────────────────────────────────────┐       │  │
│  │  │  Native plugin bridge (mobile/src/      │       │  │
│  │  │  native.ts) — Geolocation, Camera,      │       │  │
│  │  │  Push, Status Bar, Network              │       │  │
│  │  └─────────────────────────────────────────┘       │  │
│  └────────────────────────────────────────────────────┘  │
└────────┬─────────────────────────────────────────────────┘
         │  HTTPS (CORS allowlisted: capacitor://localhost,
         │         https://localhost, ionic://localhost)
         ▼
┌──────────────────────────────────────────────────────────┐
│  Existing readytms.com backend                           │
│  /api/driver/login, /api/auth/user, /api/loads,          │
│  /api/driver/loads/:id/pod, /api/gps                     │
└──────────────────────────────────────────────────────────┘
```

The mobile bundle is **62 KB gzipped**. It does NOT include the
dispatcher pages — only the four screens drivers need (Login, Home,
Load Detail, Settings).

## First-time setup

You need a development machine to compile native code:

- **iOS**: macOS with Xcode 15+ (or use cloud build like Codemagic/EAS)
- **Android**: any OS with Android Studio + Android SDK 33+

Install deps + Capacitor CLI:

```bash
npm install
npx cap --version  # should print 6.x
```

Add the iOS platform (creates `ios/` folder):

```bash
npm run mobile:add:ios
# Then: open the Xcode project that opens automatically
```

Add the Android platform (creates `android/` folder):

```bash
npm run mobile:add:android
# Then: open the Android Studio project
```

## Day-to-day dev loop

```bash
# 1. Make changes to mobile/src/**/*
# 2. Rebuild the JS bundle + sync to native projects
npm run mobile:sync

# 3. Open in IDE, hit Run on a device or simulator
npm run mobile:open:ios       # opens Xcode
npm run mobile:open:android   # opens Android Studio
```

## Pointing at a local backend (dev)

By default the bundled app hits `https://readytms.com`. For local dev:

```bash
# Run the ReadyTMS server on your laptop with NODE_ENV=development
npm run dev

# Find your laptop's LAN IP (e.g. 192.168.1.42)
# Then build the mobile bundle pointed at it:
VITE_API_BASE_URL=http://192.168.1.42:5000 npm run mobile:sync
```

The phone/simulator must be on the same Wi-Fi as your laptop.
For Android, also enable `allowMixedContent: true` in
`capacitor.config.ts` temporarily so it'll talk to HTTP.

## Permissions configured

| Platform | Permission | Why |
|---|---|---|
| iOS | `NSLocationWhenInUseUsageDescription` | GPS while app is open |
| iOS | `NSLocationAlwaysAndWhenInUseUsageDescription` | Background GPS while On Duty |
| iOS | `NSCameraUsageDescription` | POD photo upload |
| Android | `ACCESS_FINE_LOCATION` | GPS |
| Android | `ACCESS_BACKGROUND_LOCATION` | Background GPS |
| Android | `CAMERA` | POD photo |
| Android | `INTERNET` | API calls |
| Android | `POST_NOTIFICATIONS` | Push notifications |

After `npm run mobile:add:ios`, add these to `ios/App/App/Info.plist`:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>ReadyTMS Driver tracks your location to update dispatch and confirm pickup/delivery.</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>ReadyTMS Driver tracks your location in the background while you're On Duty.</string>
<key>NSCameraUsageDescription</key>
<string>Take photos of bills of lading and proof of delivery.</string>
<key>UIBackgroundModes</key>
<array>
  <string>location</string>
  <string>fetch</string>
  <string>remote-notification</string>
</array>
```

After `npm run mobile:add:android`, add these to
`android/app/src/main/AndroidManifest.xml` inside `<manifest>`:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION"/>
<uses-permission android:name="android.permission.CAMERA"/>
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
```

## App store submission

### iOS — App Store Connect

1. **Apple Developer Account** — $99/yr at https://developer.apple.com
2. In Xcode, set Signing & Capabilities → your team
3. Bump build number, then `Product → Archive`
4. Upload to App Store Connect via Organizer
5. Fill out the listing (icon 1024×1024, screenshots, privacy disclosure
   — make sure to list "location" and "camera" usage)
6. Submit for review (typically 1–3 days)

### Android — Google Play Console

1. **Google Play Developer Account** — $25 one-time at
   https://play.google.com/console/signup
2. In Android Studio, `Build → Generate Signed Bundle (AAB)`
3. Upload the AAB to a new app in Play Console
4. Fill out store listing, privacy policy URL, content rating
5. Submit to internal testing first, then production
6. First submission typically takes 1–7 days

## App icon & launch screen

Default Capacitor icons are placeholders. Generate real ones from a
1024×1024 source PNG using
[`@capacitor/assets`](https://github.com/ionic-team/capacitor-assets):

```bash
npm install -g @capacitor/assets
mkdir resources
# place icon.png (1024×1024) and splash.png (2732×2732) in resources/
npx capacitor-assets generate --iconBackgroundColor "#0d3b66"
```

This regenerates all icon sizes and splash screens for both platforms.

## Backend prereqs (already done)

- ✅ CORS middleware allows `capacitor://localhost` / `https://localhost`
- ✅ Session cookie uses `SameSite=None; Secure` in production so it
  survives cross-origin requests from the WebView
- 🟡 Push notification token endpoint — TODO (see `api.ts::registerPushToken`)

## Future enhancements (not yet built)

- True **background geolocation** with continuous fix while screen off
  — currently uses standard Geolocation plugin which is "best effort"
  in background. For 24/7 tracking, swap to
  `@capacitor-community/background-geolocation`.
- **Push notifications** end-to-end (server endpoint + FCM/APNS setup)
- **Settlement viewer** — show the driver their latest settlement PDF
  in-app (currently just emailed)
- **Offline queue** — buffer status updates & POD uploads when offline
