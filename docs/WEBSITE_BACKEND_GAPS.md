# Website, backend and shell gaps for store approval (prioritised, actionable)

Audit date 2026-10-26. Written for the agents who implement the website (`C:\Users\meetr\Desktop\Ugcad\ugcad-frontend`, branch `new-ui`), the backend (`C:\Users\meetr\Desktop\Ugcad\ugcad-backend\server.py`) and the shell (this repo). Paths are relative to those folders. `server.py` line numbers drift while several agents edit it: grep the function/route name. IDs: **W** website, **B** backend, **A** shell/app, **O** owner task. `(in flight)` = someone had already started it when I audited; re-run the "Verify" command.

Priority: **P0** = likely rejection / cannot submit; **P1** = should fix before submission; **P2** = nice to have.

---

## P0: must be done

### O-1 (P0) Deploy before you test or submit
The live site `https://ugcad.io` serves a **bundle that has no shell code** (checked: the main JS bundle `main.81e7c0d3.js` contains `ugcad_app_ui` but no `UGCadShell`, `__UGCAD_SHELL__` or `/auth/apple`). The store app shows the live site, so reviewers would see the old site. Deploy the `new-ui` frontend (Vercel project for `ugcad.io`; the site answers `Server: Vercel`) and the backend (AWS) first, then smoke-test the shell against production. **Freeze deployments while the review is open** (a bad deploy during review = instant rejection). Verify: `curl -s https://ugcad.io/ | grep -o 'static/js/main[^"]*'` then grep that file for `UGCadShell`.

### W-1 (P0) Report on every kind of user content, using the new `/reports` API
Backend ready: `POST /api/reports` `{target_type: message|user|campaign|review|conversation, target_id, reason, note}` (`create_content_report`, `server.py` ~16755).
Today the UI reports only a user, via the old `POST /api/report-user`: `ugcad-frontend/src/utils/safety.js` function `reportUser` (line ~54). Work:
1. In `src/utils/safety.js` add `reportContent({targetType, targetId, reason, note})` -> `POST ${API}/reports`; make `SafetyDialog` (`src/components/SafetyMenu.js`) use it (`messageId` -> `message`, otherwise `user`); keep `/report-user` as fallback on 404.
2. Mount a Report entry (flag icon / sheet row) on: brief detail seen by a creator `src/app/screens/shared/CampaignView.js` and the brief drawer in `src/app/screens/creator/Briefs.js` (target `campaign`); reviews `src/app/screens/brand/Reviews.js`, `src/app/screens/creator/Reviews.js` (target `review`, id of the review); deliverable video `src/app/screens/brand/WorkReview.js` and `src/app/screens/creator/OrderRoom.js` (target `campaign` with note "deliverable"); the brand profile a creator sees (where the brand name is shown in `CampaignView.js`, `OrderRoom.js`): target `user`.
3. Already present (in flight): chat header menu and per-message report in `src/app/screens/shared/Messages.js` (SafetyDialog, line ~906), creator profile `brand/CreatorProfile.js:263`, `components/BrandCreatorProfile.js`, `BrandProfileCard.js`, `CreatorProfileModal.js`, `ChatPopup.js`.
Verify: `grep -rn "SafetyMenu\|SafetyDialog" src --include=*.js | grep -v test` lists all the screens above. Apple 1.2, Play UGC.

### B-1 (P0) One report queue and one response promise (24 hours)
- `server.py` has two stores: `user_reports` (from `report_user`, ~10985) and `reports` (from `create_content_report`). The admin bell link of both is `/dashboard/admin/disputes`, which lists neither. Merge: make `report_user` write into `reports` (target_type `user`) or make `GET /api/admin/reports` return both. Keep `user_reports` reads working for the chat-oversight badge (`get_all_chats` ~9548, `get_chat_for_admin` ~9605) or switch those to `reports`.
- Change the reply of `report_user` ("investigate within 5 business days") and the report sheet subtitle (`src/app/screens/shared/Messages.js` report sheet "Reviewed by our team within 5 business days", `src/pages/MessagesPage.js`) to **24 hours**; set `legalContent.js` guidelines section 10 (currently "within 48 hours") and Terms complaint clause (currently 24 h) to the same value. One number everywhere.
- Add `resolution` (`dismissed | content_removed | warned | suspended | banned`) and `resolved_note` to `POST /api/admin/reports/{id}/resolve`, and an `age_hours` field on the list. Notify the reporter on resolution via `notify_user`.
- Owner must really work the queue daily: it is what Apple tests ("timely responses"). 

### W-4 (P0) Admin screen for the reports queue
Backend exists (`GET /api/admin/reports?status=open|resolved|all`, `POST /api/admin/reports/{id}/resolve`, cap `warn_suspend_users`). No UI uses it (grep `admin/reports` in `src/pages` finds only `AdminReports.js`'s unrelated digest). Add a "User reports" tab to `src/pages/AdminFlaggedMessages.js` (it already has a `reported` filter label, line ~44, but only shows a count) or a new page, with reporter, target, reason, excerpt (`content_excerpt`), deal link, and buttons Resolve / Warn / Suspend / Ban using the existing `POST /api/admin/user/warn|suspend|ban`. Fix the bell link in `create_content_report` and `report_user` to the new page route. Phone-friendly (`*.phone.test.js` pattern exists for admin pages). 

### W-2 (P0) Terms acceptance + zero-tolerance wording
1. `src/app/screens/brand/Signup.js:412` still has the passive text "By continuing you agree to the Terms and Privacy Policy." Make it a checkbox like `src/app/screens/shared/Auth.js:~555` (`data-testid="terms-checkbox"`), disable "Submit for review" until ticked. (This screen is the brand profile setup after sign-up; the sign-up screen itself already has the checkbox.)
2. Add to `src/data/legalContent.js` (Terms and Community Guidelines, which `/terms` and `/community-guidelines` render) an explicit clause: "UGCad has zero tolerance for objectionable content and abusive users. You can report content or users in the app. We review reports within 24 hours and remove content and suspend or ban offenders." Apple wants this in the terms the user agrees to. Bump `AGREEMENT_VERSION` in `ugcad-backend/agreement_content.py` (currently `2026-09-28`) if you add it to the Creator & Brand Agreement (it forces every user to re-accept at the next dashboard visit; the reviewer accounts then need to accept once).
3. Keep the `/terms` and `/privacy-policy` links working inside the shell (see A-4 about `target="_blank"`).

### B-3 (P0) Store the terms acceptance on the server
The UI sends `terms_accepted: true` on e-mail sign-up (`Auth.js:~255`) and gates the social buttons, but `grep terms_accepted ugcad-backend/server.py` finds nothing: it is ignored. Add `terms_accepted: Optional[bool]` to the register model (`POST /api/auth/signup`, `server.py` ~3730), `GoogleAuthRequest` and `AppleAuthRequest` (~280-295); reject with 400 when a **new** account is created without it; store `terms_accepted_at`, `terms_version` on the user doc. For existing users nothing changes (`agreement_accepted_version` continues to gate the dashboard).

### W-5 (P0) Remove the remaining dead ends from the shell
- `src/app/screens/brand/Home.js:122-123`: the hero cards `plans` ("See plans") and `edit` ("Add editing") push `/dashboard/business/plans` and `/dashboard/business/edit-addon`, which now redirect to `/brand-home` in the shell (`Plans.js:27-29`, `EditAddon.js:29-31`, in flight). Wrap both `cards.push` in `if (!isShell())` (import `isShell` from `../../../utils/nativeBridge`). The reviewer's brand account has a completed campaign, so these cards will appear.
- Search again before release: `grep -rn -i "coming soon\|soon" src/app src/pages/Auth.js src/components | grep -v test`. Currently remaining and acceptable: empty-state copy "Check back soon" (`brand/Creators.js:270`, `creator/Briefs.js:285`): the review accounts must have data so these never show.
- `src/app/screens/shared/Settings.js` "Follow us": Twitter/X and YouTube rows are filtered in the shell (in flight, `Settings.js:~563`). Instagram and LinkedIn open in the browser: fine.

### W-6 (P0) Placeholder support phone number
`src/components/ContactSupportBox.js:5-6`: `SUPPORT_PHONE = '+919000000000'` / `'+91 90000 00000'` is a dummy. It drives the WhatsApp and call rows (`buildSupportLinks`, used by `src/app/screens/brand/Signup.js:61,112`, `src/app/screens/shared/Settings.js`, `components/BrandGateHeader.js`, `BrandPendingGate.js`, `CreatorGate.js`, `CreatorPendingGate.js`, `MoreInfoGate.js`, `RejectedGate.js`, `ContactSupportFab.js`). Either set the real support number (the old TestFlight contact script uses `+917999621130`: confirm it is a monitored support line) or remove the WhatsApp/call rows and keep e-mail only. Apple tests "Contact support". The same dummy number is also hard-coded in `src/components/HoverSideRail.js:211,215` (`tel:+919000000000`, `https://wa.me/919000000000`): that is the desktop help rail (opened through `openHelpDialog` from `BrandTopNavLayout.js`), not a phone screen, but fix it in the same commit.

### W-7 (P0) No marketing website inside the shell
`src/App.js` `HomeRoute` (~418): outside the first launch of a session it renders `<Landing />`; `/creator` renders `<CreatorLanding />` (route ~line 542). In the shell (`isShell()`), always `<Navigate to={user ? homeForUser(user) : '/auth'} replace />` for `/` and `/creator`. This removes the 7,000-line landing page and its 4K videos from the WebView and removes the "website in a box" impression (guideline 4.2). Also check `Auth.js` has no "Download the app" or pricing links (none found).

### W-8 (P0 for the 4.2 story) A visible native Share
`shareNative` is defined in `src/utils/nativeBridge.js:81` (bridge message `share`, implemented in `ugcadapp/src/shell/share.ts`) but nothing calls it. Add a share icon that calls `shareNative({title, url})` when `isShell()` (else `navigator.share` if present) on: creator public profile (`src/app/screens/creator/Profile.js` header: share `https://ugcad.io/<public profile path>`; find the public route used by `brand/CreatorProfile.js`), a campaign (`src/app/screens/shared/CampaignView.js`, `brand/CampaignDetail.js`: `https://ugcad.io/campaign/<id>`). Reviewer instruction in the notes says "creator -> Profile -> Share icon": keep it there.

### W-9 + O-2 (P0) Universal links / App Links files on `https://ugcad.io/.well-known/`
State at the end of the audit (in flight): the website agent already created `public/.well-known/apple-app-site-association`, `public/.well-known/assetlinks.json` and added headers and a rewrite exclusion to `vercel.json`. Remaining: replace the `TEAMID` placeholder in the AASA file with the real team id (`3LCA4AA483` appears in the old project: confirm in Membership), replace the fingerprint placeholder in `assetlinks.json` (O-2), deploy, run the curl checks of step 4. The AASA `components: [{"/": "*"}]` is valid; the rewrite exclusion `/((?!.well-known/|app-config.json).*)` is fine (unescaped dots only widen the match). The text below is the original specification.
Facts (checked live before the change): `https://ugcad.io/.well-known/assetlinks.json` and `.../apple-app-site-association` currently return **HTTP 200 with the HTML app shell** (Vercel catch-all rewrite). `www.ugcad.io` 308-redirects to `ugcad.io`. Static files in `build/` are served before rewrites on Vercel (that is why `/privacy`, `/support`, `/delete-account` work), so adding real files fixes it; the AASA file has no extension so it needs an explicit content type.
1. Create `ugcad-frontend/public/.well-known/apple-app-site-association` (no extension):
```json
{
  "applinks": {
    "details": [{
      "appIDs": ["3LCA4AA483.io.ugcad.app"],
      "components": [
        { "/": "/.well-known/*", "exclude": true },
        { "/": "/static/*", "exclude": true },
        { "/": "/*" }
      ]
    }]
  },
  "webcredentials": { "apps": ["3LCA4AA483.io.ugcad.app"] }
}
```
   Team id `3LCA4AA483` is taken from `ugcapp/ios/ugcapp.xcodeproj` `DEVELOPMENT_TEAM`: confirm it in the Apple Developer account (Membership).
2. Create `ugcad-frontend/public/.well-known/assetlinks.json` with the package `com.ugcapp` and the two SHA-256 fingerprints (see `PLAY_STORE_CHECKLIST.md` section 10). The owner supplies the fingerprints (O-2).
3. Edit `ugcad-frontend/vercel.json`. Keep the existing two `headers` blocks, **append** the three below after them (later rules override `Cache-Control`), and tighten the rewrite so these files can never fall into the SPA:
```json
{
  "headers": [
    { "source": "/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }] },
    { "source": "/static/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] },
    { "source": "/.well-known/apple-app-site-association", "headers": [
      { "key": "Content-Type", "value": "application/json" },
      { "key": "Cache-Control", "value": "public, max-age=300" } ] },
    { "source": "/.well-known/assetlinks.json", "headers": [
      { "key": "Content-Type", "value": "application/json" },
      { "key": "Cache-Control", "value": "public, max-age=300" } ] },
    { "source": "/app-config.json", "headers": [
      { "key": "Content-Type", "value": "application/json" },
      { "key": "Cache-Control", "value": "no-cache" } ] }
  ],
  "rewrites": [
    { "source": "/((?!\\.well-known/|app-config\\.json|static/).*)", "destination": "/index.html" }
  ],
  "buildCommand": "CI=false npm run build",
  "outputDirectory": "build"
}
```
   Do not add `redirects` for these paths, and do not enable "redirect to www". Only the apex host is used (iOS: `applinks:ugcad.io`; Android: only `ugcad.io` in the `autoVerify` filter, see A-3).
4. Verify after deploy (must show `200`, `content-type: application/json`, no `location` header):
   `curl -sI https://ugcad.io/.well-known/apple-app-site-association` and `curl -sI https://ugcad.io/.well-known/assetlinks.json`; Apple's CDN cache can take a day; Google check: `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://ugcad.io&relation=delegate_permission/common.handle_all_urls`.
   Confirm CRA copies the dot-folder: `ls ugcad-frontend/build/.well-known` after `npm run build` (react-scripts copies all of `public/`).

### W-10 (P1) `app-config.json` for the forced-update gate
State (in flight): `public/app-config.json` exists with `minSupportedVersion: "1.3.0"`, `latestVersion`, `storeUrls.android` and an **empty** `storeUrls.ios` (the shell then falls back to the placeholder in `src/config.ts`): fill the iOS URL once the numeric App Store id is known. `minSupportedVersion` 1.3.0 is harmless now (no older shell has a version gate); raise it later only after the newer version is live in both stores. Original specification:
`https://ugcad.io/app-config.json` currently returns the HTML shell with 200 (shell fails open on the JSON parse error, so it is harmless but untested). Create `ugcad-frontend/public/app-config.json`:
```json
{
  "minSupportedVersion": "1.3.0",
  "storeUrls": {
    "android": "https://play.google.com/store/apps/details?id=com.ugcapp",
    "ios": "https://apps.apple.com/app/id<APP_STORE_NUMERIC_ID>"
  }
}
```
Fields are those read by `ugcadapp/src/shell/versionCheck.ts` (`minSupportedVersion` dotted digits, `storeUrls.ios|android` must start with `https://` or `market://`). Start with `"0.0.0"` until 1.3.0 is live in both stores, otherwise reviewers see "Update required". The numeric App Store id is in App Store Connect -> App Information -> Apple ID. Also replace the placeholder `STORE_URLS.ios` (`https://apps.apple.com/app/id0000000000`) in `ugcadapp/src/config.ts` (A-7).

### B-5 (P0) Sign in with Apple: response shape, authorization code, token revocation
Today (`apple_auth`, `server.py` ~4059): identity token verified against audience `APPLE_BUNDLE_ID` (default `io.ugcad.app`) and issuer `https://appleid.apple.com` - good.
1. Return the same body as `/auth/login`: `return _auth_response(user)` plus `"nickname"`, instead of the 7-field dict at the end of `apple_auth` (it lacks `profile`, `review`, `profile_photo`, `team_*`, `admin_*`, `level`). Test: sign up with Apple as creator, close the app, log in again: profile setup shows the saved data; the approval gates read `review`/`approval_reason`.
2. Add `authorization_code: Optional[str]` to `AppleAuthRequest`; website side W-11 forwards it. If `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_SIGNIN_KEY` (contents of the .p8) are set: build a client secret (ES256 JWT: `iss=team id`, `sub=io.ugcad.app`, `aud=https://appleid.apple.com`, `exp<=6 months`, header `kid=key id`), POST `https://appleid.apple.com/auth/token` (`grant_type=authorization_code`) and store `apple_refresh_token` on the user. If the env is unset, skip silently.
3. In `delete_profile` (~6539): if the user has `apple_refresh_token`, POST `https://appleid.apple.com/auth/revoke` (`token`, `token_type_hint=refresh_token`, client id/secret). Apple requires revoking on deletion (5.1.1(v)); failures must be logged, not block deletion.
4. Use `info.get("email_verified")` (string or bool) before linking to an existing e-mail account (account-takeover hygiene); keep relay addresses allowed.
5. Optional: nonce support (`nonce` in the request) to prevent token replay.
Owner (O-3): create the Sign in with Apple key in the Apple Developer portal (Keys -> + -> Sign in with Apple, primary App ID `io.ugcad.app`), keep the .p8, key id and team id; put them in the AWS environment.

### B-6 (P0) Account deletion must be complete and safe
`delete_profile` (`DELETE /api/profile`, ~6539) currently: refuses staff, deletes the `users` document, push tokens, in-app notifications, sessions, chat pauses, blocks, blanks `sender_nickname` on messages, sends a confirmation e-mail. Gaps:
1. **Money**: refuse (HTTP 409 with a clear message) while `balance > 0` for brands or creators with a withdrawable balance, `escrow` rows in `held|reserved|disputed|on_hold` for the user, open `disputes`, or campaigns `in_progress`; the response body should list what blocks it. Or accept a body `{"confirm_forfeit": true}`. The Settings sheet (`src/app/screens/shared/Settings.js:~311`) must show the 409 `detail` instead of the generic toast.
2. **Files**: delete the user's KYC documents, profile photo, banner, portfolio videos from storage (`storage.s3_delete(key)` / `s3_key_from_url` in `storage.py:61,355`), and the `uploaded_files` rows. Today only the database row is removed; the S3 objects stay.
3. **Messages**: either delete the user's `messages` and `deal_messages` bodies or keep the current anonymisation and say so in the privacy text (W-12). Do not claim "messages deleted" if they are kept.
4. **Brand teams**: when a brand owner is deleted, remove or disable `business_team_members` (collection list `USER_DATA_COLLECTIONS` ~15000 shows what the admin cascade deletes; reuse its field list `USER_REF_FIELDS` for the personal collections that are not financial).
5. Keep invoices, payouts, escrow history, withdrawals, dispute records (legal retention) but strip direct identifiers (name/e-mail) where possible.
6. Apple revoke: B-5 step 3.
7. Add a backend test (`ugcad-backend/tests/`, see memory "Backend test recipe": pytest without touching the production DB) for 409 on balance and for successful deletion of a clean user.

### O-4 (P0) Reviewer accounts + data (see `APP_REVIEW_NOTES.md` section 2)
### B-9 (P1) Optional seeding script
Provide `ugcad-backend/scripts/seed_app_review.py` (idempotent, env `REVIEW_BRAND_EMAIL`, `REVIEW_BRAND_PASSWORD`, `REVIEW_CREATOR_EMAIL`, `REVIEW_CREATOR_PASSWORD`, `MONGO_URL`, `DB_NAME`; refuses to run if `DB_NAME` looks like production unless `--yes`): hash passwords with `hash_password` (`server.py:778`), insert the two users with the fields from the table in `APP_REVIEW_NOTES.md`, call the same helper functions as `reset_demo.py` for campaigns/escrow/work, credit the wallet through a `wallet_ledger` row of type `admin_adjustment`, set `kyc={status:"verified",...}`, `kyc_verified=True`, `approval_status="approved"`, `profile_completed=True`. Never commit real passwords.

---

## P1: fix before submitting

### W-3 (P1) "Blocked users" screen
`GET /api/blocks` returns `{blocks:[{user_id,nickname,role,profile_photo,created_at}]}`; `DELETE /api/blocks/{user_id}` unblocks. Add Settings -> "Blocked users" in `src/app/screens/shared/Settings.js` (section next to "Legal & policies", key `blocked`) using `useBlocked`/`unblockUser` from `src/utils/safety.js`. Shows an empty state when none.

### B-2 (P1) Objectionable-content filter
`check_contact_info_policy` (`server.py` ~1538) only looks for contact details. Add a default `keyword` rule (profanity / sexual / hate / violent threat terms, English + common Hinglish) to `DEFAULT_FILTER_RULES` (~9869; rule shape `{id,type:"keyword",pattern:"a, b, c",label,enabled,status}`), and call the same check (a) before saving `bio`/`description` (`PUT /profile/update-info`, profile setup endpoints), (b) campaign title/description (`POST /api/campaigns`), (c) review text (`POST /api/reviews`), (d) report notes. On match return 400 with a friendly `message`. Chat keeps its strike system.

### B-4 (P2) Blocks beyond chat
`blocks` is enforced only in chat (`validate_chat_access` ~1960 and conversation lists). Optionally skip blocked creators in a brand's bid/shortlist/invite listing and refuse a bid from a creator the brand blocked (`POST /api/campaigns/{id}/bid`, ~8051) and invitations (`/campaigns/{id}/shortlist/{creator}/invite`).

### W-11 (P1) Forward the Apple authorization code
`src/utils/shellAuth.js` `nativeAppleBody` drops `res.authorizationCode`. Add `authorization_code: res.authorizationCode` to the body (when present) and update the matching unit test (`src/utils/*.test.js` for shellAuth if present). Backend field is B-5.2.

### W-12 (P1) Public pages: privacy, delete account, support
- `ugcad-frontend/public/privacy/index.html` (served at `https://ugcad.io/privacy`, the URL for both stores): says "UGCad Android app com.ugcapp", "revoke ... in your Android system settings", mentions no iOS, Apple/Google sign-in, push tokens, Firebase, PostHog (it does mention PostHog) or in-app deletion path details. Rewrite for "UGCad mobile app (Android and iOS) and ugcad.io", add Sign in with Apple, push notification tokens, KYC retention, third parties (Razorpay, Firebase/Google, Apple, PostHog, AWS), and the deletion route. Make `/privacy-policy` (`LEGAL_CONTENT.privacy` in `src/data/legalContent.js`) say the same thing, or redirect one to the other.
- `public/delete-account/index.html`: lead with "Settings -> Delete account (creators) / Close account permanently (brands) in the app", then the e-mail route; name the app (UGCad, Android `com.ugcapp`, iOS `io.ugcad.app`); correct the "What is deleted" list to what B-6 really does (messages: say what happens); state what blocks deletion (wallet balance, escrow, active deals, disputes); "Last updated" date.
- `public/support/index.html`: fine. Add the real phone only if W-6 keeps one. The report line "report them from the chat" can add "or profile".
- Add `<link rel="canonical">` and keep the pages crawlable (no `robots` block). `ugcad-frontend/public/` has no `robots.txt` (checked): add `User-agent: *\nAllow: /\nSitemap: https://ugcad.io/sitemap.xml` only if a sitemap is created; otherwise `robots.txt` is optional. The privacy/support/delete pages must not need login (they do not).

### O-5 (P1) Analytics hygiene
`public/index.html` loads PostHog (active on production hosts, project key in file). The rrweb session-recording scripts (lines ~74-82) are commented out: keep them that way. In the PostHog project settings make sure "Record user sessions" is OFF (it can be turned on remotely and would record KYC and chat screens). Autocapture sends clicked element text: set `mask_all_text`/`autocapture: false` if any screen shows PAN/Aadhaar/bank values. No `posthog.identify` is called today (events are anonymous): do not add it without updating the privacy label.

### B-7 (P1) Push only transactional, honour preferences (guideline 4.5.4)
`notify_user` (`server.py` ~1692) calls `queue_push(...)` for **every** in-app notification (line ~1718) without checking `notification_prefs`; the preference check there applies to e-mail only. Skip push for notification categories the user disabled (`user.notification_prefs`, brand prefs in `business_settings`), and never push admin broadcast / promotional types (`POST /api/notifications/send` ~16153, `/notifications/create` ~16541, templates in `src/pages/AdminNotificationTemplates.js`) unless the user opted in. Also add a per-user quiet-hours check (reuse `_in_quiet_hours`). Owner env: `FIREBASE_CREDENTIALS_JSON` or `FIREBASE_CREDENTIALS_PATH` on AWS (otherwise `send_push_to_user` is a silent no-op).

### B-11 (P1) Confirmation push when a device registers (reviewer experience)
In `register_device_token` (`server.py` ~16662), when the `(user, token)` pair is **new** (upsert inserted), schedule `send_push_to_user(user_id, "Notifications are on", "We will tell you about bids, approvals and messages.", {"path": "/notifications"})` once. Lets the reviewer actually receive a push within a minute of the permission prompt (see `APP_REVIEW_NOTES.md`). Idempotent via `$setOnInsert`.

### B-8 (P1, security) Unverified Cashfree branch
`verify_payment` (`server.py` ~15729): the `else:` branch ("Cashfree verification would go here") calls `credit_wallet_for_successful_transaction` with no verification. If a Cashfree gateway is ever activated, any authenticated user could credit their own wallet. Either remove Cashfree from `recharge_business_wallet` (~4884) and `payments/create-order` or implement the Cashfree order status check. Also `recharge_business_wallet` falls back to fake `order_wallet_test_*` orders when the key id contains "test" (~4905); make that dev-only (`os.environ.get("ENV") != "production"`).

### B-10 / O-6 (P1) Production environment checklist (cannot be verified from the repo)
Set on the AWS service: `GOOGLE_CLIENT_ID` = the **web** client id (`GOOGLE_WEB_CLIENT_ID` in `ugcadapp/src/config.ts`: `193113275370-c3or5lgj2m92qgc364hvu45tbiflj470.apps.googleusercontent.com`; native Google sign-in returns ID tokens with this audience when the shell passes it as `webClientId`); `APPLE_BUNDLE_ID=io.ugcad.app` (or unset); `FIREBASE_CREDENTIALS_JSON`; `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_SIGNIN_KEY` (B-5); Razorpay **live** gateway configured in Admin -> Payment gateways with a non-"test" key; `JWT_SECRET` not the default `your-secret-key-change-in-production` (`server.py:85`).

### W-13 (P2) Push pre-prompt
`components/ShellPush.js` calls `registerDevice(uid)` right after login, which shows the iOS permission dialog with no explanation. Optional: show a one-line sheet ("Get alerts for bids, approvals and payouts") first, then call `registerPush()`; if declined, ask again only from Settings -> Notifications (already implemented in `Settings.js:~394`).

### W-14 (P2) Hide the recharge bonus in the shell
`src/app/screens/brand/Wallet.js:94-96,158,229,240` show bonus tiers (+3/7/10%). Hide the bonus labels, the "Bonus" tile and the "Bigger top-ups earn a bonus" note when `isShell() && shellPlatform() === 'ios'` (reduces a 3.1.1 question; keep on Android/web).

---

## Shell / app items (for the agent that owns `C:\Users\meetr\Desktop\Ugcad\ugcadapp`, not the docs agent)

| ID | Item | File |
|---|---|---|
| A-1 | DONE in this repo (location string removed; camera/microphone/photo strings; `LSApplicationQueriesSchemes`; `ugcad` URL scheme; `UIBackgroundModes`). Optional: remove `NSAllowsLocalNetworking` for release | `ios/ugcadapp/Info.plist` |
| A-2 | `aps-environment` and `associated-domains` are present. Remove `applinks:www.ugcad.io` (www answers 308; Apple does not follow redirects for the AASA file). Optionally add `webcredentials:ugcad.io` (the AASA has a `webcredentials` block) | `ios/ugcadapp/ugcadapp.entitlements` |
| A-3 | Android: remove `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_MEDIA_VISUAL_USER_SELECTED`, `READ_EXTERNAL_STORAGE`; make `permissions.ts` return `granted` for `photos` on Android; remove `www.ugcad.io` from the `autoVerify` filter | `android/app/src/main/AndroidManifest.xml`, `src/shell/permissions.ts` |
| A-4 | DONE in code (`onOpenWindow` in `src/shell/WebShell.tsx:206`: same-host links navigate the main view, other hosts go to the system browser). Test on device: sign-up -> Terms link opens and back returns to sign-up with the form intact | `src/shell/WebShell.tsx`, `urlPolicy.ts` |
| A-5 | `PrivacyInfo.xcprivacy` declares 6 data types (email, name, phone, user id, photos/videos, device id). Add the rest of the label (physical address, payment info, other financial info, purchase history, emails or text messages, audio data, other user content, customer support, other data types, product interaction) so it equals the App Store Connect answers (list in `APPLE_REVIEW_CHECKLIST.md` section 6) | `ios/ugcadapp/PrivacyInfo.xcprivacy` |
| A-6 | iPhone-only: confirm `TARGETED_DEVICE_FAMILY = 1`; test layout on iPad compatibility mode | `ios/ugcadapp.xcodeproj/project.pbxproj` |
| A-7 | Replace the placeholder App Store id in `STORE_URLS.ios`; update `scripts/asc-testflight.mjs` `META` (description, keywords, `supportUrl`/`marketingUrl`/`privacyPolicyUrl` -> `https://ugcad.io/...` apex, `reviewNotes` from `APP_REVIEW_NOTES.md` section 1, `whatsNew`, demo account env vars) | `src/config.ts`, `scripts/asc-testflight.mjs` |
| A-8 | `download` bridge opens the system browser: authenticated URLs (CSV/PDF/invoices) would fail. Either send the file through the website as a blob (`navigator.share` with files) or use a native file module | `src/shell/download.ts` |
| A-9 | Add `google-services.json` / `GoogleService-Info.plist` placeholders to `.gitignore` and document (done in `RELEASE_GUIDE.md`) | repo root |
| A-10 | Confirm `network_security_config.xml` forbids cleartext in release | `android/app/src/main/res/xml/network_security_config.xml` |
| A-11 | `README.md` "Owner setup" says to host AASA and assetlinks on the `www` host too: impossible, `www.ugcad.io` answers 308 to `https://ugcad.io`. Edit README to the apex host only | `README.md` |

---

## Owner tasks (accounts and consoles)
| ID | Task | Needed for |
|---|---|---|
| O-1 | Deploy website `new-ui` + backend to production; freeze during review | everything |
| O-2 | Play App Signing SHA-256 + upload-key SHA-256 for `assetlinks.json` | Android App Links |
| O-3 | Sign in with Apple key (.p8, key id, team id) -> backend env | 4.8 token revocation |
| O-4 | Create the two reviewer accounts with data | 2.1 |
| O-5 | PostHog: session recording OFF | 5.1 privacy |
| O-6 | Production env vars (B-10) | login, push, payments |
| O-7 | Apple Developer account type = Organization; seller name = company; D-U-N-S | 5.1.1(ix), 5.6 |
| O-8 | Apple: APNs auth key (.p8) uploaded to Firebase project (Project settings -> Cloud Messaging -> Apple app) | iOS push |
| O-9 | Legal review: Aadhaar number handling, DPDP Act notice, final Terms with the zero-tolerance clause | 5.1.1 |
| O-10 | Work the report queue daily; 24-hour promise | 1.2 |
| O-11 | Real screenshots from TestFlight build; Data Safety / App Privacy answers from the checklists | 2.3 |

## Quick verification commands (run after the agents finish)
```
# website
cd ugcad-frontend
grep -rn "coming soon" -i src/app src/components | grep -v test
grep -rn "SafetyMenu\|SafetyDialog" src --include=*.js | grep -v test
grep -rn "shareNative" src --include=*.js | grep -v "test\|nativeBridge.js"
grep -n "9000000000" -r src
ls public/.well-known public/app-config.json
# backend
grep -n "terms_accepted\|authorization_code\|auth/revoke\|api_router.post(\"/blocks\")\|api_router.post(\"/reports\")" ../ugcad-backend/server.py
# live
curl -sI https://ugcad.io/.well-known/apple-app-site-association | head -5
curl -sI https://ugcad.io/.well-known/assetlinks.json | head -5
```
