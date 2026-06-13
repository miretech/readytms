# 🚚 ReadyTMS Driver App — Launch Checklist

Everything I've already done is checked off. Everything you need to do
when you're back at the Mac Mini is the unchecked items below.

## ✅ What I've already done

- [x] Built the React/TypeScript mobile app (4 screens, 62 KB gzipped)
- [x] Wired Capacitor (the iOS/Android wrapper)
- [x] Configured native plugins: Geolocation, Camera, Push, Status Bar, Network
- [x] Server CORS + session cookie updated to allow the WebView
- [x] Codemagic build config (`codemagic.yaml`) — both iOS + Android workflows
- [x] Placeholder app icon (1024×1024) + splash (2732×2732) at `resources/`
- [x] Documentation (`mobile/README.md`)
- [x] Pushed to branch `feat/mobile-driver-app`

---

## 🟡 When you're back at the Mac Mini — accounts (one-time, ~30 min)

### 1. Apple Developer Program — **$99/yr**
- Go to https://developer.apple.com/programs/enroll/
- Sign in with your Apple ID (use one tied to a phone for 2FA)
- Choose "Individual" or "Organization"
- Pay the $99 enrollment fee
- Wait for verification (usually 24–48 hours, sometimes immediate)

### 2. Google Play Developer Console — **$25 one-time**
- Go to https://play.google.com/console/signup
- Sign in with the Google account you want to own the listing
- Pay the $25
- Approval is usually 1–3 days

### 3. Codemagic — **Free (500 build min/month is plenty)**
- Go to https://codemagic.io/signup
- "Sign in with GitHub"
- Authorize the `miretech` GitHub org so it can read this repo
- Click **Add application** → pick `miretech/readytms`
- Codemagic will auto-detect `codemagic.yaml` and import both workflows

---

## 🟡 Connect signing identities in Codemagic (one-time, ~20 min)

### iOS signing
1. In **App Store Connect** (https://appstoreconnect.apple.com):
   - Users → Integrations → App Store Connect API
   - Generate a new key with **Admin** access
   - Download the `.p8` file, note the Key ID and Issuer ID
2. In **Codemagic**:
   - Teams → Personal → Integrations → App Store Connect → **Add**
   - Upload the `.p8`, paste Key ID + Issuer ID
3. In Codemagic project settings for ReadyTMS Driver:
   - Code signing → iOS → "Automatic" → pick the App Store Connect integration
   - Set bundle ID: `com.readytms.driver`

### Android signing
1. On your Mac Mini terminal (one-time, generates the signing key):
   ```bash
   keytool -genkey -v -keystore readytms-driver-keystore.jks \
     -keyalg RSA -keysize 2048 -validity 10000 \
     -alias readytms-driver
   ```
   Use a strong password and save it somewhere safe (1Password, etc.) —
   if you lose it you can't update the app on Play Store, ever.
2. In **Codemagic**:
   - Teams → Personal → Code signing identities → Android keystores → **Add**
   - Name: `readytms_driver_keystore`
   - Upload the `.jks`, paste the password + alias

### Google Play API access
1. In **Google Play Console**:
   - Setup → API access → Create new service account
   - Download the JSON credentials file
   - Grant the service account "Release manager" permission
2. In **Codemagic**:
   - Teams → Personal → Integrations → Google Play → Upload the JSON

---

## 🟡 First build (when accounts are ready)

1. Open the project in Codemagic
2. Pick `ios-workflow` → **Start new build** → branch `feat/mobile-driver-app`
3. Wait ~10–15 min for the build
4. Codemagic will auto-upload to **TestFlight** when the build succeeds
5. Repeat for `android-workflow` → uploads to Play **Internal Testing**

You'll get an email when the build finishes. The iOS build appears
in TestFlight ~10 min later; Play's internal track is instant.

---

## 🟡 Install on a driver phone (testing, before public release)

### iOS (TestFlight)
1. In App Store Connect → TestFlight → External Testing → Add tester (driver's email)
2. Driver installs the **TestFlight** app from the App Store
3. Opens the invite email on their phone → tap "View in TestFlight" → install

### Android (Internal Testing)
1. In Play Console → Testing → Internal testing → Add tester (driver's email)
2. Copy the "join link" from the Internal testing page
3. Driver opens the link on their phone → install

---

## 🟡 Public release (after testing)

### iOS App Store submission
1. App Store Connect → My Apps → ReadyTMS Driver → **+ Version**
2. Fill out the listing using the copy in `mobile/STORE_LISTING.md`
3. Upload screenshots (use a simulator + Cmd+S):
   - 6.7" iPhone (3 required)
   - 6.5" iPhone (3 required)
   - 5.5" iPhone (3 required)
4. Pick the TestFlight build → **Submit for Review**
5. Apple review: 1–3 days

### Android Play Store submission
1. Play Console → ReadyTMS Driver → Production → **Create new release**
2. Pick the AAB Codemagic uploaded
3. Fill out the listing using `mobile/STORE_LISTING.md`
4. Submit
5. Google review: 1–7 days for first release, faster for updates

---

## 🚨 Things I literally cannot do for you

These all require your physical presence, identity verification, or
biometric/2FA challenges that only happen on your devices:

1. **Apple Developer Program signup** — requires your Apple ID password,
   2FA on your iPhone, payment
2. **Google Play signup** — requires your Google account password,
   2FA, payment
3. **Codemagic signup** — requires email verification
4. **Signing key generation** — needs to happen on a machine you trust
   so the password never touches a server
5. **TestFlight & Play Store reviewer submission** — needs your account

Everything else (writing code, configs, build YAML, listing copy, icons,
documentation) is done.

---

## 📞 If you get stuck

Once you have Codemagic connected and the first build starts, paste any
error messages here and I'll fix the underlying config. The most common
first-build issues are:

- "Bundle ID not registered" → register `com.readytms.driver` in Apple
  Developer → Identifiers
- "Provisioning profile not found" → make sure App Store Connect
  Integration is selected in Codemagic project settings
- "Keystore alias not found" → mismatched alias between keystore and
  `codemagic.yaml` (env var `CM_KEY_ALIAS`)
