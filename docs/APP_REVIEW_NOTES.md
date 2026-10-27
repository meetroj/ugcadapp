# App Review notes and replies (copy-paste ready)

Replace every `REVIEW_*` placeholder before submitting. Keep both accounts alive and working for the whole review. Facts below were checked against the code on 2026-10-26 (see `DIFFERENTIATION.md` and `APPLE_REVIEW_CHECKLIST.md` for file references). Do not paste anything that is not yet true: check each "Status" note first.

Prerequisites that must be live before these texts are true (all tracked in `WEBSITE_BACKEND_GAPS.md`): report and block tools, explicit Terms checkbox, delete-account in Settings, hidden "Coming soon" screens, Sign in with Apple button, Share button, the two test accounts.

---

## 1. "Notes for review" field (App Store Connect -> App Review Information)
Limit is 4,000 characters. This text is about 2,900.

```
UGCad is a managed marketplace where Indian D2C brands hire vetted creators to make UGC videos. It is a native iOS app (React Native) that shows our live service from https://ugcad.io with phone-specific screens; content and business logic are served from our servers, which lets us fix problems without waiting for a new build. The app is not a copy of the desktop website: it has its own phone UI (bottom tabs, sheets) and the native features listed below.

WHAT IS DIFFERENT FROM OTHER CREATOR APPS
- Both sides are vetted: every creator and brand is reviewed by our team before they can transact; briefs are reviewed too.
- Creators complete KYC (PAN, optional Aadhaar, 18+ check) before they can be paid.
- Payments are held in escrow and released only when the brand approves the video. Videos stay watermarked until approved.
- Full workflow in the app: brief, bids, hire, product shipment (creator address is never shown to the brand), delivery, revisions, approval, two-way reviews, disputes handled by our staff.
- Chat blocks phone numbers and e-mails, uses structured offer cards, and is moderated by staff.
- Indian payments: INR wallet funded with Razorpay (UPI, cards, net banking), GST invoices, TDS on payouts.

TEST ACCOUNTS (e-mail + password, no OTP, no 2FA)
Brand: REVIEW_BRAND_EMAIL / REVIEW_BRAND_PASSWORD  (wallet funded, active campaign with bids, deals in every stage)
Creator: REVIEW_CREATOR_EMAIL / REVIEW_CREATOR_PASSWORD  (approved, KYC already verified so no ID is needed, active deal)
You do not need to enter any real ID or payment details.

HOW TO SEE THE NATIVE FEATURES
1. Sign in with Apple: log out (Settings -> Log out), then tap "Continue with Apple" on the login screen (it is shown above the Google button). Choose "Hide My Email" if you wish.
2. Push notifications: the iOS permission prompt appears right after you log in. Allow it. A confirmation notification is sent to the device within a minute of enabling notifications (tap it: the app opens the Notifications screen). Our team also sends a message from the brand account to the signed-in review creator while the review is in progress, which produces a real push that opens the chat.
3. Photos/videos/camera: log in as the creator -> Profile -> add a portfolio photo or video, or Orders -> the active deal -> Upload work. The system camera / photo picker opens.
4. Share: creator -> Profile -> Share icon (opens the iOS share sheet).
5. Links: https://ugcad.io/... links and ugcad:// links open the app.
6. Payments: brand -> Wallet -> Add funds. Razorpay checkout opens inside the app; you can cancel without paying (test payment is not required).

PAYMENTS (Guideline 3.1.3(e))
Money paid in UGCad pays independent creators for real-world creative services (video shoots with physical products shipped to the creator). The videos are used outside the app on the brand's own channels. Funds are held in escrow and released to the creator on approval. The wallet is prepaid balance for these services and unlocks no app feature or digital content, so we use Razorpay and not In-App Purchase. There are no subscriptions or digital goods sold in the iOS app.

USER-GENERATED CONTENT (Guideline 1.2)
- Terms and Community Guidelines must be accepted at sign-up (checkbox) and the Creator & Brand Agreement before trading; they prohibit objectionable content and abusive behaviour and state we remove content and eject offenders.
- Report: open any chat (top-right menu) or a creator profile (flag icon) -> Report. Block: same menu -> Block (blocked users cannot message you).
- Pre-moderation: new accounts and briefs are approved by staff before they go live. Contact details are filtered from chat.
- Reports go to our moderation queue and are handled within 24 hours. Contact: support@ugcad.io.

ACCOUNT DELETION (5.1.1(v))
Settings -> Delete account (creators) / Close account permanently (brands) -> type DELETE. This deletes the account and personal data; records that Indian tax law requires (invoices, payouts) are retained as stated in the privacy policy.

PRIVACY: https://ugcad.io/privacy   SUPPORT: https://ugcad.io/support
We do not track users and do not show ads. Age: 18+ (Terms).
Contact for the review team: REVIEW_CONTACT_NAME, REVIEW_CONTACT_PHONE, support@ugcad.io
```

Status checks before pasting: the confirmation push in item 2 exists only after the backend sends one when a device token is first registered (gap B-11 in `WEBSITE_BACKEND_GAPS.md`; otherwise delete that sentence and trigger a push yourself from a second device logged in as the brand); item 4 "Share icon" exists only after the website adds it (checklist 4.2); "Hide My Email" is Apple's UI; the 24-hour promise must match the Terms text; the account-deletion wording must match what `DELETE /api/profile` really does (it deletes the user record and personal data; messages remain with the sender name blanked, financial records remain).

---

## 2. Test accounts the owner must prepare (NEEDS OWNER)
Where to do it: the admin panel on https://ugcad.io/dashboard/admin (founder login), or a one-off script modelled on `ugcad-backend/reset_demo.py` / `seed_dummy.py` (both create a full deal flow for `testbrand@test.com` and `test@gmail.com`; run against a copy of the database, never against production without a backup).

| Requirement | Brand (`REVIEW_BRAND_EMAIL`) | Creator (`REVIEW_CREATOR_EMAIL`) |
|---|---|---|
| Login | e-mail + password, 2FA off, `banned=false`, `active` not false | same |
| Role / gates | `role=business`, `approval_status=approved`, `profile_completed=true` (otherwise every screen shows a pending/profile gate) | `role=creator`, `approval_status=approved`, `profile_completed=true`, `creator_directory_visible` true |
| Identity | company profile, logo, GSTIN optional | photo, bio, languages, rate card / portfolio prices, 2-3 portfolio videos (short, safe, your own), bank or UPI saved |
| KYC | not applicable | `kyc.status="verified"`, `kyc_verified=true` (admin: KYC queue -> approve, or `POST /api/admin/kyc/{user_id}/review`). Without this the reviewer would be asked for a real PAN |
| Money | wallet balance >= INR 25,000 (admin: `POST /api/admin/wallet/adjust` with a reason; chat requires >= INR 2,500, `MIN_BRAND_CHAT_BALANCE`) | at least one released payment so Earnings is not empty; withdrawal needs KYC (already verified) |
| Agreement | accept the Creator & Brand Agreement yourself once (so the review starts at the dashboard), or leave it unaccepted to show the gate | same |
| Data | 1 draft brief; 1 live public brief with 2-3 creator bids; 1 deal with shipment pending; 1 deal with a submitted watermarked video waiting for review; 1 completed deal with a review; 1 chat thread with the creator; 3+ notifications | 1 pending bid; 1 active deal; 1 deal in "work due"; 1 completed deal + review; same chat thread; notifications |
| Directory | at least 6 other approved sample creators so Creators is not empty | n/a |
| Do not | leave "Coming soon" items reachable; use real people's photos/IDs; use real phone numbers; delete the accounts during review | same |

Test on a fresh install with both accounts before submitting. Provide the brand login in the App Store Connect "Sign-in required" fields and the creator login inside the Notes text.

---

## 3. Reply to a 4.3 rejection ("apps similar to others exist: what is different in your app")
Paste into the Resolution Center reply. Adjust the first line to the exact Apple message.

```
Hello App Review team,

Thank you for the feedback on guideline 4.3. UGCad is one app (bundle ID io.ugcad.app); we have not submitted any other binary, template or duplicate of it, and we are not reusing another developer's code, design or content. Here is what makes it different from the creator/influencer apps you may be comparing it with, and what we changed in this version:

1. It is a managed marketplace, not a directory or feed. Every creator and every brand is reviewed and approved by our staff before they can transact, and campaign briefs are reviewed before going live (account approval gate screens appear on first sign-up).
2. Creators must pass identity verification (KYC: PAN, optional Aadhaar, 18+ check) before any payout. Payouts are impossible without it.
3. Money is held in escrow. The brand's payment is reserved when a creator is hired and released only when the brand approves the video. Our staff can hold, refund or release funds in disputes.
4. Videos stay watermarked until the brand approves them, so work cannot be taken without payment.
5. The app covers the full production workflow in one place: brief, bids, hiring, shipping the physical product to the creator (the creator's address is hidden from the brand), delivery, up to two free revisions, approval, two-way reviews, and a dispute process with rulings and appeals.
6. It is built for Indian D2C brands: INR wallet funded through Razorpay (UPI, cards, net banking), GST invoices, TDS on payouts, creator levels with minimum price floors.
7. Chat blocks phone numbers/e-mails and uses structured offer cards; chat is moderated by our staff with a strike system.
8. Native iOS capabilities: Sign in with Apple, push notifications that open the relevant deal or chat, camera and photo/video picker for portfolios, deliverables and KYC documents, the iOS share sheet, universal links, UPI app hand-off, and an app-specific phone interface (41 dedicated screens with tab bar and sheets) rather than our desktop website.
9. User safety in this version: report and block on chats and profiles, Terms accepted at sign-up, staff moderation within 24 hours, in-app account deletion.

Demo accounts are in App Review Information (brand) and Notes (creator); both are pre-approved with data, so no real ID or payment is needed. We would be glad to answer any question or share a short screen recording that walks through the points above.

Best regards,
REVIEW_CONTACT_NAME, UGCad
```

Tips: reply once, politely, keep it factual; attach a 60-90 second screen recording (login as brand -> campaign -> escrow -> work review with watermark -> approve -> creator earnings) to the reply if the Resolution Center allows attachments. If rejected again, use "Request a phone call" from the Resolution Center or the App Review Board appeal; do not resubmit unchanged.

---

## 4. Short replies to likely follow-ups

### 4.2 "Your app is simply a web site packaged as an app"
```
UGCad uses native iOS features that a website cannot provide inside Safari: Sign in with Apple and Google (native sheets), push notifications (APNs/FCM) that deep-link into deals and chats, the camera and photo/video library for deliverables, portfolio and KYC documents, the share sheet, universal links, and UPI app hand-off for payments. The interface is a dedicated phone UI (tab bar, bottom sheets, safe areas, gesture back), not our desktop site. The service is dynamic (accounts, escrow payments, live deals, messaging), not static content or a link collection. Server-driven screens let us ship fixes quickly, as is common for transactional apps.
```
Fallback if rejected anyway: add native pieces listed in the checklist (native tab bar, badge count, local deadline reminders, Face ID lock) and resubmit.

### 3.1.1 "payments"
```
Payments in UGCad are made by businesses to independent creators for custom video production, a real-world service consumed outside the app (the videos are used on the brand's own channels; products are physically shipped to the creator). Per Guideline 3.1.3(e) we use Razorpay rather than In-App Purchase. Wallet balance is prepaid funds for these services; it unlocks no features or digital content in the app. There are no subscriptions or digital goods in the iOS app.
```

### 1.2 "user-generated content"
```
The app has: Terms/Community Guidelines accepted at sign-up that prohibit objectionable content and abusive behaviour; staff approval of every new account and brief before it is visible; automatic filtering of contact details and policy keywords in chat; a Report option on chats and profiles (and on content in this version); a Block option; staff moderation of reports within 24 hours with the ability to remove content and ban users; published contact support@ugcad.io.
```

### 5.1.1(v) "account deletion"
```
Settings -> Delete account (creators) / Close account permanently (brands) deletes the account and personal data after a typed confirmation, and revokes Sign in with Apple credentials. Records that Indian tax and accounting law require us to keep (invoices, payouts) are retained and described in our privacy policy at https://ugcad.io/privacy.
```
(Only use the "revokes Sign in with Apple credentials" phrase after the backend revocation is implemented.)

### 2.1 "we could not log in / content missing"
Reply with: exact steps, the accounts, the screen recording, and ask them to confirm the account still works (check it first; Apple often tests several days after submission).

---

## 5. Reviewer quick walk-through (attach as PDF/Notes if space allows)
1. Open the app -> login screen. Tap "Continue with Apple" (iOS only) or log in as the brand.
2. Brand: Home -> Campaigns -> open the live campaign -> see bids -> "Hire" creates escrow (do not hire; a hired deal already exists). Open the deal with "Review work" -> play the watermarked video -> Approve (optional).
3. Brand: Messages -> open the thread -> menu -> Report / Block. Creators -> a creator -> flag icon.
4. Brand: Wallet -> Add funds opens Razorpay (cancel).
5. Settings -> Legal & policies; Settings -> Delete account (do not confirm on the review account).
6. Log out -> log in as the creator: Orders -> active deal -> upload work -> camera/photo picker; Profile -> add portfolio photo/video; More -> Verify KYC (already verified, shows status); Earnings.
7. Notifications arrive when the other account acts (message, approval).
