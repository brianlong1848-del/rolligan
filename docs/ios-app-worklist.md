# iOS app worklist — handoff for Claude dispatch

**Purpose:** single source of truth for the Rolligan **iOS banker app** changes
that came out of the July 2026 gameplay feedback. The web client (this repo) work
is **done and shipped in PR #5**; the items below live in the **iOS app**, whose
source is **not in this repository** (App Store `id6774974562`; not found in any
repo reachable from `brianlong1848-del`). A dispatch agent with access to the iOS
codebase should pick these up. Check the boxes as they land.

> Context: the iOS banker app is the **authority** for all game state and
> broadcasts it over Supabase realtime; the web client (`rolligan.com/join`) is a
> passive renderer of those broadcasts. Anything that changes game state or the
> banker's own screens has to happen in the iOS app.

---

## Status at a glance

| # | Change | Web (this repo) | iOS app |
|---|--------|-----------------|---------|
| 1 | Banked player still "up to roll" (Eric bug) | ✅ guard shipped (PR #5) | ⬜ root-cause fix needed |
| 2 | "Good seven" splash (+70 in safe rolls) | ✅ shipped (PR #5) | ⬜ parity needed |
| 3 | Banker redo of a busting 7 | n/a (banker-only) | ⬜ needed |
| 4 | Open shared link straight into the app | ✅ App Store hand-off + AASA doc | ⬜ Universal Links needed |

---

## 1. Advance the roller off a batch-banked roller  *(root cause of the "Eric" bug)*

**Symptom:** a player who banked (e.g. Eric, +171) is still shown **UP TO ROLL**
and asked to play the next round.

**Root cause (iOS):** when the banker collects a batch in the **"Who's banking?"**
sheet and that batch **includes the current roller**, `currentRollerId` is not
advanced. Banking the roller *individually* advances the turn correctly; a batch
that *contains* the roller does not.

**Fix:** after applying a batch bank (or any bank), if the current roller is now
banked/out, advance `currentRollerId` to the next player whose status is still
`in`. If everyone is banked, end the round as usual. Re-broadcast the corrected
state.

**Acceptance:**
- Bank a batch that includes the current roller → the next un-banked player
  becomes the roller; no banked player is ever shown "UP TO ROLL".
- Web already hardened defensively (`src/JoinGame.jsx`: a non-`in` player is
  never treated as the active roller), so once iOS advances correctly the two
  agree.

---

## 2. "Good seven" splash — parity with web

During the **first 3 (safe) rolls** a 7 pays **+70** to the pot instead of
busting. It should get a celebratory splash, just like the existing
**"Doubles are live"** moment.

**Behavior:**
- A 7 rolled while still in the safe phase → show a mint **"GOOD SEVEN!"** splash.
- If that 7 is the roll that **also closes the safe phase** (opens doubles/danger),
  show **one combined** splash — good-seven **plus** doubles-are-live — and
  **suppress** the standalone doubles splash so it doesn't double-pop.

**Copy (match the web client exactly):**
- Title: `GOOD SEVEN!`
- Sub: `the one 7 that loves you back — +70 to the pot`
- Tag: `quick, bank that karma before it turns evil 😈`
- Combined case appends the existing doubles copy: `…AND DOUBLES ARE LIVE` /
  `doubles ×2 the pot · a 7 now busts it` / `BANK IS OPEN`

**Reference implementation:** `src/JoinGame.jsx`, the `sevenSplash` state +
effect and its render block (mirrors the existing `dangerSplash`).

**Acceptance:** a safe-phase 7 pops "GOOD SEVEN!"; a 3rd-roll 7 pops the combined
splash once (not two overlapping splashes).

---

## 3. Banker redo of a busting 7  *(banker-only)*

**Ask:** the **banker** accidentally enters a **7 that busts the round** (post
safe-phase). They need a way to **undo that roll** and re-enter the correct one.
This is **banker-only** — it must **not** be exposed to web/Android/other-iPhone
players.

**Where:** the round-over / **BUST** screen (the "ROUND N DONE · 7 · BUST ·
NEXT ROUND →" screen). Add a **Redo / Undo the 7** control there, next to
"Next round".

**Behavior:** restore the game to the state **immediately before the busting 7**
— pot, each player's round points, roller, roll count, and round phase back to
"playing" — then let the banker enter the intended roll. Re-broadcast the restored
state so every joined device rolls back too.

**Guard rails:**
- Only offer redo for a **7 that busted** (not for normal round completion, not
  for a safe-phase +70 seven).
- Banker device only.

**Reference:** the Expo prototype (`claude/expo-ios-app` branch, `src/App.jsx`)
already has the shape of this — a `preRoll` snapshot captured in `doRoll()` and a
`doRedoRoll()` that restores it, plus an inline "redo" banner. Extend that snapshot
so it survives into the bust screen and surface a Redo button there. (Note: that
branch is an incomplete prototype, not the shipped app — use it as a pattern, not
a drop-in.)

**Acceptance:** banker taps Redo on a bust screen → round returns to its pre-7
state on the banker **and** all joined players; banker re-enters the correct roll;
no web/player device can trigger it.

---

## 4. Universal Links — open a shared link straight into the app

**Shipped on web:** a scanned share link (`rolligan.com/join?code=ABCD`) now routes
iPhone/iPad users to a "Play on iPhone" screen → App Store (which shows **Open** if
installed, **Get** if not). Android/desktop keep the web auto-join. See
`src/JoinGame.jsx` (`IosGetApp`).

**iOS work to make it seamless (open the installed app *to that exact game*):**
- Add **Associated Domains** capability: `applinks:rolligan.com`.
  (Expo: `ios.associatedDomains` in `app.json`.)
- Handle the incoming universal link for `rolligan.com/join?code=ABCD`: read
  `code` and join that game.
- Web half is documented and ready in **`docs/ios-universal-links.md`** (the AASA
  file + `vercel.json` header). **Blocked on info:** Apple **Team ID** and the
  shipped **bundle ID** (`com.brianlong.rolligan` vs `com.clarendonlabs.rolligan`).

**Acceptance:** scanning a share link on an iPhone **with** the app opens the app
straight into that game; **without** the app lands on the App Store.

---

## Done — web client (PR #5, `brianlong1848-del/rolligan`)

- ✅ Defensive guard: a non-`in` player is never rendered as the active roller
  (no "UP TO ROLL"/roll button/roller highlight for a banked player).
- ✅ "Good seven" splash + combined good-seven-plus-doubles splash.
- ✅ Android landing-page freeze: dropped `backdrop-filter` blur on phones
  (sticky-nav per-frame blur was the likely scroll-freeze cause).
- ✅ iPhone share-link routing → App Store hand-off; Android unchanged.
- ✅ Universal Links web setup documented (`docs/ios-universal-links.md`).

## Open questions for the product owner

1. Apple **Team ID** + shipped **bundle ID** (unblocks #4).
2. Is the Android freeze on the **landing page** or **in a live game**? (Landing
   page is fixed; in-game would be a separate cause.)
