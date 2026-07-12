# Rolligan iOS — App Store handoff & living memory

> **This is a living document.** Update it on every meaningful change (build shipped, submission state
> change, rejection, credential change) and commit, so the repo keeps a historical record. Newest entries
> go at the top of the **Changelog** at the bottom. Lives in the web repo because the iOS project folder
> (`~/code/clarendon-labs/rolligan-ios`) is not under git.

**Last updated:** 2026-07-12
**iOS repo:** `~/code/clarendon-labs/rolligan-ios` (NOT git — no stash/checkout fallback)
**This repo (web + docs, is git):** `~/code/clarendon-labs/rolligan` → `github.com:brianlong1848-del/rolligan.git`

---

## TL;DR — the one job left

Resubmit **Rolligan 1.2.1** to App Review with **build 15** attached. All code + builds are DONE and on
TestFlight. The submission is **PAUSED awaiting Brian's explicit go-ahead** on two irreversible,
Apple-facing steps (posting the Resolution Center reply, hitting Submit). Do NOT submit without a clear
"go" from Brian. Chrome is connected and logged into App Store Connect, so this can be driven in the
ASC web UI (Path B) or via the ASC API.

---

## Current state (verified via ASC API + ASC web UI this session)

- **App Store version 1.2.1** = `REJECTED`, **no build attached**. version id `d6b914ff-c580-444d-8b03-669ac39416a6`.
- **Open rejection thread** (Resolution Center): review submission `ee3a5c4f-b013-4298-8b55-8e1c504879fa`, state `UNRESOLVED_ISSUES` (Jul 5).
- **1.2 is LIVE** (`READY_FOR_SALE`).
- **Rejection reason:** Guideline 2.1 — the reviewer could not see/trigger the App Tracking Transparency (ATT) prompt.
- **Chrome MCP is connected**, logged in as **Christopher Long / Clarendon Labs LLC**; ASC UI is reachable.

## Builds (all VALID + on TestFlight, marketing version 1.2.1)

| Build | What it adds | ASC build id |
|---|---|---|
| 12 | ATT hardening (Settings → "Turn on personalized ads") + good-seven splash, banker redo, universal links | `fbac57dd-3764-4bff-9537-bed680145dc4` |
| 13 | Universal (iPhone + iPad), all iPad orientations, bespoke iPad layouts | — |
| 14 | iPad portrait game-board fix (width-based pane switch) | `43d437bc-0c1c-4df3-93c8-bc42d71ba246` |
| **15** | **iPhone landscape UI** (submit THIS one) | `5abaedac-2596-4298-a16f-71820ccb5650` |

Developer internal TestFlight group `850ed0c2-8078-4f23-bd5b-44e8125b98de` has `hasAccessToAllBuilds=true`,
so every VALID build auto-lands there. Brian's tester: **cbrianlong@me.com**.

---

## Steps to finish

1. ✅ **DONE — Build 15 attached** to the 1.2.1 App Store version (PATCH via ASC API, verified).
2. ✅ **DONE — iPad screenshots uploaded.** Four 2064×2752 (iPad 13″) shots — Home, game board,
   Setup/House Rules, winner celebration — captured on the `iPad Pro 13-inch (M5)` sim
   (`BDF8B897-8BFE-4267-BA19-6846DCAABE77`) and uploaded to the **en-US** `APP_IPAD_PRO_3GEN_129`
   screenshot set (`1a8f0e4d-22cd-49bb-b660-e877de21f203`), assetDeliveryState = COMPLETE. Source files
   saved at `~/Downloads/rolligan-1.2.1-ipad-screenshots/`. (Only en-US filled — the primary locale is the
   default fallback; if submission validation demands per-locale iPad shots for the other 6 locales
   (en-AU/en-GB/es-ES/de-DE/fr-FR/es-MX), copy the set to those too.) iPhone screenshots carry over from 1.2.
3. ⏸️ **Post the Resolution Center reply** — GATED on Brian's go. (Sends to Apple; needs OK on wording. Draft below.)
4. ⏸️ **Submit 1.2.1 (build 15) for review** — GATED on Brian's go. (Irreversible.)

### Drafted Resolution Center reply (Brian must approve wording before posting)

> Hello, and thank you for the review.
>
> This version (1.2.1, build 15) resolves the App Tracking Transparency issue from the previous review.
> The app now provides a clear, discoverable way to present the ATT permission request on demand, in
> addition to the automatic request on launch:
>
> 1. On the Home screen, tap the **gear (Settings)** icon in the top-right corner.
> 2. Under **"Personalized ads,"** tap **"Turn on personalized ads."**
> 3. This presents the system App Tracking Transparency prompt.
>
> The app also requests App Tracking Transparency automatically shortly after first launch, once the app
> is foreground/active. Rolligan is fully functional whether or not tracking is allowed — declining only
> limits off-app ad personalization and measurement.
>
> This version also adds full **iPad support** (all orientations) and **iPhone landscape**.
>
> Thank you,
> Brian — Clarendon Labs

---

## Open questions for Brian (blockers)

1. **Go-ahead to submit?** He dismissed the submit confirmation once and hasn't given a clear yes since.
2. **ATT video:** the original session plan gated resubmission on Brian recording an ATT demo video first.
   Confirm it's handled, or that the written "Settings → Turn on personalized ads" steps in the reply are enough.
3. **"yes to #2"** — a stray reference in an earlier Brian message; never resolved what it meant. Ignore unless he clarifies.

---

## Reference — credentials, tooling, gotchas

**ASC API** (for scripting): app id `6774974562`, Issuer ID `7fb35999-f0a9-4864-8dd0-745da6b7d09f`,
working key **`6A9A8Z5M76`** (`.p8` at `~/Downloads/AuthKey_6A9A8Z5M76.p8` — move to `~/code/clarendon-labs/secrets/`;
the older `AuthKey_BW4C8V7UP2.p8` in secrets/ is STALE and 401s). No PyJWT installed — mint ES256 JWTs with
Node's built-in `crypto` (`createSign('SHA256')` + `dsaEncoding:'ieee-p1363'`, aud `appstoreconnect-v1`).
Team ID `VPTJN4K7C3`, bundle `com.clarendonlabs.Rolligan`.

**Build/archive/upload** (if a new build is ever needed): `xcodegen generate` first. Archive normally, but the
**export/upload MUST prefix PATH with system dirs** or it fails "Copy failed" (Homebrew rsync 3.4.2 shadows
system rsync and breaks Xcode's IPA packaging):
`PATH="/usr/bin:/bin:/usr/sbin:/sbin:$PATH" xcodebuild -exportArchive -archivePath … -exportOptionsPlist /tmp/RolliganExportOptions.plist -allowProvisioningUpdates`.
Signing is `-allowProvisioningUpdates` (only an "Apple Development" cert in keychain; it auto-creates the Store profile).
Export compliance auto-clears (`ITSAppUsesNonExemptEncryption: false` in project.yml).

**Simulator rotation gotcha:** the headless sim CANNOT be rotated reliably (no `simctl` rotate; osascript keystrokes
blocked; `requestGeometryUpdate` ignored; orientation drifts between launches). To capture a specific orientation,
temporarily force it via the plist (`UISupportedInterfaceOrientations[~ipad]` set to portrait-only or landscape-only),
regenerate, build. Landscape captures come out rotated in the framebuffer — fix with `sips --rotate 90/180/270`.
`simctl erase` resets a sim to portrait. Restore all-orientations before shipping.

**iPad/iPhone layout architecture:** bespoke layouts key on `@Environment(\.horizontalSizeClass) == .regular`
(`isPad`) and a `wide` flag = `verticalSizeClass == .compact` (iPhone landscape) OR `width >= 1100`
(iPad landscape). Helpers in `Rolligan/Views/Components/RolliganLayout.swift` (`OrientationReader`,
`rolliganUsesWideLayout`). Do NOT branch on raw `width > height` — stale geometry after rotation misfires it.

---

## Changelog (newest first)

- **2026-07-12** — **Attached build 15** to the 1.2.1 version and **uploaded 4 iPad 13″ screenshots**
  (Home, board, Setup, winner) to the en-US slot — all COMPLETE. Submission still PAUSED before the
  reply + Submit (both gated on Brian's explicit go). Temp screenshot scaffolding added + removed from the
  iOS source (archive-clean).
- **2026-07-12** — Committed this handoff to the repo as the living memory doc. Chrome MCP reconnected; ASC
  web UI reachable (logged in as Christopher Long). Submission still PAUSED pending Brian's go-ahead.
- **2026-07-12** — Shipped **build 15** (iPhone landscape UI): Home compact hero + CTAs side-by-side, Setup
  two-column, game board two-pane with a scrollable play column in the short landscape height. VALID on TestFlight.
- **2026-07-12** — Shipped **build 14** (fix: iPad portrait game board was showing the landscape two-pane
  letterboxed; switched orientation branching from `width>height` to a width threshold). VALID on TestFlight.
- **2026-07-12** — Shipped **build 13** (universal: iPhone + iPad, all iPad orientations, bespoke iPad layouts;
  iPad joiner winner celebration; How-to-Play 2-col; QR-scan join; each-roller house rule). VALID on TestFlight.
- **2026-07-12** — Shipped **build 12** (ATT hardening: manual Settings trigger + retained launch auto-trigger;
  good-seven splash; banker redo of busting 7; universal links). VALID on TestFlight; on Developer group.
  This is the build that addresses the Guideline 2.1 rejection; builds 13–15 stack UI work on top of it.
