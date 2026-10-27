# UGCad app (shell)

A thin React Native app. It shows ONE full-screen WebView that opens the live website
**https://ugcad.io** (nothing of the website is bundled). Native code only provides what a web
page cannot: Google / Apple sign-in, push notifications, camera / photo / microphone
permissions, share and download, deep links and the splash screen. The website detects the shell
through the user agent token `UGCadShell/<version>` and talks to it through a JSON message
bridge. Full details: [docs/](docs/) (bridge contract, architecture, QA checklist).

Store identity is unchanged, so this build updates the existing listings:

| | Android | iOS |
|---|---|---|
| Id | `com.ugcapp` | `io.ugcad.app` |
| Version | 1.3.0 (versionCode 26) | 1.3.0 (build 26) |

Stack: React Native 0.87, React 19, `react-native-webview`, `@react-native-google-signin/google-signin`,
`@invertase/react-native-apple-authentication`, `@react-native-firebase/{app,messaging}`,
`@react-native-async-storage/async-storage`, `react-native-device-info`, `react-native-safe-area-context`.

## Setup

Needs Node >= 22.11, JDK 17, Android SDK (`ANDROID_HOME`); for iOS a Mac with Xcode, CocoaPods and Ruby.

```sh
npm install --ignore-scripts      # --ignore-scripts on purpose (supply-chain safety)
npm run typecheck && npm test     # tsc --noEmit, jest
```

## Run

```sh
npm start                         # Metro (stop it before git pull / merge)
npm run android                   # debug build on a device / emulator
cd ios && pod install && cd ..    # first time, and after every dependency change
npm run ios
```

Debug builds allow cleartext only for Metro on localhost / 10.0.2.2
(`android/app/src/debug/res/xml/network_security_config.xml`); release is HTTPS only.

## Build for the stores

**Android (AAB for Play):**

```sh
npm run build:android             # -> android/app/build/outputs/bundle/release/app-release.aab
```

Needs the upload key in `~/.gradle/gradle.properties` (user level, never in git):

```properties
UGCAD_UPLOAD_STORE_FILE=C:/absolute/path/ugcad-release.keystore
UGCAD_UPLOAD_STORE_PASSWORD=...
UGCAD_UPLOAD_KEY_ALIAS=ugcad
UGCAD_UPLOAD_KEY_PASSWORD=...
```

Without them the release is signed with the debug key (a warning is printed) and Play rejects it.
Release builds are minified (R8) with resource shrinking.

**iOS (IPA to TestFlight):** on a Mac, after the Owner setup below:

```sh
export APPLE_TEAM_ID=XXXXXXXXXX ASC_ISSUER_ID=<issuer uuid> ASC_KEY_ID=<key id>
# AuthKey_<ASC_KEY_ID>.p8 must be in ~/.appstoreconnect/private_keys
scripts/ios-release.sh            # pod install, archive, export, validate, upload, fill TestFlight
SKIP_UPLOAD=1 scripts/ios-release.sh   # archive + export only
```

Other scripts: `scripts/asc-testflight.mjs`, `scripts/asc-screenshots.mjs`, `scripts/asc-next-build.mjs`
(App Store Connect API; they only read `ASC_*` / `BETA_CONTACT_*` / `DEMO_ACCOUNT_*` env vars).
The store text inside `asc-testflight.mjs` (description, keywords, review notes) is copy from the
old native app: review it before the first run.

## Secrets the owner must provide (none are in the repo)

| File / variable | Used for | Where it goes |
|---|---|---|
| Android upload keystore + `UGCAD_UPLOAD_*` | signing the AAB | `~/.gradle/gradle.properties` |
| `google-services.json` | Firebase push on Android | `android/app/google-services.json` (gitignored; without it the build works, push does not) |
| `GoogleService-Info.plist` | Firebase push on iOS | `ios/GoogleService-Info.plist` (gitignored; copied into the app by an Xcode build phase) |
| App Store Connect API key `.p8` + `ASC_KEY_ID` + `ASC_ISSUER_ID` | `scripts/ios-release.sh` | `~/.appstoreconnect/private_keys/`, env vars |
| `APPLE_TEAM_ID` | signing | env var (the project also carries the team id used by the existing listing) |
| APNs auth key `.p8` | iOS push via Firebase | uploaded to the Firebase console, not to this repo |

## Owner setup (one-time, manual)

**Apple Developer / App Store Connect**
1. App ID `io.ugcad.app` -> Capabilities: enable **Sign In with Apple**, **Push Notifications**, **Associated Domains**. Regenerate the provisioning profile (automatic signing does it for you).
2. Keys -> create an **APNs key** (Apple Push Notifications service), download the `.p8` once, note Key ID and Team ID.
3. Firebase console -> project settings -> Cloud Messaging -> upload that APNs key. Add the iOS app (bundle `io.ugcad.app`) and download `GoogleService-Info.plist` into `ios/`.
4. Host `https://ugcad.io/.well-known/apple-app-site-association` (and the `www` host), no redirect, `application/json`:
   `{"applinks":{"details":[{"appIDs":["<TEAMID>.io.ugcad.app"],"components":[{"/":"/*"}]}]}}`
5. Google Cloud -> OAuth: an **iOS** client for `io.ugcad.app` (its reversed id is already in `Info.plist` and `src/config.ts`) and the **Web** client the backend verifies.
6. App Store Connect: create the 1.3.0 version, answer App Privacy consistently with `ios/ugcadapp/PrivacyInfo.xcprivacy` (email, name, phone, user id, photos/videos, device id for push; no tracking), set the Privacy Policy URL, a demo account for review, and export compliance (`ITSAppUsesNonExemptEncryption=false` is already set). iPad is not enabled (`TARGETED_DEVICE_FAMILY=1`); to ship on iPad set it to `1,2` and add iPad screenshots.
7. Account deletion (guideline 5.1.1(v)) is in the website: Settings -> "Deactivate or delete account".

**Android / Google**
1. Firebase console -> add Android app `com.ugcapp`, download `google-services.json` into `android/app/`. Add the SHA-1 / SHA-256 of the **upload key and of Play App Signing** to the Firebase and Google Cloud OAuth Android client (package `com.ugcapp`).
2. Host `https://ugcad.io/.well-known/assetlinks.json` (and the `www` host) with package `com.ugcapp` and the **Play App Signing** SHA-256, so App Links verify (`android:autoVerify`).
3. Play Console: Data safety form consistent with the iOS privacy manifest; **Photo and video permissions** declaration for `READ_MEDIA_IMAGES` / `READ_MEDIA_VIDEO` (or remove those two permissions from `AndroidManifest.xml` if you rely only on the system picker, which needs none); notification permission is a runtime prompt.

**Declared native permissions and why**

| Platform | Permission | Why |
|---|---|---|
| Android | INTERNET, ACCESS_NETWORK_STATE | load the website, detect offline |
| Android | POST_NOTIFICATIONS | push (Android 13+ prompt) |
| Android | CAMERA | take a photo / record a video for `<input type=file capture>` |
| Android | RECORD_AUDIO | microphone when the website records video (getUserMedia) |
| Android | READ_MEDIA_IMAGES / READ_MEDIA_VIDEO / READ_MEDIA_VISUAL_USER_SELECTED (Android 13+), READ_EXTERNAL_STORAGE (<= 12) | gallery access when the shell asks for it through the bridge |
| Android | WRITE_EXTERNAL_STORAGE (<= 9) | WebView downloads on old devices |
| iOS | Camera, Microphone, Photo Library usage strings | upload / record a creator video or photo (no location, contacts or tracking keys) |
| iOS | Push (`aps-environment`, background mode `remote-notification`) | notifications |

Camera / microphone / photos stay optional hardware on Android (`uses-feature required=false`), so the app installs on devices without a camera.

## Layout

- `App.tsx`, `src/` - the shell (WebView, bridge, push, auth, deep links). `__tests__/` - Jest. `docs/` - documentation.
- `android/`, `ios/` - native projects (the iOS Xcode project and scheme are named `ugcadapp`; the JS component is `ugcadapp`).
- `__mocks__/`, `jest.setup.js` - native-module stand-ins for Jest.
- `scripts/` - iOS release and App Store Connect automation.

## Not verified on this PC

iOS was written without Xcode (Windows): run `cd ios && pod install` and a Release archive on a Mac first. The Swift `AppDelegate`
(Firebase, Google Sign-In URL handling, `RCTLinkingManager` forwarding) and the Podfile (static frameworks for Firebase) are the
places most likely to need a small fix on the first build.
