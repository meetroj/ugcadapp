# Apple App Review checklist: UGCad shell (bundle id `io.ugcad.app`, v1.3.0 build 26)

Audit date: 2026-10-26. Read-only audit of `ugcad-frontend` (branch `new-ui`), `ugcad-backend/server.py`, `ugcapp` (old app) and the first state of this repo.
Other agents were still editing the website, backend and shell while this was written. Items tagged `(in flight)` existed only partly when audited: re-run the check shown before relying on them.
`server.py` line numbers drift while others edit: always `grep -n` the function or route name.

Status tags: **DONE** = verified in code. **NEEDS WEBSITE** (`ugcad-frontend`), **NEEDS BACKEND** (`ugcad-backend/server.py`), **NEEDS APP** (this repo), **NEEDS OWNER** (account, console or business task).

History that matters (from `ugcapp/src/appleSignIn.ts:7`, `ugcapp/ios/ugcapp/ugcapp.entitlements:3-5`, and the owner): build 1.1 (2) was rejected for 4.8 (no Sign in with Apple); later submissions were rejected, once with 4.3 "apps similar to others exist: what is different in your app". So 4.3 and 4.2 are the two guidelines to answer in depth (see `DIFFERENTIATION.md` and `APP_REVIEW_NOTES.md`).

---

## 0. Top blockers, ranked (fix these before pressing "Submit for review")

| # | Blocker | Guideline | Owner of fix |
|---|---|---|---|
| 1 | No reviewer test accounts with data (a brand AND a creator, approved, KYC verified, wallet funded, a live deal) | 2.1 | NEEDS OWNER |
| 2 | "Thin web wrapper" risk: the app must visibly do things a website cannot (Sign in with Apple, push, camera/photo picker, native share, deep links), and the Review Notes must prove it. Native **Share has no button on the website yet** (`shareNative` is defined in `ugcad-frontend/src/utils/nativeBridge.js:81` but never called) | 4.2, 4.3 | NEEDS WEBSITE + OWNER (notes) |
| 3 | UGC safety is incomplete: report exists only from chat/profile menus, no report on briefs/reviews/deliverables, no objectionable-content filter (only a contact-info filter), report response promise inconsistent (5 business days / 48 h / 24 h), no admin screen for the new `/api/reports` queue, no "blocked users" list | 1.2 | NEEDS WEBSITE + BACKEND |
| 4 | Account deletion (5.1.1(v)) deletes the user row but: no Sign in with Apple token revocation, no guard for wallet money / escrow / active deals, public page `/delete-account` says deletion is by e-mail only | 5.1.1(v), 4.8 | NEEDS BACKEND + WEBSITE + OWNER (Apple key) |
| 5 | Dead ends reachable in the shell: brand Home hero cards "See plans" / "Add editing" (route redirects back to home), placeholder support phone `+919000000000` behind the WhatsApp/call rows | 2.1, 1.5 | NEEDS WEBSITE |
| 6 | Marketing landing page still reachable inside the shell (`/` after the first launch renders `Landing`; `/creator` renders `CreatorLanding`): feels like a website | 4.2 | NEEDS WEBSITE |
| 7 | Payments wording and Plans/bonus: wallet top-up through Razorpay is acceptable only as payment for real-world services (3.1.3(e)); subscription "Plans" and recharge bonus must not be shown on iOS | 3.1.1 / 3.1.3 | NEEDS WEBSITE + OWNER (notes) |
| 8 | Developer account must be an **Organization** (handles KYC, wallet, escrow; regulated-field rule 5.1.1(ix)). The scripts show team `3LCA4AA483` under an individual's name ("Parv Jain") | 5.1.1(ix), 5.6.2 | NEEDS OWNER (verify) |
| 9 | iOS native files: now mostly done in this repo (location string removed, push entitlement and `remote-notification`, `ugcad` scheme, `LSApplicationQueriesSchemes`, associated domains). Still open: `applinks:www.ugcad.io` in the entitlements (www 308-redirects, remove it), `PrivacyInfo.xcprivacy` declares only 6 data types (the label below declares more: they must match), no `GoogleService-Info.plist` | 5.1.1(ii), 5.1.2 | NEEDS APP + OWNER |
| 10 | Production does not have the new code: `https://ugcad.io` still serves the old bundle (no `UGCadShell`), and `/.well-known/apple-app-site-association`, `/.well-known/assetlinks.json`, `/app-config.json` return the HTML app with 200. The files now exist in `ugcad-frontend/public` (in flight) but hold placeholders (`TEAMID`, fingerprint) and are not deployed | 2.1 | NEEDS OWNER (deploy; gaps W-9, O-1, O-2) |

---

## 1. Safety

### 1.1 Objectionable content / 1.5 Developer information
| Item | Evidence | Status |
|---|---|---|
| Community Guidelines and Terms prohibit obscene, hateful, harassing, illegal content | `ugcad-frontend/src/data/legalContent.js` (Terms clause listing obscene/harassing/hateful content ~line 376; Guidelines sections 5 "No Harassment or Abuse", 6 "Content Standards", 9 penalties) | DONE |
| Published contact info inside the app | Settings -> "Contact support" `mailto:support@ugcad.io` (`src/app/screens/shared/Settings.js:~595`); `https://ugcad.io/support` page lists `support@ugcad.io` | DONE |
| WhatsApp / call support rows use a **placeholder number** `SUPPORT_PHONE = '+919000000000'` | `ugcad-frontend/src/components/ContactSupportBox.js:5-6`; used by `brand/Signup.js:61,112`, Settings and the approval gates | NEEDS WEBSITE: put the real number or delete the WhatsApp and call rows. A fake number is a 1.5 / 2.1 rejection |
| Support URL is a working page (not a bare domain) | `https://ugcad.io/support` returns 200 (checked live). Use this as Support URL in App Store Connect | DONE (use it) |
| `www.ugcad.io` redirects (308) to `https://ugcad.io` | checked live | DONE: use the apex host in App Store Connect and in `asc-testflight.mjs` (the script still says `www.ugcad.io`) |

### 1.2 User-generated content (the full audit)
Apple's four mandatory items plus terms. UGC surfaces in this product: chat messages and attachments, creator profiles/portfolio videos/bio/photos, brand profiles/logos, briefs (title, description, reference videos), reviews, deliverable videos, dispute evidence.

| Requirement | What exists (verified) | Gap | Status |
|---|---|---|---|
| Terms/EULA the user must accept, saying no tolerance for objectionable content or abusive users | Sign-up: explicit checkbox "I agree to the Terms and Privacy Policy" `src/app/screens/shared/Auth.js:~555-560` (`data-testid="terms-checkbox"`); social buttons are blocked until ticked (`Auth.js:~188-192`) and `terms_accepted: true` is sent (`Auth.js:~255`). Post-approval one-time Creator & Brand Agreement gate `components/AgreementGate.js` (scroll to end, then Agree) stored by `POST /api/agreement/accept` (`server.py` `accept_agreement`) | (a) `terms_accepted` is **not read by the backend** (`grep terms_accepted server.py` = nothing): add it to the register/google/apple models and store `terms_accepted_at` + version. (b) The Terms text must contain an explicit sentence "zero tolerance for objectionable content and abusive users; we remove content and eject users within 24 hours of a report". Today the Guidelines say reports are acknowledged "within 48 hours" (`legalContent.js` guidelines section 10), the Terms say "24 hours" for complaints (~line 572), the report sheet says "5 business days" (`Messages.js` report sheet subtitle, `server.py` `report_user` reply). Pick ONE (24 h) and use it everywhere. (c) Brand Signup (`brand/Signup.js:412`) still shows the passive line "By continuing you agree..." (no checkbox) | (a) NEEDS BACKEND, (b) NEEDS WEBSITE + OWNER (legal text), (c) NEEDS WEBSITE |
| Method to filter objectionable material before posting | Chat: `check_contact_info_policy` (`server.py` ~1538) blocks phone/e-mail/handles/off-platform apps, 3-strike escalation, admin-editable rules (`/api/admin/filter-rules/*`, defaults `DEFAULT_FILTER_RULES` ~9869: phone, e-mail, apps, "call me"). Briefs and profiles are **admin-approved before going live** (`/api/admin/approve-profile`, `/api/admin/approve-campaign`). Creator and brand accounts start `approval_status = pending` | The filter is for contact details only, not for abuse/obscenity. Briefs/bios/reviews/chat text are not scanned for profanity or sexual content | NEEDS BACKEND: seed `DEFAULT_FILTER_RULES` with an abuse/obscenity keyword rule (type `keyword`, enabled) so `check_contact_info_policy` also rejects it, and run the same check on bio, brief description and review text. Describe "pre-moderation by admin approval" in the review notes (it is real and is a strong 1.2 answer) |
| Report objectionable content/users with timely response | `POST /api/report-user` (`report_user`) used by chat; new `POST /api/reports` (`create_content_report`, targets `message,user,campaign,review,conversation`, rate limited 10/h, admin notified); admin `GET /api/admin/reports`, `POST /api/admin/reports/{id}/resolve`. UI: shared `components/SafetyMenu.js` mounted in chat (`Messages.js`, `ChatPopup.js`), brand view of a creator (`brand/CreatorProfile.js:263`, `BrandCreatorProfile.js:342`, `CreatorProfileModal.js`), `BrandProfileCard.js` (in flight) | (a) No report on a **brief** (`shared/CampaignView.js`, `creator/Briefs.js`), a **review** (`brand/Reviews.js`, `creator/Reviews.js`), a **deliverable** (`brand/WorkReview.js`), or on a **brand profile seen by a creator**. (b) `utils/safety.js:reportUser` still calls the old `/report-user`, so the `message`/`campaign`/`review` targets of `/api/reports` are unused. (c) No admin UI for `/api/admin/reports` (`pages/AdminFlaggedMessages.js` shows only a count badge from the old `user_reports`). `notify_admins` links to `/dashboard/admin/disputes`, which does not list reports. (d) Reports stay `open` forever unless someone calls resolve; there is no action (hide content / ban) in the same step | NEEDS WEBSITE (a, b, c), NEEDS BACKEND (merge `user_reports` and `reports` into one queue, add action field) |
| Block abusive users | `POST/DELETE/GET /api/blocks` (`block_user`, `unblock_user`, `list_blocks`, `server.py` ~16700); enforced server-side in `validate_chat_access` (~1960: blocked in either direction -> 403) and hidden in `/api/chat/conversations` (~8599). UI: block/unblock in `SafetyDialog`; `Messages.js:197` hides blocked chats | No "Blocked users" list in Settings to review/unblock; block does not stop a blocked creator from bidding on the brand's briefs or being invited | NEEDS WEBSITE (Settings -> Blocked users using `GET /api/blocks`), BACKEND optional (skip blocked creators in bid/invite lists) |
| Ability to remove content / eject users | Admin: `/api/admin/user/ban`, `/suspend`, `/warn`, `DELETE /api/admin/user/{id}` (cascade), `/api/admin/message/moderate` (approve/confirm/escalate) | None for the capability itself | DONE |
| Contact info for users to reach the developer | `support@ugcad.io` in Settings and `/support` page | Real phone number (see 1.5) | partly DONE |

Reviewer-facing script for 1.2 (put into the Review Notes): "Open any chat -> top-right options -> Report / Block. Open a creator profile as the brand -> flag icon -> Report / Block. Reports reach our admin queue and we act within 24 hours."

---

## 2. Performance

### 2.1 App completeness and demo accounts
Apple rejects for missing demo credentials, dead buttons, placeholder text, "coming soon", crashes.

**What the owner must create (NEEDS OWNER)** - details in `APP_REVIEW_NOTES.md` section 2 and the seeding script outline in `WEBSITE_BACKEND_GAPS.md` B-9:
1. **Brand account** `REVIEW_BRAND_EMAIL` / `REVIEW_BRAND_PASSWORD`: role `business`, `approval_status=approved`, `profile_completed=true`, company profile filled with a logo (backend gate: `get_approved_business_user`, `server.py` ~1127; dashboard gate on `profile_completed`), agreement accepted (or leave to show the gate), **wallet balance of at least INR 2,500** (chat gate `MIN_BRAND_CHAT_BALANCE`, `validate_chat_access` ~1943; top-up minimum `WALLET_MIN_RECHARGE = 2500`) - give it INR 25,000 through admin `POST /api/admin/wallet/adjust` (`admin_wallet_adjust`, requires the `adjust_wallet` cap; reason mandatory). Add: 1 draft, 1 live campaign with 2-3 bids, 1 deal in each state (shipment pending, work submitted for review with a watermarked video, completed with a review), 1 conversation with a creator, notifications.
2. **Creator account** `REVIEW_CREATOR_EMAIL` / `REVIEW_CREATOR_PASSWORD`: role `creator`, approved, `profile_completed=true`, photo, 2-3 portfolio videos, **KYC status verified** so the reviewer is never asked for a real PAN/Aadhaar (`kyc_status_of` ~1215; set through the admin KYC queue `POST /api/admin/kyc/{user_id}/review` or by setting `kyc.status="verified"`, `kyc_verified=true`), bank/UPI saved, an open bid on the brand's campaign, an active deal, an earnings history. Both accounts must be able to log in by e-mail + password (no OTP): do not enable 2FA on them.
3. Keep both accounts out of the real marketplace listings if you do not want them public (set `creator_directory_visible=false` only after the review; the reviewer needs to find the creator in the brand's directory).
4. Do **not** delete or reset them while the review is open. Run a test login on a fresh TestFlight build before submitting.
5. A "second device" problem: a push token is registered per account and re-assigned when another account logs in on the same phone (`register_device_token` deletes the token for other users). Harmless.

**Dead ends to remove or hide in the shell (grep for "coming soon" over `ugcad-frontend/src`, 2026-10-26):**

| Where | Text/behaviour | Reachable in shell? | Status |
|---|---|---|---|
| `src/app/screens/brand/Plans.js` (route `/dashboard/business/plans`) and website `pages/BrandPlans.js:44` | Upgrade buttons only show toast "Coming soon" | Shell now redirects this route to `/brand-home` (`Plans.js:27-29`) | DONE (in flight; verify `isShell()` guard) |
| `src/app/screens/brand/EditAddon.js:102`, `pages/BrandEditAddon.js:118` | "Add expert editing" -> toast "Coming soon" | Same redirect (`EditAddon.js:29-31`) | DONE (in flight) |
| `src/app/screens/brand/Home.js:122-123` hero cards "See plans" (`/dashboard/business/plans`) and "Add editing" (`/dashboard/business/edit-addon`) | Cards still link to the two redirected routes: tap = lands on Home again (dead end) | Yes (shown after a campaign completes: the reviewer will have one) | NEEDS WEBSITE: hide both cards when `isShell()` |
| `src/app/screens/shared/Settings.js:477` "See plans" link | Hidden in shell (`!isShell()`) | no | DONE |
| `Settings.js:58,60` social rows "Twitter / X (Coming soon)", "YouTube (Coming soon)" | Filtered in shell (`Settings.js:~563` `SOCIALS.filter(... s.soon)`) | no | DONE (in flight) |
| `pages/CreatorSignup.js:87` `toast.info('Google sign-up is coming soon')` | Website page only. In the shell `/creator/signup` is replaced by `src/app/screens/creator/Signup.js` (registry `src/app/registry.js`), which has no such stub | not reachable | DONE (keep it that way) |
| `pages/ProfileSettings.js:208-210,1305,1967` social "Coming soon" | Website-only page; shell uses `shared/Settings.js` | not reachable | DONE |
| Google sign-in in shell | Web Google button replaced by native buttons (`components/NativeSocialButtons.js`, used at `Auth.js:~469`) | n/a | DONE |
| `src/app/screens/brand/Creators.js:270` "Check back soon" / `creator/Briefs.js:285` | Empty-state copy, not a dead feature | yes | acceptable, but the demo data must avoid empty lists |

Other 2.1 items:
- **No crashes/blank screens on first launch**: shell shows splash until the site posts `app:ready` or 8 s (contract). NEEDS APP: test on a real iPhone in Airplane mode: an error screen with Retry must show (`ugcadapp/src/shell/ErrorScreen.tsx` exists).
- **Marketing landing in shell**: `ugcad-frontend/src/App.js:418-431` `HomeRoute` renders `<Landing />` unless it is the first load of the session (`ugcad_launch_done`). A returning user who opens `/` mid-session sees a 7,000-line marketing page. NEEDS WEBSITE: when `isShell()` always `<Navigate to="/auth">` or role home; same for `/creator` (`CreatorLanding`). Also removes heavy 4K videos from the WebView.
- **Links that open in a new window** (`target="_blank"` legal links in `Auth.js`): the shell opens same-host links in the WebView and others in the system browser (`ugcadapp/src/shell/WebShell.tsx:206` `onOpenWindow`, `urlPolicy.ts`). DONE in code; NEEDS OWNER/APP: test the Terms link from sign-up on a device.
- **Website analytics scripts**: `public/index.html` has PostHog active (project key in file) and the rrweb session-recording scripts commented out (lines ~74-82, "LOCAL-DEV ... disabled"). Keep rrweb disabled; in PostHog project settings make sure "Record user sessions" is OFF (NEEDS OWNER). No `posthog.identify` call exists in `src`, so events are anonymous.
- **iPad**: `TARGETED_DEVICE_FAMILY = 1` in the old project (iPhone only). Reviewers still open iPhone-only apps on an iPad in compatibility mode: test that layout (NEEDS APP).
- `app-config.json` missing: `https://ugcad.io/app-config.json` currently returns the HTML app shell with status 200 (checked). The shell fails open, but create the file (see `WEBSITE_BACKEND_GAPS.md` W-10).

### 2.3 Accurate metadata, screenshots
| Rule | Action | Status |
|---|---|---|
| 2.3.3 screenshots show the app in use | Take them from the real TestFlight build on the simulator/device while logged in as the review accounts (brand home, creator directory, deal room with escrow status, work review with watermark, wallet, creator earnings, chat). No marketing mock-ups, no device frames with text claims about features that do not exist | NEEDS OWNER |
| Old store screenshots | `ugcapp/store-screenshots/` holds one file (`01.png`) from the old native UI: do not reuse | NEEDS OWNER |
| 2.3.1 / 2.3.7 | No hidden features; name <= 30 chars (`UGCad`), subtitle <= 30 chars, keywords without competitor names or trademarks. Do not mention "Instagram", "TikTok", "influencer" (the old keyword list in `scripts/asc-testflight.mjs` contains `influencer`: harmless but remove competitor-like terms) | NEEDS OWNER |
| Description must match the shell | The old `META.description` in `scripts/asc-testflight.mjs` was for the old native app. Rewrite with the differentiators (see `DIFFERENTIATION.md` section 4) | NEEDS APP (script) + OWNER |
| Price/IAP | Free, no IAP, no subscription in the iOS app (plans hidden) | OWNER (App Store Connect: price Free; no In-App Purchases) |

### 2.5 Software requirements
| Rule | Finding | Status |
|---|---|---|
| 2.5.1 public APIs only | RN 0.87 + Firebase messaging + Google Sign-In + Apple Auth: all public | DONE |
| 2.5.2 no downloaded code changing app features | The app bundles only the shell JS; the website runs inside WKWebView (permitted: web content). Do not add CodePush / remote JS bundles | DONE |
| 2.5.4 background modes | Only `remote-notification` is justified (push). No audio/location/VoIP | DONE: `UIBackgroundModes = [remote-notification]` in `ios/ugcadapp/Info.plist`, `aps-environment` in `ugcadapp.entitlements` (value `development`; the App Store export sets production: confirm in the exported IPA) |
| 2.5.6 web browsing apps must use WebKit | `react-native-webview` is WKWebView on iOS | DONE |
| 2.5.9 / 2.5.13 | No touching of system UI or FaceID | DONE |

---

## 3. Business

### 3.1.1 / 3.1.3 Payments (read carefully; this is the second most likely rejection after 4.2/4.3)
What is paid for, with proof in code:
- **Wallet recharge**: `POST /api/business/wallet/recharge` (`recharge_business_wallet`, `server.py` ~4884) creates a Razorpay order; the website opens Razorpay Checkout (`src/utils/razorpay.js` loads `https://checkout.razorpay.com/v1/checkout.js`); `POST /api/payments/verify` (`verify_payment` ~15730) verifies the signature and credits the wallet. Minimum INR 2,500 (`WALLET_MIN_RECHARGE`).
- **Spending**: hiring a creator debits the wallet into per-deal **escrow** (`select_creator` ~8218, `reserve_campaign_budget` ~2480). Money is released to the creator's payout when the brand approves the video (`approve_work` ~10326). Creators withdraw to a bank/UPI after KYC (`/api/withdrawal/request`).
- The paid thing is a **human creative service performed by an independent creator** (filming a video with a physical product that is shipped to the creator, via the `shipments` flow). It is not digital content, not a feature unlock, not an app subscription.

Which exception applies and how to word it:
- **3.1.3(e) "Goods and Services Outside of the App"**: services consumed outside the app (the videos are used on the brand's own ad and social channels) must be paid with methods other than IAP (card, UPI, Apple Pay). This is the same position as freelance marketplaces (Fiverr, Upwork) and booking apps. Use this wording in the review notes: "Payments in UGCad are for real-world creative services delivered by independent creators (video shoots with physical products shipped to the creator). Funds are held in escrow and released to the creator when the brand approves the work. The video is consumed outside the app on the brand's own channels. Per Guideline 3.1.3(e) we use Razorpay (UPI/cards/net banking) and not In-App Purchase. The wallet is prepaid balance for these services; it does not unlock any app feature or digital content."
- 3.1.3(d) (person-to-person real-time services) does **not** fit (the work is asynchronous): do not cite it.
- **Risk items, and what to do**:
  1. **Brand "Plans"** (Starter/Growth/Scale, monthly/yearly price, lower platform fee) is a subscription that unlocks a feature (a lower commission). On iOS that reads as digital content and would require IAP. It is "Coming soon" with no purchase flow, so it must stay hidden in the shell (`brand/Plans.js` redirect + Home cards + Settings link). NEEDS WEBSITE (cards). Never enable a Plans purchase in the iOS shell without IAP.
  2. **Recharge bonus** (`WALLET_BONUS_TIERS`, `server.py:1366`: +3% at INR 10,000, +7% at 25,000, +10% at 50,000; also shown in `brand/Wallet.js:94-96,229,240`). A bonus on a stored balance can be read as a promotional currency scheme. Recommended: hide the bonus labels and the Gift tile in the shell (NEEDS WEBSITE), keep the discount on the website. Not mandatory, but removes a 3.1.1 question.
  3. **No "buy credits" language**: label the screen "Add funds for creator payments" rather than "Buy credits".
  4. **Apple's "link out" rule** does not apply because payment happens inside the Razorpay sheet within the allowed host list, for a 3.1.3(e) service.
  5. Cashfree branch in `verify_payment` credits the wallet **without any verification** (`# Cashfree verification would go here`): if a Cashfree gateway is ever activated, any user can credit their wallet. Not an Apple issue; it is a security hole: NEEDS BACKEND (reject or implement before enabling Cashfree).
  6. `recharge_business_wallet` falls back to a fake test order when the Razorpay key contains "test" (~4905): make sure production keys are live keys (NEEDS OWNER).
- Payments are in INR only; no cryptocurrency, no gift cards, no tipping of digital content.
- Indian regulation: wallet + escrow + payouts depend on Razorpay's products. Keep Razorpay account KYC complete; reviewers may ask.

### 3.2 Other business model issues
| Item | Status |
|---|---|
| 3.2.1(viii)/5.1.1(ix): app that moves money and collects government ID is expected to be published by a legal entity | NEEDS OWNER: confirm the Apple Developer account is an Organization (enrolled company with a D-U-N-S number) and the seller name matches the company on the website/privacy policy. If the account is an individual, Apple may reject or ask for proof |
| 3.2.2 unacceptable: no ads, no third-party ad SDKs | DONE (none) |

---

## 4. Design

| Guideline | Finding | Status |
|---|---|---|
| 4.0 design / HIG | Phone-specific screens (`src/app/screens`, 41 files: brand 18, creator 13, shared 10) with bottom tabs, bottom sheets, safe areas, keyboard and back-gesture handling (`src/app/shell/*`). Not the desktop site | DONE. NEEDS APP/OWNER: test on iPhone SE and a Pro Max |
| 4.1 copycats | UGCad's name, icon and UI are its own (check the icon is not the RN default: `ios/ugcadapp/Images.xcassets/AppIcon.appiconset` has a custom set) | DONE (verify icon visually) |
| 4.2 minimum functionality | See section 4.2 below | OPEN RISK |
| 4.3(a) spam / 4.3(b) saturated categories | See section 4.3 below | OPEN RISK |
| 4.5.4 push | Push is optional and only for transactional events (new bid, approval, message, payout): never required. Make sure no promotional pushes are sent without the "marketing" opt-in; notification categories exist in Settings -> Notifications (`creatorNotif`/`brandNotif`, `notification_prefs` in profile). Permission is requested right after login by `ShellPush.js` (`registerDevice(uid)`), not on first launch; also from Settings -> Notifications | DONE; improvement: show a one-line explanation before the system prompt (NEEDS WEBSITE, optional) |
| 4.7 mini apps / HTML5 | The shell is not a store of apps/games | DONE |
| 4.8 Sign in with Apple | See section 4.8 | DONE with backend follow-ups |

### 4.2 Minimum functionality: native capabilities that justify a native app, mapped to code
Honest assessment: the shell is a WebView of a site; Apple allows this only if the app is "more than a repackaged website". The strongest position is the combination below plus an app-only UI (not the desktop site). Residual risk is **medium-high**; the owner should be ready to answer with the points in `APP_REVIEW_NOTES.md` and, if rejected for 4.2, add more native screens (see "If rejected" below).

| Native capability | Code (this repo / website) | Reachable by the reviewer | Status |
|---|---|---|---|
| Sign in with Apple (iOS only) + Google native sign-in | Shell: `ugcadapp/src/shell/auth/apple.ts`, `auth/google.ts`, handlers `auth:apple`, `auth:google` in `src/shell/handlers.ts`. Website: `components/NativeSocialButtons.js`, `utils/shellAuth.js`, `Auth.js:~194-209` | Login screen | DONE |
| Push notifications (FCM + APNs) with deep links on tap | Shell `src/shell/push.ts` (`registerForPush`, `startPushListeners`, `pathFromMessage`), foreground banner `NotificationBanner.tsx`; website `utils/shellPush.js`, `components/ShellPush.js` (`POST /api/notifications/device-token`); backend `register_device_token` + sender (`server.py` ~16620-16680) | Prompt appears right after login; to see a push: brand posts a campaign / sends a message to the creator account | DONE; needs APNs key + `GoogleService-Info.plist` (NEEDS OWNER) and the `aps-environment` entitlement (NEEDS APP) |
| Camera, photo/video picker, document upload for deliverables, KYC and portfolio | `<input type=file accept=image/* video/*>` in `creator/Setup.js:259,340`, `creator/Profile.js:482-651`, `creator/Kyc.js:86`, `brand/PostCampaign.js:1024,1038`, `shared/Dispute.js:193`. WKWebView opens the native picker / camera; strings `NSCameraUsageDescription`, `NSMicrophoneUsageDescription`, `NSPhotoLibraryUsageDescription` in `ios/ugcadapp/Info.plist` | Creator -> Profile -> add portfolio video; Creator -> KYC | DONE (strings need rewrite, see 5.1.1(ii)) |
| Native share sheet | Shell `src/shell/share.ts`, handler `share`. Website helper `shareNative` exists, **no caller** | **Not reachable today** | NEEDS WEBSITE: add a "Share" action (creator public profile link, campaign link) calling `shareNative({title,url})` |
| Universal links / `ugcad://` deep links | Shell `src/shell/deepLinks.ts`; entitlement `com.apple.developer.associated-domains` is present but lists `applinks:ugcad.io` and `applinks:www.ugcad.io`: remove the www line (www redirects). The AASA file in `ugcad-frontend/public/.well-known/` has the placeholder `TEAMID` and is not deployed | Open `https://ugcad.io/campaign/<id>` from Notes/Messages | NEEDS APP (remove www) + OWNER (team id, deploy) |
| Native downloads / external links (UPI apps, mail, phone) | `src/shell/download.ts` (opens the URL in the system browser: limitation, cookies are not sent), `open:external` | Wallet UPI intent; download invoice | DONE with limitation |
| Native splash, offline/error screen, forced-update gate | `Splash.tsx`, `ErrorScreen.tsx`, `versionCheck.ts` | Airplane mode launch | DONE |
| Razorpay UPI app hand-off (`upi://`, `phonepe://`, `gpay://`, `paytmmp://`) | `config.ts` `NATIVE_SCHEMES`, `LSApplicationQueriesSchemes` lists `upi, phonepe, gpay, paytmmp, tez, bhim` in `Info.plist` | Wallet -> Add funds | DONE |

If rejected for 4.2, ranked options to add native value without redoing the product: (1) native bottom tab bar + pull-to-refresh + haptics around the WebView; (2) app badge count from the unread notification count; (3) Face ID app lock option in Settings; (4) local notification reminders for deadlines (shipment due, work due) scheduled from the deal data; (5) native photo/video capture with upload progress; (6) share extension / "Share to UGCad".

### 4.3(a) Spam, 4.3(b) saturated categories: what to do
- Submit **one** iOS app only: bundle id `io.ugcad.app`, updating the existing listing. Do **not** create a second listing for the PWA or reuse the same code under another bundle id (`HANDOVER.md` section 4 mentions `io.ugcad.pwa`: Android test build only; never submit it to Apple).
- Category: "Business" (primary), "Productivity" or "Social Networking" as secondary: avoid "Photo & Video" (saturated with similar apps) and avoid "Social Networking" as primary because Apple reviews UGC rules more strictly there.
- Make the metadata unique (name `UGCad`, subtitle that states the differentiator, e.g. "Vetted UGC creators, escrow pay"). Do not use "influencer", "TikTok", "Instagram" as keywords.
- Provide the point-by-point answer in `APP_REVIEW_NOTES.md` section 3, and the differentiators proven by code in `DIFFERENTIATION.md`.
- 4.3(b): UGC marketplace is not on Apple's saturated list (dating, hookup, Bible, flashlight, fortune telling, VPN, etc.) but Apple reviewers treat "marketplace for creators" as a crowded category, hence the need to explain curation, escrow and Indian payments.

### 4.8 Sign in with Apple - verification
| Check | Evidence | Status |
|---|---|---|
| Button shown on iOS only, **above** Google, equal size/prominence | `components/NativeSocialButtons.js:23-31`: `shellPlatform() === 'ios' &&` Apple button first, same class `ugc-social-btn`, text "Continue with Apple" | DONE |
| Apple capability + entitlement | `ios/ugcadapp/ugcadapp.entitlements`: `com.apple.developer.applesignin = Default` | DONE (enable "Sign in with Apple" on App ID `io.ugcad.app` in the developer portal: NEEDS OWNER) |
| Only name and e-mail requested | `ugcadapp/src/shell/auth/apple.ts` scopes `FULL_NAME`, `EMAIL` | DONE |
| Name handling (name only on first authorization) | `shellAuth.js:nativeAppleBody` forwards `full_name`; backend `apple_auth` stores `full_name`/`nickname` only for a brand-new account, and fills `full_name` later only if empty | DONE |
| Private relay e-mail | `apple_auth` keys on Apple `sub` (`apple_id`), accepts `@privaterelay.appleid.com`, sets `email_verified=True`, and if the user previously used Apple and the token has no e-mail it still finds them by `apple_id`. If a first Apple sign-in has no e-mail it returns 401 with instructions | DONE. Caveat: a user who first registered with a real e-mail and then signs in with a *relay* e-mail gets a second account (no match). NEEDS BACKEND (optional): "link account" flow; mention in support docs |
| Backend verifies the identity token with the iOS **bundle id audience** | `server.py:94` `APPLE_BUNDLE_ID = os.environ.get('APPLE_BUNDLE_ID', 'io.ugcad.app')`, `jwt.decode(..., audience=APPLE_BUNDLE_ID, issuer="https://appleid.apple.com")` against `https://appleid.apple.com/auth/keys` | DONE (the default equals the contract; make sure the AWS env var `APPLE_BUNDLE_ID` is unset or equals `io.ugcad.app`: NEEDS OWNER, cannot be seen from the repo) |
| Same session as e-mail login (2FA, banned, suspended) | `apple_auth` applies `banned`, `enforce_suspension`, `two_factor_gate` | DONE |
| Response shape | `apple_auth` returns only `token,user_id,role,nickname,creator_code,profile_completed,approval_status`; `/auth/login` and `/auth/google` return also `profile`, `review`, `admin_*`, `team_*`, `level`, `profile_photo`. The more-info/approval gates read `review`/`profile` | NEEDS BACKEND: return `_auth_response(user)` plus `nickname` (the helper already exists, ~`_auth_response`). Test: new Apple creator -> profile setup shows previously saved data |
| Role chosen before Apple sign-up | Website sends `role` in the body (`nativeAppleBody(role)`); backend defaults to `creator` if absent | DONE; test brand sign-up with Apple |
| Terms acceptance for Apple/Google sign-ups | Blocked until the checkbox is ticked in the UI (`Auth.js:188`) | DONE UI; backend does not store it (see 1.2) |
| `authorizationCode` / token revocation | The shell returns `authorizationCode` (`auth/apple.ts`) but `nativeAppleBody` drops it and the backend model `AppleAuthRequest` has no field | NEEDS WEBSITE + BACKEND (see 5.1.1(v)) |
| Apple sign-in on Android | Contract: `unsupported`; button is iOS only | DONE |

---

## 5. Legal / privacy

### 5.1.1 Data collection and storage
| Item | Finding | Status |
|---|---|---|
| (i) Privacy policy link in App Store Connect and inside the app | URL to use: **`https://ugcad.io/privacy`** (static page `ugcad-frontend/public/privacy/index.html`, live 200). A second policy exists in-app at `/privacy-policy` (`legalContent.js` privacy) and is linked from sign-up (`Auth.js:~559`). Two different texts is a risk: make `/privacy` and `/privacy-policy` the same document. The static page says "Android app com.ugcapp" and "Withdraw permissions ... in your Android system settings" and lists no Apple/iOS mention | NEEDS WEBSITE/OWNER: update `public/privacy/index.html` (iOS, Sign in with Apple, push tokens, PostHog analytics, Firebase, account-deletion path in the app) and keep one source of truth. Link it inside the app: Settings -> "Legal & policies" lists the Privacy Policy (`Settings.js:~548`); the sign-up screen links it before login |
| (ii) Permission purpose strings | The new `ios/ugcadapp/Info.plist` has no location key (removed) and specific camera, microphone and photo strings ("UGCad uses the camera so you can take a photo or record a video to upload as a creator video, product photo or campaign deliverable", etc.) | DONE. The old app had `NSLocationWhenInUseUsageDescription` ("nearby campaigns"), which was false because the site never uses location. Reference strings: Camera "UGCad uses the camera so you can record or photograph content for your campaigns, portfolio and ID verification." Microphone "UGCad uses the microphone only when you record a video with sound for a campaign or your portfolio." Photos "UGCad needs access to your photos and videos only to let you choose the files you upload for your profile, KYC and campaign work." No Face ID, contacts, tracking or location strings |
| Permission requests only in context | Camera/photo/mic prompts are triggered by iOS when the file chooser opens (shell `permissions.ts` returns `unavailable` for camera/mic on iOS so the site proceeds); push is asked after login/at Settings -> Notifications | DONE |
| (iii) Data minimization / (iv) not requiring permissions | Push can be refused with no loss of function; camera is optional (gallery works) | DONE |
| (v) **Account deletion in the app** | Website Settings -> "Deactivate or delete account" -> "Delete account" / "Close account permanently" with a type-DELETE confirmation: `src/app/screens/shared/Settings.js:~532-535, 311-312, 660-690` (`DELETE /api/profile`); the website version is `pages/ProfileSettings.js:~412`. Backend `delete_profile` (`server.py` ~6539): staff roles refused; deletes the `users` row (which contains profile, KYC numbers/documents, bank/UPI, portfolio), device tokens, in-app notifications, sessions, chat pauses, blocks; anonymises the sender name on messages; sends a confirmation e-mail. **Really deletes the account**: yes for personal data in the user row | Gaps: (1) no Apple token revocation (needed for Sign in with Apple users, Apple requires it): store the Apple refresh token at sign-in (exchange `authorization_code` at `https://appleid.apple.com/auth/token` with an ES256 client secret from the Sign-in-with-Apple key) and call `https://appleid.apple.com/auth/revoke` in `delete_profile`. Needs env `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_SIGNIN_KEY` (.p8). (2) No check for wallet balance, escrow in `held/reserved/disputed`, open disputes or active deals: the user can erase an account that is owed money. Add a 409 with a clear message ("withdraw or close your deals first") or an explicit "forfeit" confirmation. (3) Message text, deal and payment records stay (legally required for financial records; messages are not necessary): either delete the user's messages or say so. The page `/delete-account` and `public/privacy/index.html` claim "messages and chat history" are deleted (they are not; only the sender name is blanked). (4) Brand teams: a team owner's delete does not remove members. (5) The page `/delete-account` says deletion is **by e-mail only** and does not mention the in-app button. (6) After delete the shell should drop the push token (done by `unregisterDevice` in `App.js:~341` before logout) | NEEDS BACKEND (1,2,3), NEEDS WEBSITE (page text, show button prominently), NEEDS OWNER (Apple key) |
| (vi) Data sharing / (ix) regulated fields | KYC (PAN, Aadhaar - optional - and bank) is collected. Aadhaar numbers: Indian law restricts private storage of Aadhaar numbers; get legal sign-off. The `public/privacy` text says KYC is retained as the law requires | NEEDS OWNER (legal) |

### 5.1.2 Data use and sharing
- No data sold, no advertising, no cross-app tracking: `NSPrivacyTracking=false` in `ios/ugcadapp/PrivacyInfo.xcprivacy`; no ATT prompt and no `NSUserTrackingUsageDescription`. DONE.
- Third parties that process data (list them in the policy): Razorpay (payments), Firebase Cloud Messaging/Google (push token), Google Sign-In, Apple, PostHog (analytics, `public/index.html`), cloud storage/hosting on AWS (and the media bucket), e-mail provider (`send_email`, check which), KYC reviewers (internal staff). NEEDS OWNER: name them in the privacy policy.

### 5.6 Developer code of conduct
- 5.6.1 Do not ask for reviews in a manipulative way; no review prompt exists. DONE. 5.6.2 developer identity must be accurate (see Organization note). 5.6.3 No discovery fraud. 5.6.4 quality: crash-free; test on iOS 16/17/18/26.
- Dispute with the reviewer? Use the Resolution Center reply in `APP_REVIEW_NOTES.md`, appeal through "Appeals" only after a calm reply.

---

## 6. Technical submission requirements

| Item | Value / finding | Status |
|---|---|---|
| Minimum iOS | `IPHONEOS_DEPLOYMENT_TARGET = 15.1` (old project; RN 0.87 default; confirm the new project) | DONE (verify) |
| 64-bit | `UIRequiredDeviceCapabilities = arm64` in `Info.plist` | DONE |
| Xcode / SDK | Apple requires uploads built with the current-year Xcode and SDK (since April 2026: **Xcode 26 / iOS 26 SDK**; check "Upcoming requirements" in App Store Connect on the day because I cannot confirm the exact date from here). Needs a Mac; this PC has no Xcode | NEEDS OWNER (Mac or cloud Mac / Xcode Cloud / EAS-like service) |
| Device family | iPhone only (`TARGETED_DEVICE_FAMILY = 1`); orientation portrait only | DONE |
| `PrivacyInfo.xcprivacy` | Present, `NSPrivacyTracking=false`, required-reason APIs: FileTimestamp (C617.1, 3B52.1), UserDefaults (CA92.1, C56D.1), SystemBootTime (35F9.1). `NSPrivacyCollectedDataTypes` now declares 6 types: Email, Name, Phone, User ID, Photos/Videos, Device ID (all linked, no tracking, AppFunctionality) | NEEDS APP: the nutrition label below (and the privacy policy) declares more. Add Physical address, Payment info, Other financial info, Purchase history, Emails or text messages, Audio data, Other user content, Customer support, Other data types (government ID, DOB) with `AppFunctionality`, plus Product interaction (`Analytics`, `Linked=false`). The App Privacy answers in App Store Connect and this file must say the same thing. After `pod install` run Xcode -> Product -> Archive -> "Generate Privacy Report" and confirm the Firebase/Google SDK manifests are merged |
| Export compliance | `ITSAppUsesNonExemptEncryption = false` present: only HTTPS/standard OS crypto. Answer "No" to proprietary/non-exempt encryption; no annual self-classification needed | DONE |
| ATS | `NSAllowsArbitraryLoads=false`, `NSAllowsLocalNetworking=true` (dev only; remove local networking for release) | DONE; optional cleanup |
| Sign in with Apple entitlement | present | DONE |
| Push entitlement `aps-environment` and `UIBackgroundModes: remote-notification` | present | DONE |
| Associated domains `applinks:ugcad.io` | present, plus `applinks:www.ugcad.io` that must go | NEEDS APP |
| `LSApplicationQueriesSchemes` (`upi`, `phonepe`, `gpay`, `paytmmp`, `tez`, `bhim`) | present | DONE |
| URL scheme `ugcad` | present next to the Google reversed client id | DONE |
| App icon | 1024 px without alpha, set exists (`AppIcon-1024-1024-1x.png`) | verify no alpha: NEEDS OWNER |
| `GoogleService-Info.plist` | not in repo (by design) | NEEDS OWNER |

### Age rating (answers and reasons)
The app contains user-generated content and user-to-user messaging, a payments wallet, and asks for government ID. Apple's questionnaire (2025+ format) is answered honestly:
| Question | Answer |
|---|---|
| Messaging and chat | **Yes** (in-app chat between brands and creators) |
| User-generated content | **Yes** (profiles, portfolios, briefs, reviews, deliverables) |
| Unrestricted web access | No (WebView is limited to ugcad.io and Razorpay; external links open the system browser) |
| Advertising | No |
| Violence, sexual content, nudity, profanity, horror, alcohol/tobacco/drugs, gambling, contests, medical | None |
| Parental controls / age assurance | Not offered; sign-up says 18+ (Terms: users must be 18+, KYC rejects minors) |
Expected computed rating: **13+ or 16+** because of UGC + messaging. **Recommendation: use the "age rating override" to set 18+** (consistent with the Terms: contracts, payments and ID verification are for adults only; there is no downside). Do not choose "Made for Kids". In India, set the same.

### App Privacy "nutrition label" (declare in App Store Connect)
Based on `public/privacy/index.html` section 2, `server.py` models and the shell. Tracking: **No** for every item (no ATT, no data broker, no ad networks). All items below are used only for **App Functionality** unless stated.

| Data type (Apple category) | Collected | Linked to user | Used for tracking | Purpose / source |
|---|---|---|---|---|
| Contact info: Name | Yes | Yes | No | Account, profile, Apple/Google sign-in |
| Contact info: Email address | Yes | Yes | No | Account, sign-in, notifications |
| Contact info: Phone number | Yes | Yes | No | Required at sign-up (`normalize_signup_phone`) |
| Contact info: Physical address | Yes | Yes | No | Brand billing address, creator delivery address for shipments |
| Contact info: Other (social handles) | Yes | Yes | No | Profile |
| Financial info: Payment info | Yes | Yes | No | Bank account/UPI for payouts (`bank_details`, `upi_id`); card data is handled by Razorpay, not stored by us |
| Financial info: Other financial info | Yes | Yes | No | PAN, GSTIN, wallet balance, transaction/withdrawal history |
| Purchases: Purchase history | Yes | Yes | No | Deals, invoices |
| Location (precise or coarse) | **No** | - | - | Not collected from the device (city/country are typed by the user: that is "Other user content") |
| Sensitive info | No | - | - | (Government ID numbers are declared under Other data types) |
| Contacts | No | - | - | |
| User content: Emails or text messages | Yes | Yes | No | In-app chat, offers, counter-offers |
| User content: Photos or videos | Yes | Yes | No | Portfolio, deliverables, KYC documents, chat attachments |
| User content: Audio data | Yes | Yes | No | Sound inside uploaded videos |
| User content: Other user content | Yes | Yes | No | Briefs, bios, reviews, disputes |
| User content: Customer support | Yes | Yes | No | Support requests through the app/e-mail |
| Browsing history | No | - | - | |
| Search history | No | - | - | (Creator/brief search runs on the server per request and is not stored: confirm) |
| Identifiers: User ID | Yes | Yes | No | Account id |
| Identifiers: Device ID | Yes | Yes | No | Push token (FCM/APNs) stored in `device_tokens` with the user id |
| Usage data: Product interaction | Yes | **No** | No | PostHog analytics, anonymous (`posthog.init` with `person_profiles: identified_only`, no identify call in `src`) - purpose Analytics |
| Usage data: Advertising data | No | - | - | |
| Diagnostics: Crash data / performance data | **No** (no Crashlytics/Sentry in package.json) | - | - | If a crash SDK is added later, add it here |
| Other data types: Government ID numbers, date of birth, gender, age range | Yes | Yes | No | KYC (PAN, optional Aadhaar, DOB 18+ check), profile |

### Store listing assets and contacts
| Item | Value | Status |
|---|---|---|
| Screenshots (iPhone only) | 6.9" display: **1320 x 2868** px (portrait), 3-10 images; App Store Connect scales them for smaller phones. Add 6.5" (1284 x 2778 or 1242 x 2688) only if 6.9" is not provided. No iPad screenshots because the app is iPhone-only. The old script `scripts/asc-screenshots.mjs` takes display types `APP_IPHONE_69` (1320x2868), `APP_IPHONE_67`, `APP_IPHONE_65` | NEEDS OWNER |
| Support URL | `https://ugcad.io/support` | DONE (exists) |
| Marketing URL | `https://ugcad.io` | DONE |
| Privacy Policy URL | `https://ugcad.io/privacy` | DONE (update text) |
| Copyright | `2026 <legal entity name>` (must match the Organization) | NEEDS OWNER |
| App Review contact | Name, phone (reachable on WhatsApp/phone for 24 h), e-mail. The old script has the founder's name, `ugcad.io@gmail.com` and a phone: confirm they are current | NEEDS OWNER |
| Demo account (Sign-in required: ON) | `REVIEW_BRAND_EMAIL` / `REVIEW_BRAND_PASSWORD`, plus the creator login in the Notes field (App Store Connect has one user/password pair) | NEEDS OWNER |
| Notes for review | Text from `APP_REVIEW_NOTES.md` section 1 | NEEDS OWNER (paste) |
| Version "What's New" | "Faster, native sign-in with Apple and Google, push notifications for bids, messages and approvals, report and block tools, new phone-first design." Do not claim features that are hidden | NEEDS OWNER |
| Content rights | Users upload their own content; brands own approved work; the app contains no third-party copyrighted content of ours. Answer "Yes, I have rights" and keep the IP-complaint e-mail (`support@ugcad.io`) | NEEDS OWNER |
| Export compliance, Advertising identifier (IDFA) | No IDFA usage | DONE |

---

## 7. Pre-submission test script (run on a TestFlight build, on a real iPhone)
1. Fresh install -> splash -> login screen (no landing page, no "coming soon").
2. Sign in with Apple as a new brand (choose "Hide my email"), finish profile, confirm no second account on re-login.
3. Sign in with the review brand: see wallet INR balance, an active deal, a chat. Report and block a user from chat; confirm blocked chat disappears.
4. Review creator: upload a portfolio photo from the library and a video; see the push permission prompt after login; accept; trigger a push from the brand account; tap it; the app opens the right screen.
5. Wallet -> Add funds -> Razorpay opens in the app; UPI app hand-off works or shows a clear error; cancel returns to the app.
6. Settings -> Delete account on a throwaway account: account gone, push token gone, cannot log in. Also on an Apple-created account.
7. Settings -> Privacy Policy and Terms open; support e-mail opens the Mail app.
8. Airplane mode: error screen with Retry; no white screen.
9. Universal link `https://ugcad.io/privacy` from Notes opens in the app (after AASA is live) or Safari (never a crash).
