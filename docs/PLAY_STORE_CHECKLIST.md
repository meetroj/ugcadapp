# Google Play checklist: `com.ugcapp` v1.3.0 (versionCode 26)

Audit date 2026-10-26. Same status tags as `APPLE_REVIEW_CHECKLIST.md` (DONE / NEEDS WEBSITE / NEEDS BACKEND / NEEDS OWNER / NEEDS APP). Starting point: the earlier answers in `ugcapp/play-console-answers.html` (for the previous native app). Several of them are now **out of date**; the corrections are marked "CHANGED".

Play policy dates and numbers below are from my knowledge of Play policy as of 2026; I could not open Play Console from here, so each number marked "(confirm in Console)" must be checked in Policy status / App content on the day.

---

## 0. Top blockers
| # | Blocker | Status |
|---|---|---|
| 1 | `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_MEDIA_VISUAL_USER_SELECTED`, `READ_EXTERNAL_STORAGE` are declared in `ugcadapp/android/app/src/main/AndroidManifest.xml`. They trigger the **Photo and Video Permissions policy**; the app only needs one-off picking, which the system photo picker / file chooser does with no permission | NEEDS APP: delete these four permissions (keep `CAMERA`, `RECORD_AUDIO`, `POST_NOTIFICATIONS`, `INTERNET`, `ACCESS_NETWORK_STATE`), and make `src/shell/permissions.ts` answer `granted` for kind `photos` on Android instead of requesting them |
| 2 | `assetlinks.json` does not exist: `https://ugcad.io/.well-known/assetlinks.json` returns the HTML app (status 200, content-type text/html) so App Links never verify | NEEDS WEBSITE + OWNER (SHA-256) |
| 3 | The manifest's `autoVerify` filter lists `www.ugcad.io`, but `www` answers **308 redirect** to `https://ugcad.io` (checked live): a redirected host cannot be verified and on Android 11 and older one failed host cancels verification for the whole filter | NEEDS APP: remove `www.ugcad.io` from the `autoVerify` intent filter (keep the apex only) |
| 4 | Test credentials for "App access" (brand and creator) | NEEDS OWNER (see `APP_REVIEW_NOTES.md` section 2) |
| 5 | UGC policy: in-app report + block, moderation, terms | same gaps as Apple 1.2 (see `WEBSITE_BACKEND_GAPS.md`) |
| 6 | Delete-account web page says e-mail only and names the old Android app | NEEDS WEBSITE |
| 7 | Data safety form must be re-done (it was for the old native app) | NEEDS OWNER, answers below |

---

## 1. Data safety form (App content -> Data safety)
Top-level answers:
| Question | Answer | Evidence |
|---|---|---|
| Does your app collect or share any of the required user data types? | Yes | below |
| Is all of the user data collected by your app encrypted in transit? | Yes | HTTPS only: `API_BASE = https://app.ugcad.io/api`, `WEB_URL = https://ugcad.io/` in `src/config.ts`; `android:networkSecurityConfig` should forbid cleartext (NEEDS APP: confirm `res/xml/network_security_config.xml` has `cleartextTrafficPermitted="false"` for release) |
| Do you provide a way for users to request that their data is deleted? | Yes | In-app Settings -> Delete account (`DELETE /api/profile`) and web URL below |
| Account creation methods | Username and password; OAuth (Google). CHANGED: Google sign-in is live now (old answer said "only username and password") | `google_auth`, `src/shell/auth/google.ts` |
| Delete account URL | `https://ugcad.io/delete-account` (must explain the in-app route and the e-mail route, name "UGCad", list what is deleted and kept) | page exists: NEEDS WEBSITE to update text (see gaps W-12) |
| Delete data without deleting account? | Optional: profile fields and portfolio items can be removed in-app | |
| Independent security review | No | |

Data types (declare each as collected; **Shared = No** because processors acting for us (AWS hosting, Razorpay, Firebase Cloud Messaging) are service providers under Play's definition; **Ephemeral = No**):
| Play category / type | Collected | Optional? | Purposes | Notes |
|---|---|---|---|---|
| Personal info: Name | Yes | Required | App functionality, Account management | |
| Personal info: Email address | Yes | Required | App functionality, Account management, Communications about the app (service e-mails) | do not tick Advertising or Marketing |
| Personal info: User IDs | Yes | Required | App functionality, Account management | |
| Personal info: Address | Yes | Required for brands (billing) / creators who receive products (delivery) | App functionality, Fraud prevention, security and compliance | |
| Personal info: Phone number | Yes | Required at sign-up (backend `normalize_signup_phone`) | App functionality, Account management. CHANGED from "Optional" | |
| Personal info: Other info (bio, DOB, gender, PAN, Aadhaar) | Yes | Aadhaar optional, others required for creators who withdraw | App functionality, Fraud prevention, security and compliance | |
| Financial info: User payment info | Yes | Optional (creators who withdraw) | App functionality, Fraud prevention | Bank account / UPI id for payouts. Card or UPI entries in Razorpay Checkout go straight to Razorpay |
| Financial info: Purchase history | Yes | Required | App functionality | deals, invoices |
| Financial info: Other financial info | Yes | Required | App functionality, Fraud prevention | wallet balance, transactions, GSTIN |
| Messages: Other in-app messages | Yes | Required | App functionality | chat and offer cards |
| Photos and videos: Photos / Videos | Yes | Optional | App functionality | portfolio, deliverables, KYC documents |
| Audio: Voice or sound recordings | Yes | Optional | App functionality | only sound inside videos the user uploads |
| Files and docs | Yes | Optional | App functionality | PDFs for KYC / dispute evidence |
| App activity: App interactions | Yes | Required | Analytics | PostHog (anonymous) |
| App activity: Other user-generated content | Yes | Required | App functionality | briefs, reviews, bios |
| App info and performance: Crash logs / Diagnostics | No | | | no Crashlytics/Sentry in `package.json`; revisit if added |
| Device or other IDs | Yes | Required | App functionality (push), Fraud prevention | FCM token + Firebase installation id |
| Location (approximate or precise) | **No** | | | not requested; `ACCESS_*_LOCATION` not in the manifest |
| Contacts, Calendar, Health, Web browsing history, Search history | No | | | |
| Do NOT tick | Advertising or marketing, Personalization, Developer communications as marketing | | | notifications are transactional |

Advertising ID: the app does not use it. Verify after building: `aapt dump permissions app-release.apk | grep AD_ID` must be empty (Firebase Messaging alone does not add it; Firebase Analytics would). Declare "No" in App content -> Advertising ID.

---

## 2. Target API level and device requirements
| Item | Value | Status |
|---|---|---|
| `targetSdkVersion` | 36 (`ugcadapp/android/build.gradle`: min 24, compile 37, target 36) | DONE. Play requires new apps and updates to target the latest-but-one API level by 31 August each year (API 35 from 31 Aug 2025; API 36 from 31 Aug 2026): 36 satisfies it (confirm in Console) |
| 16 KB memory page size | Play requires apps with native code that target Android 15+ to support 16 KB pages (since 1 Nov 2025). RN 0.87 / Hermes and current Firebase/Google libraries ship aligned `.so` files. Check with Android Studio -> Build -> Analyze APK, or `bundletool` alignment check | NEEDS APP (verify once on the release AAB) |
| Architectures | `armeabi-v7a, arm64-v8a, x86, x86_64` (gradle.properties). 64-bit included | DONE |
| Min SDK | 24 (Android 7) | DONE |
| AAB size | The old bundle was ~53 MB; the shell should be far smaller | verify |

---

## 3. Content rating (IARC questionnaire)
Category: **Social / Communication** is closest (old answer: "Social"; keep it). Answers:
| Question | Answer |
|---|---|
| Does the app allow users to interact or exchange content with others? | Yes (chat, profiles, briefs) |
| Do users share their location with other users? | No |
| Digital purchases | No (physical-world services only) |
| Violence, sexual content, profanity, controlled substances, gambling | None |
| Unrestricted web access | No |
Expected result: Teen/"12+" band with the "Users Interact" and "In-app purchases: no" labels. Target audience: **18 and over only** (KYC, contracts, payments). Do not opt into Families.

## 4. App access (App content -> App access)
Select "All or some functionality is restricted" and add two instruction sets:
```
Instruction set 1 - Brand: login with e-mail REVIEW_BRAND_EMAIL and password REVIEW_BRAND_PASSWORD. No OTP, no 2FA. The account is approved with a funded wallet and sample deals.
Instruction set 2 - Creator: login with e-mail REVIEW_CREATOR_EMAIL and password REVIEW_CREATOR_PASSWORD. Approved, KYC verified.
Google sign-in works with any Google account (new accounts go through staff approval and will see a "profile under review" screen). Payments use Razorpay; you do not need to pay.
```
How to create both accounts: `APP_REVIEW_NOTES.md` section 2. Status: NEEDS OWNER.

## 5. Permissions declarations
| Permission | Needed for | Declaration | Status |
|---|---|---|---|
| `INTERNET`, `ACCESS_NETWORK_STATE` | load the service | none | DONE |
| `POST_NOTIFICATIONS` (Android 13+) | push; requested after login / in Settings, not at install | none | DONE |
| `CAMERA` | capture photo/video inside the web file chooser (`<input type=file capture>`) | none beyond Data safety (photos/videos). `uses-feature camera required=false` is set | DONE |
| `RECORD_AUDIO` | sound in recorded videos | none beyond Data safety | DONE |
| `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_MEDIA_VISUAL_USER_SELECTED`, `READ_EXTERNAL_STORAGE (<=32)` | **not needed**: WebView file chooser uses the system picker | Photo and Video Permissions policy: access must be core and cannot be met by the Photo Picker; ours can, so a declaration would be refused | NEEDS APP: remove |
| `WRITE_EXTERNAL_STORAGE (<=28)` | RN WebView download manager on Android 9 and below | none (maxSdk 28) | DONE |
| `SCHEDULE_EXACT_ALARM`, `FOREGROUND_SERVICE`, `ACCESS_FINE_LOCATION`, `READ_CONTACTS` | not used | n/a | DONE (keep absent) |
| `<queries>` for `upi`, `phonepe`, `gpay`, `tez`, `paytmmp`, `bhim`, `tel`, `mailto`, `https` | hand-off to UPI apps / dialer / mail | package visibility is declared via intents, not `QUERY_ALL_PACKAGES` (not requested) | DONE |

## 6. Account deletion
- In-app: Settings -> Delete account (`ugcad-frontend/src/app/screens/shared/Settings.js`, `DELETE /api/profile`, `server.py` `delete_profile`). Verified to delete the user record and personal data; messages remain with the sender name blanked; financial records retained by law (see Apple checklist 5.1.1(v) for the open gaps).
- Web: `https://ugcad.io/delete-account` (`ugcad-frontend/public/delete-account/index.html`). It must (a) state the app and developer name, (b) list steps for requesting deletion without reinstalling the app, (c) list what is deleted/retained and for how long. Current text: e-mail only, "Android app com.ugcapp", says messages are deleted. NEEDS WEBSITE: update; mention the in-app path and Sign in with Apple/Google users.
- Link that URL in Play Console -> App content -> Data safety -> "Delete account URL".

## 7. User-generated content and Families policies
- Play's UGC policy needs: in-app reporting, ability to block, moderation with timely action, terms prohibiting objectionable content. Same implementation status as Apple 1.2 (`APPLE_REVIEW_CHECKLIST.md` section 1.2, `WEBSITE_BACKEND_GAPS.md` W-1..W-6, B-1..B-4). CHANGED: the old answer to "Ability to block users or content" was **No**; it becomes **Yes** only after the block UI ships (backend `POST /api/blocks` exists). The old file also referenced `POST /api/chat/report`, which does not exist: the real endpoints are `POST /api/report-user` and `POST /api/reports`.
- Families/children: not a children's app; no Designed for Families; target 18+. DONE.
- Sensitive permissions/ads/SDK: no ads SDK. DONE.

## 8. Payments policy (Razorpay)
- Play Billing is mandatory only for **digital** goods/services. UGCad's wallet pays for real-world creative services consumed outside the app (see `APPLE_REVIEW_CHECKLIST.md` section 3). Declare in App content -> Financial features: **Mobile payments and digital wallets** (as before). Not a loan, banking, crypto, trading or insurance app.
- CHANGED: the old file claimed the recharge bonus is empty; it is not: `WALLET_BONUS_TIERS` in `server.py:1366` gives +3% / +7% / +10% on INR 10,000 / 25,000 / 50,000 recharges. Bonus labels can remain on Android; they are hidden in iOS by recommendation.
- Subscription "Plans" and "Expert editing" are hidden in the shell. Do not enable them in the Android shell without Play Billing unless they are clearly services outside the app.
- Razorpay key must be a live key in production (`recharge_business_wallet` silently makes fake test orders if the key id contains "test").

## 9. Build, sign and upload the AAB
| Step | Detail |
|---|---|
| Upload key | The existing keystore `Desktop\Ugcad\_secrets\ugcad-release.keystore` (the one used for `ugcapp-v1.2.11-21.aab` / `v1.2.12-22.aab`). Gradle reads `UGCAD_UPLOAD_STORE_FILE`, `UGCAD_UPLOAD_STORE_PASSWORD`, `UGCAD_UPLOAD_KEY_ALIAS`, `UGCAD_UPLOAD_KEY_PASSWORD` from `~/.gradle/gradle.properties` or the CLI (`android/app/build.gradle`). Without them the bundle is signed with the debug key and Play rejects it (the build prints a warning) |
| Play App Signing | Already enabled for this app (same package, upload key unchanged). The certificate users receive is Google's app-signing key, not your upload key |
| Version | `versionCode 26`, `versionName "1.3.0"` (`android/app/build.gradle`). Every upload must have a higher versionCode than the last one in any track (last known: 25) |
| Command | `cd android && ./gradlew bundleRelease` -> `android/app/build/outputs/bundle/release/app-release.aab` (on Windows: `gradlew.bat bundleRelease`) |
| Firebase | `android/app/google-services.json` must be present (not committed) or push is disabled; the Gradle plugin applies only if the file exists |
| Test | Upload to **Internal testing** first, install from the Play link, test login with both accounts, then promote to Production with a staged rollout (20% -> 100%) |
| Listing | Short description (80 chars), full description (see `DIFFERENTIATION.md` section 4), icon 512x512, feature graphic 1024x500, 2-8 phone screenshots from the real app (min 320 px, 16:9 to 9:16). Privacy policy `https://ugcad.io/privacy` |
| If the Console account is a personal account created after Nov 2023 | Production access needs a closed test with 12+ testers for 14 days. Not needed for an existing published app |

## 10. App Links verification (`assetlinks.json`)
1. Get the SHA-256 fingerprints (NEEDS OWNER):
   - **App signing key** (what installed users get): Play Console -> Test and release -> Setup -> App signing -> "App signing key certificate" -> SHA-256 certificate fingerprint.
   - **Upload key** (for sideloaded release builds): `keytool -list -v -keystore ugcad-release.keystore -alias <ALIAS>` -> SHA256 line. Debug builds use the key in `android/app/debug.keystore` (SHA-1 `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` per the old Play answers file; use its SHA-256 only for local tests).
2. Publish `https://ugcad.io/.well-known/assetlinks.json` (no redirect, `application/json`):
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.ugcapp",
    "sha256_cert_fingerprints": [
      "<APP_SIGNING_KEY_SHA256>",
      "<UPLOAD_KEY_SHA256>"
    ]
  }
}]
```
   Vercel details in `WEBSITE_BACKEND_GAPS.md` W-9.
3. Manifest: keep only `ugcad.io` in the `autoVerify` filter (see blocker 3).
4. Verify: `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://ugcad.io&relation=delegate_permission/common.handle_all_urls` must list the package; on a device `adb shell pm get-app-links com.ugcapp` shows `ugcad.io: verified`; `adb shell am start -a android.intent.action.VIEW -d "https://ugcad.io/privacy"` opens the app.

## 11. Pre-launch report and final checks
- Run Play's pre-launch report (crawler): it needs the test accounts from "App access"; make sure the Razorpay and Google buttons do not crash it.
- Android vitals: crash on cold start without network must show the error screen (`ErrorScreen.tsx`).
- Policy status page must show no warnings before promoting.
