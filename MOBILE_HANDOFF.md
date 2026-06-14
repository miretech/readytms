# Mobile Driver App — Handoff Brief

**Status:** Foundation built and pushed. Build runs on Mac Mini, but the `/m` route serves the wrong HTML — a 2-line fix described below.

**Repo:** `~/Downloads/readytms` on the Mac Mini
**Server:** runs as `com.readytms.server` launchd job, listens on **port 3001** (NOT 5000 — that's AirPlay)
**Public URL:** `readytms.com` via Cloudflare Tunnel → port 3001
**Auto-deploy:** `com.readytms.autopull` polls GitHub `main` every 60 sec; runs `git pull → npm install → npm run build → restart`

---

## 1. What's already built ✅

### Mobile app (Capacitor React)
- Branch: `main` (merged from `feat/mobile-driver-app` + `add-mobile-preview`)
- 4 screens: Login, Home (duty toggle + load list + GPS push), Load Detail (status advance + camera POD), Settings
- Native plugins dynamically loaded: `@capacitor/geolocation`, `camera`, `push-notifications`, `status-bar`, `network`
- Reuses existing backend: `/api/driver/login`, `/api/auth/user`, `/api/loads`, `/api/driver/loads/:id/pod`, `/api/gps`
- Bundle size: ~62 KB gzipped
- Source: `/mobile/**`
- Built output: `/dist-mobile/**` (committed to repo)

### Server changes (in `main`)
- `server/index.ts`: serves `dist-mobile/` at `/m` for browser preview
- `server/index.ts`: CORS allowlist for `capacitor://localhost`, `https://localhost`, `ionic://localhost` (was on feat branch, may need re-merge)
- `server/auth.ts`: session cookie `SameSite=None; Secure` in production (was on feat branch, may need re-merge)

### Build pipeline
- `npm run mobile:build` produces `/dist-mobile`
- `npm run build` now does: `vite build && vite build --config vite.config.mobile.ts && esbuild server/index.ts ...`
- `vite.config.mobile.ts` controls mobile bundle
- `capacitor.config.ts` controls native shell

### Codemagic
- ✅ Account created, repo connected (`miretech/readytms`)
- ✅ `codemagic.yaml` in repo root has both `ios-workflow` and `android-workflow`
- ✅ Detects `feat/mobile-driver-app` branch
- ❌ NOT yet configured: App Store Connect API key, Android keystore upload, Google Play service account JSON

### Android keystore
- ✅ Generated: file delivered to user via chat earlier
- File name: `readytms-driver.keystore`
- Alias: `readytms-driver`
- Password: `jQCPcpbUgJFZI8xwaJCeFTsLG0rTOt3` (user has this in 1Password)
- Not yet uploaded to Codemagic

### App store accounts
- ❌ Apple Developer Program — NOT enrolled ($99/yr at https://developer.apple.com/programs/enroll/)
- ❌ Google Play Console — NOT enrolled ($25 once at https://play.google.com/console/signup)

### Placeholder assets
- `resources/icon.png` (1024×1024 brand gradient)
- `resources/splash.png` (2732×2732)

---

## 2. The one bug blocking preview right now 🐛

`/m` returns the regular TMS HTML, NOT the mobile bundle.

**Confirmed locally**:
```bash
$ curl -s http://localhost:3001/m | grep -i title
<title>Ready TMS - Transportation Management System</title>   # WRONG
```

Expected: `<title>ReadyTMS Driver</title>` (from `dist-mobile/index.html`)

**Root cause** (almost certainly): one of:
1. `dist/index.js` was built before my `server/index.ts` change reached the Mac. Verify with `grep -c "dist-mobile" dist/index.js` — if 0, rebuild needed.
2. Express route ordering: `registerRoutes(app)` registers a catch-all (`app.get("*", ...)` or similar) BEFORE my `/m` static is added. Need to move `/m` ABOVE registerRoutes, OR ensure `/m` takes precedence.

**My `/m` route in `server/index.ts`** (lines after `const server = await registerRoutes(app);`):
```ts
const mobileDist = path.resolve(import.meta.dirname, "..", "dist-mobile");
if (fs.existsSync(mobileDist)) {
  app.use("/m", express.static(mobileDist));
  app.get(/^\/m(\/.*)?$/, (_req, res) => {
    res.sendFile(path.join(mobileDist, "index.html"));
  });
}
```

**Fix** (next agent): move this block to BEFORE `registerRoutes(app)`. Like:
```ts
// BEFORE registerRoutes
const mobileDist = path.resolve(import.meta.dirname, "..", "dist-mobile");
if (fs.existsSync(mobileDist)) {
  app.use("/m", express.static(mobileDist, { index: "index.html" }));
  app.get(/^\/m(\/.*)?$/, (_req, res) => {
    res.sendFile(path.join(mobileDist, "index.html"));
  });
}
const server = await registerRoutes(app);
```

Then: `npm run build && launchctl kickstart -k gui/$(id -u)/com.readytms.server`

Then verify: `curl -s http://localhost:3001/m | grep -i title` should print `<title>ReadyTMS Driver</title>`.

Then user opens `readytms.com/m` on phone → should see driver login screen.

---

## 3. What's left to do (in order)

### Phase A — Get the `/m` web preview working (next agent should finish this first, 10 min)
1. Fix the route ordering bug above
2. Confirm `curl http://localhost:3001/m | grep title` returns Driver title
3. User opens `readytms.com/m` on phone, logs in, confirms it loads

### Phase B — App store accounts (user action, ~30 min + waiting)
4. Apple Developer enrollment ($99) — verification 24–48h
5. Google Play enrollment ($25) — verification 1–3 days
6. While waiting, no other work blocked

### Phase C — Codemagic signing setup (next agent helps user click through, ~20 min)
7. **App Store Connect API key** — user generates `.p8` in App Store Connect → Users → Integrations → App Store Connect API → "Admin" key. Upload to Codemagic Settings → Integrations → App Store Connect (need Key ID + Issuer ID + the .p8 file).
8. **Bundle ID** registered in Apple Developer → Identifiers → `com.readytms.driver`.
9. **Android keystore** — user has the file on Mac. Codemagic Settings → Code signing identities → Android keystores → "Add". Name: `readytms_driver_keystore`. Upload `.jks`. Password + alias from 1Password.
10. **Google Play service account** — user creates in Play Console → Setup → API access → Create service account → download JSON → grant "Release manager" → upload JSON to Codemagic Settings → Integrations → Google Play.

### Phase D — First build (Codemagic, ~15 min per platform)
11. Codemagic project → `ios-workflow` → Start new build → branch `main` (or `feat/mobile-driver-app`).
12. iOS build → archives → auto-publishes to TestFlight Beta group "ReadyTMS Drivers".
13. Same for `android-workflow` → auto-publishes to Play Internal Testing track.

### Phase E — Test install on driver phone (user, 5 min)
14. iOS: user adds driver's email to TestFlight External Testing → driver installs TestFlight app → opens invite → installs.
15. Android: user adds driver's email to Internal Testing → driver opens join link → installs.

### Phase F — Public release (user + Apple/Google review)
16. iOS: App Store Connect → fill listing using `mobile/STORE_LISTING.md` → upload screenshots → submit. Review 1–3 days.
17. Android: Play Console → fill listing → upload AAB (Codemagic uploaded it) → submit. Review 1–7 days first time.

---

## 4. Files the next agent needs to know about

| File | Purpose |
|---|---|
| `mobile/src/App.tsx` | Screen router |
| `mobile/src/api.ts` | API client (calls existing backend) |
| `mobile/src/native.ts` | Capacitor plugin glue + browser fallbacks |
| `mobile/src/screens/*.tsx` | 4 driver screens |
| `mobile/src/styles.css` | Dark mobile styles |
| `mobile/index.html` | Mobile bundle entry |
| `mobile/README.md` | Build/deploy doc |
| `mobile/CHECKLIST.md` | "What you do at Mac Mini" |
| `mobile/STORE_LISTING.md` | App Store + Play Store copy |
| `capacitor.config.ts` | Native shell config |
| `vite.config.mobile.ts` | Mobile bundle Vite config |
| `codemagic.yaml` | CI build workflows |
| `resources/icon.png` | Placeholder app icon |
| `resources/splash.png` | Placeholder splash |
| `server/index.ts` (modified) | Has `/m` route ⚠️ BUG: order |
| `server/auth.ts` (modified, on feat branch only) | SameSite=None for native |

---

## 5. Critical knowledge for the next agent

- **Port 5000 is hijacked by macOS Control Center.** Don't ever curl localhost:5000 — that's AirPlay. The actual server is on **3001**.
- **Repo is at `~/Downloads/readytms`**, not `~/readytms`.
- **Auto-pull script lives somewhere; the user said "deploy.sh" but path unclear.** If you need to bypass auto-pull, use:
  - `cd ~/Downloads/readytms && git pull origin main`
  - `npm install && npm run build`
  - `launchctl kickstart -k gui/$(id -u)/com.readytms.server`
- **Don't push `dist-mobile/` to gitignore.** It's intentionally committed so deploys work without needing the build step.
- **`feat/mobile-driver-app` branch** has the FULL native app config including CORS + session cookie changes. `main` only has the `/m` preview pieces. If shipping native apps, those server changes need to come over to main too.
- **`add-mobile-preview` branch** is already merged to main.
- **package.json has a pre-existing duplicate `googleapis` key.** Replit added it twice (line 77 and 85). Not blocking but ugly. Fix when convenient.

---

## 6. Quick smoke test commands the next agent will run

```bash
# Are we on latest main?
cd ~/Downloads/readytms && git log --oneline -3
# expected to include: 628c661 Merge add-mobile-preview

# Does dist-mobile exist?
ls dist-mobile/
# expected: assets/  index.html

# Did our /m route get bundled?
grep -c "dist-mobile" dist/index.js
# expected: > 0

# Is server running on 3001?
lsof -iTCP -sTCP:LISTEN -n -P | grep node
# expected: node ... TCP *:3001 (LISTEN)

# Does /m serve the right HTML?
curl -s http://localhost:3001/m | grep title
# CURRENT (BUG): <title>Ready TMS - Transportation Management System</title>
# EXPECTED:      <title>ReadyTMS Driver</title>
```

---

## 7. Hand the next agent this exact prompt

> The previous agent built a mobile driver app at `mobile/` and a web preview at `/m`. Their state is documented in `MOBILE_HANDOFF.md` in the repo root. Read it first.
>
> Your job: finish Phase A (fix the `/m` route ordering bug) so `readytms.com/m` loads the driver login screen instead of a TMS 404. Then if user is ready, walk them through Phase C (Codemagic signing identities) to get the first iOS + Android builds running.
>
> You have localhost access. Don't ping the user with diagnostic curl commands — run them yourself.

---

End of handoff.
