# Release guide for the owner (UGCad shell 1.3.0)

Plain steps, in order. Nothing here contains a secret: only names and locations. Never commit keystores, `.p8`, `.p12`, `.mobileprovision`, `google-services.json`, `GoogleService-Info.plist` or passwords (`.gitignore` already blocks them). This PC and your GitHub account had malware injected before: keep installing packages with `npm install --ignore-scripts`, and check `git status` for files you did not create before every build.

Order of work: **A. production website + backend -> B. accounts and keys -> C. test accounts -> D. build and test on TestFlight / Internal testing -> E. submit -> F. after release.**

---

## A. Put the new website and backend live first (the app shows the live site)
The app loads `https://ugcad.io/`. On 2026-10-26 the live bundle did not contain the shell code (no `UGCadShell`, no Apple sign-in), so a store build would show the old site.
1. Website: deploy `ugcad-frontend` branch `new-ui` to the Vercel project that serves `ugcad.io` (the site answers `Server: Vercel`; `ugcad-frontend/vercel.json` holds the config). Include the files from `WEBSITE_BACKEND_GAPS.md`: `public/.well-known/apple-app-site-association`, `public/.well-known/assetlinks.json`, `public/app-config.json`, updated `vercel.json`, updated privacy and delete-account pages.
2. Backend: deploy `ugcad-backend` (`server.py`) to AWS (the exact service is not recorded in the repos; ask whoever set it up). New routes the shell needs: `POST/DELETE /api/notifications/device-token`, `/api/blocks`, `/api/reports`, `/api/admin/reports`, the updated `/api/auth/apple` and `DELETE /api/profile`.
3. Smoke test in a desktop browser with the shell marker: open DevTools console on `https://ugcad.io/?app=1` and check the phone UI loads; check `https://ugcad.io/.well-known/assetlinks.json` returns JSON (not the website).
4. **Freeze**: after the store review starts, do not deploy anything risky until it ends.

## B. Accounts, keys and files to prepare (once)

| What | Where you get it | Where it goes | Used for |
|---|---|---|---|
| Apple Developer Program, type **Organization** | developer.apple.com -> Membership. Confirm "Entity type: Organization" and the team id (the repo uses `3LCA4AA483`, listed under a person's name in old scripts: confirm) | n/a | publishing under the company (guideline 5.1.1(ix)) |
| App ID `io.ugcad.app` with capabilities **Sign In with Apple**, **Push Notifications**, **Associated Domains** | Certificates, Identifiers & Profiles -> Identifiers | Xcode signing (automatic) | login, push, universal links |
| **App Store Connect API key** (.p8, Key ID, Issuer ID) | App Store Connect -> Users and Access -> Integrations -> App Store Connect API -> Generate (role: App Manager) | file `~/.appstoreconnect/private_keys/AuthKey_<KEYID>.p8`; env `ASC_KEY_ID`, `ASC_ISSUER_ID`, `APPLE_TEAM_ID` | `scripts/ios-release.sh`, `asc-*.mjs`. The scripts still carry default ids from an older account: always export your own |
| **APNs key** (.p8) | Apple Developer -> Keys -> + -> Apple Push Notifications service (APNs); download once | upload in Firebase console -> Project settings -> Cloud Messaging -> Apple app configuration | iOS push |
| **Sign in with Apple key** (.p8, Key ID) | Apple Developer -> Keys -> + -> Sign in with Apple -> configure with primary App ID `io.ugcad.app` | AWS env `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_SIGNIN_KEY` (the .p8 text) once backend task B-5 is done | revoking tokens at account deletion |
| **Firebase project** (one for both apps) | console.firebase.google.com: add iOS app `io.ugcad.app` and Android app `com.ugcapp` | `GoogleService-Info.plist` -> `ugcadapp/ios/` ; `google-services.json` -> `ugcadapp/android/app/` (both git-ignored) | push (FCM) |
| **Firebase service account JSON** | Firebase -> Project settings -> Service accounts -> Generate new private key | AWS env `FIREBASE_CREDENTIALS_JSON` (raw JSON or base64) or `FIREBASE_CREDENTIALS_PATH` | backend sends pushes (`send_push_to_user` in `server.py`) |
| **Google OAuth client IDs** (Google Cloud project number `193113275370`) | console.cloud.google.com -> APIs & Services -> Credentials | **Web** client id = backend env `GOOGLE_CLIENT_ID` and `GOOGLE_WEB_CLIENT_ID` in `ugcadapp/src/config.ts`; **iOS** client (bundle `io.ugcad.app`) -> `GOOGLE_IOS_CLIENT_ID` and its reversed id in `Info.plist` URL types; **Android** client (package `com.ugcapp`) with the SHA-1 of: Play App Signing key, upload key, debug key | Google sign-in on both platforms |
| Google OAuth consent screen | same console | Publish to "In production", add `https://ugcad.io/privacy`, authorized domain `ugcad.io`, support e-mail | otherwise Google login shows a warning or is limited to test users |
| **Play upload keystore** | already exists: `C:\Users\meetr\Desktop\Ugcad\_secrets\ugcad-release.keystore` (used for the v1.2.11/1.2.12 bundles) | `~/.gradle/gradle.properties` (user-level) with `UGCAD_UPLOAD_STORE_FILE`, `UGCAD_UPLOAD_STORE_PASSWORD`, `UGCAD_UPLOAD_KEY_ALIAS`, `UGCAD_UPLOAD_KEY_PASSWORD` | signing the AAB. Keep a second encrypted backup |
| Play App Signing SHA-256 and upload-key SHA-256 | Play Console -> Test and release -> Setup -> App signing; and `keytool -list -v -keystore ugcad-release.keystore` | `public/.well-known/assetlinks.json` | Android App Links |
| Razorpay live keys | Razorpay dashboard | Admin -> Payment gateways on ugcad.io (not in any repo) | wallet recharge |
| A Mac with **Xcode 26** (current requirement: confirm in App Store Connect), CocoaPods, Ruby, Node >= 22.11 | borrow/rent a Mac (MacinCloud, MacStadium) or use a GitHub Actions `macos` runner / Xcode Cloud | n/a | iOS archive. This Windows PC cannot build iOS |

Also set (backend, cannot be seen from the repo): `APPLE_BUNDLE_ID=io.ugcad.app` (or leave unset: that is the default), `JWT_SECRET` not the default.

## C. Reviewer accounts (do before TestFlight)
Follow `docs/APP_REVIEW_NOTES.md` section 2. Test both logins on production with a normal browser first.

## D. Build and upload

### D1. Android (Windows is fine)
```
cd C:\Users\meetr\Desktop\Ugcad\ugcadapp
npm install --ignore-scripts
npm run typecheck
npm test
cd android
gradlew.bat bundleRelease        (or: npm run build:android from the repo root)
```
Output: `android/app/build/outputs/bundle/release/app-release.aab`. If the build prints the "UGCAD_UPLOAD_STORE_FILE is not set" warning, stop: Play would reject a debug-signed bundle. Before uploading, inspect the merged manifest permissions (Android Studio -> Build -> Analyze APK, or `bundletool`): there must be no `READ_MEDIA_*`, no `AD_ID`, no location. Then Play Console -> Test and release -> **Internal testing** -> Create release -> upload the AAB -> Save -> Review -> roll out to internal testers. Install from the Play link, run `docs/PLAY_STORE_CHECKLIST.md` section 11, then **Production** -> create release from the same bundle with a **staged rollout of 20%**, raise to 100% after 48 h without crashes (Android vitals).

### D2. iOS (needs a Mac)
```
cd ugcadapp
npm install --ignore-scripts
cd ios && bundle install && bundle exec pod install && cd ..
export APPLE_TEAM_ID=XXXXXXXXXX ASC_ISSUER_ID=<issuer> ASC_KEY_ID=<keyid>
scripts/ios-release.sh              # archive, export .ipa, validate, upload to App Store Connect, fill TestFlight
SKIP_UPLOAD=1 scripts/ios-release.sh   # archive + export only (.ipa in ios/build/release)
```
The script picks the next build number from App Store Connect (set `BUILD_NUMBER=26` explicitly the first time). If `altool` validation or upload fails on a newer Xcode, open `ios/ugcadapp.xcworkspace` in Xcode -> Product -> Archive -> Distribute App -> App Store Connect -> Upload (same result). Before archiving check on the Mac: `GoogleService-Info.plist` is in the `ugcadapp` target, capabilities tab shows Sign in with Apple, Push, Associated Domains, and the Info.plist and entitlements match `APPLE_REVIEW_CHECKLIST.md` section 6. The iOS files were written without Xcode on Windows: the first Release archive may need small fixes (`AppDelegate.swift`, Podfile).
1. App Store Connect -> TestFlight: wait for "Processing" to finish (10-30 min), answer the export-compliance prompt (the Info.plist key already answers "no non-exempt encryption").
2. Install on a real iPhone via the TestFlight app. Run section 7 of `APPLE_REVIEW_CHECKLIST.md`.
3. Edit `scripts/asc-testflight.mjs` `META` (description, subtitle, keywords, URLs, review notes) first; it still contains old text.

## E. Submit
- iOS: App Store Connect -> the app -> iOS App -> 1.3.0 -> select build 26 -> fill metadata (`DIFFERENTIATION.md` section 4), screenshots from the TestFlight build (1320 x 2868), App Privacy (table in `APPLE_REVIEW_CHECKLIST.md`), Age rating (13+/16+ answers then override to 18+), App Review Information (demo brand login, contact, notes from `APP_REVIEW_NOTES.md` section 1), Pricing Free, Availability India (and others), **Add for Review**. In "Version Release" choose "Manually release" so you can control the moment.
- Android: Data safety, App content (App access with both logins, ads No, financial features, content rating, target audience 18+), store listing, then promote the release. Check Policy status shows no issues.
- Reply to Apple within 24 hours if they message you; use the text in `APP_REVIEW_NOTES.md` sections 3 and 4.

## F. Version bumping (every new store build)
| Place | Field | Rule |
|---|---|---|
| `package.json` | `version` | marketing version, `src/config.ts` `SHELL_VERSION` reads it; compared with `minSupportedVersion` |
| `src/config.ts` | `SHELL_BUILD` | = Android versionCode = iOS build number (currently 26) |
| `android/app/build.gradle` | `versionCode`, `versionName` | `versionCode` must be strictly higher than any previous upload (last: 25; now 26) |
| iOS Xcode project (`ios/ugcadapp.xcodeproj/project.pbxproj`) | `MARKETING_VERSION`, `CURRENT_PROJECT_VERSION` | marketing version = package.json; build number unique per marketing version (the script sets it from `BUILD_NUMBER`) |
Commit the bump, tag `v1.3.0`, then build. Never reuse a build number.

## G. How website deploys reach the app vs what needs a new binary
Because the app is a window on `https://ugcad.io`, every deploy of `ugcad-frontend` and `ugcad-backend` reaches **all installed app versions immediately**, with no store review.

| Change | New store build needed? | Notes |
|---|---|---|
| Screens, copy, colours, bug fixes, new pages in `ugcad-frontend/src/app` | No | Deploy the website. Keep API changes backward compatible: old app versions stay installed for months |
| Backend endpoints, pricing, rules, moderation | No | Same. Do not remove fields old websites still read |
| Legal pages, privacy, support text | No | |
| New bridge message used by the website (for example a new native feature) | **Yes** | Old shells ignore unknown messages (contract), so the website must time out gracefully and offer the old behaviour. Check `window.__UGCAD_SHELL_VERSION__` or `app:info` before using a new feature |
| New permission or Info.plist usage string, new entitlement, background mode, URL scheme, associated domain | **Yes** | iOS/Android policy: needs review |
| Upgrading React Native, WebView, Firebase, Google/Apple sign-in libraries | **Yes** | |
| Changing the allowed-host list (`ALLOWED_HOSTS` in `src/config.ts`), payment domains, deep-link hosts | **Yes** | |
| App icon, splash, name, store metadata | Icon/splash yes; metadata no (but metadata changes need a store review) | |
| Apple/Google target SDK or Xcode SDK deadlines | **Yes** | Apple: a build with the current Xcode/SDK; Play: target API each 31 August |
| Switching on a hidden website feature | No | But: Apple 2.3.1 forbids hidden or changed-purpose features after approval. Do not change what the app is. Payments for digital goods would still need IAP |

Rules of thumb: keep one active production site version; use `?app=` or feature flags based on the shell version rather than separate deployments; never deploy on Fridays or while a store review is running.

## H. Forced updates with `app-config.json`
File: `https://ugcad.io/app-config.json` (source: `ugcad-frontend/public/app-config.json`, headers `no-cache` + `application/json` in `vercel.json`). The shell reads it at launch (`src/shell/versionCheck.ts`), compares `SHELL_VERSION` with `minSupportedVersion`, and shows an "Update required" screen with the store button when the installed version is lower. It fails open: a missing or broken file never blocks users.
```
{ "minSupportedVersion": "1.3.0",
  "storeUrls": { "android": "https://play.google.com/store/apps/details?id=com.ugcapp",
                 "ios": "https://apps.apple.com/app/id<NUMERIC_ID>" } }
```
Procedure: (1) publish the new build to both stores and wait until it is live in India; (2) set `minSupportedVersion` to it and deploy the website; (3) check with an old build. Setting it before the new version is live locks users out. Start with `"0.0.0"`. To undo: set `"0.0.0"` and redeploy (cached copies refresh at next launch). Note: the file is currently absent and the host returns the HTML app with 200; the shell handles it, but create the file.

## I. Rollback
| Layer | How |
|---|---|
| Website | Vercel -> Deployments -> choose the last good deployment -> "Promote to Production" (instant). Do this first when a bad website deploy breaks the app |
| Backend | Re-deploy the previous image/task definition on AWS (not recorded in the repos: write down the exact service and command once). Keep database migrations backward compatible |
| Android app | Play Console -> Production -> **Halt rollout** (if staged), then publish the previous bundle again with a **higher** versionCode (you cannot reuse or lower a code). Set `app-config.json` min version unchanged |
| iOS app | App Store has no binary rollback: pause "Phased Release", **Remove from sale** only in emergencies, or submit a fixed build and request an **expedited review** (Contact Us -> App Review -> Expedited). The fastest mitigation is usually a website rollback because the content is remote |
| Forced-update mistake | `app-config.json` -> `"minSupportedVersion": "0.0.0"` and redeploy the website |
| Push problems | Remove `FIREBASE_CREDENTIALS_JSON` from the backend: pushes become a silent no-op, in-app notifications keep working |

## J. After release
1. Watch App Store Connect crashes / Play Android vitals for 48 h; check the admin report queue (24-hour promise).
2. Keep both reviewer accounts intact and funded for future updates.
3. Keep the privacy label, Data safety form and `PrivacyInfo.xcprivacy` in step whenever you add an SDK or a data field.
4. Calendar: Play target-API deadline every 31 August; Apple Xcode/SDK minimum every spring; Razorpay and Firebase key rotations.
