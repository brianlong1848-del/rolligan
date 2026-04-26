# Rolligan rebrand — assets & follow-up work

Generated as part of the BANK → Rolligan rebrand. Tracks every piece of work
that needs a designer / a human / a manual dashboard click. Code-side rebrand
is in PR (branch `rebrand/rolligan`).

---

## 🎨 Assets to design (do not generate AI placeholders for these)

### 1. App icon (priority: blocking App Store submission)
- **Current:** Bank/dice theme — does not match new brand.
- **Sizes / placements that consume it:**
  - iOS app icon (1024×1024 master, exported to all required sizes by Xcode/Expo)
  - PWA `public/icon-192.png` (192×192)
  - PWA `public/icon-512.png` (512×512, maskable safe-zone aware)
  - `public/apple-touch-icon.png` (180×180)
- **Notes:** iOS icon must be flat (no transparency, no rounded corners — Apple rounds them). Maskable PWA icons need a 20% safe-zone per the W3C maskable spec.

### 2. Favicon
- **File:** `public/favicon.ico` (currently missing — Vite was using `/icon-192.png` as the icon link). Want a 32×32 or 48×48 .ico for browser tabs.
- Also consider `public/favicon.svg` for crisp rendering on hi-dpi screens.

### 3. Open Graph / Twitter share image
- **File:** referenced as `https://rolligan.com/og-image.png` in `index.html`. Currently does NOT exist.
- **Spec:** 1200×630 PNG. Should include the Rolligan wordmark, dice motif, and a one-line tagline. Safe area: keep important content within the central 1200×600 since some platforms crop edges.

### 4. In-app logo / wordmark
- **Current state:** the setup screen renders the word "Rolligan" in the system Impact font with a gold glow. That's a placeholder — fine to ship MVP, but a real wordmark (SVG) would look more polished.
- **File destination:** `src/assets/wordmark.svg` (doesn't exist yet).
- **Decision needed:** keep typographic-only wordmark, or add a small dice mark next to it?

### 5. Splash / launch screen
- **iOS:** Expo (`app.json` on `claude/expo-ios-app` branch) currently points to `assets/splash-icon.png` — placeholder from the Expo template. Needs replacement with Rolligan splash artwork.
- **Web PWA:** no splash file yet; iOS Safari "add to home screen" generates one from the icon.

### 6. Optional: marketing screenshots
- App Store Connect needs screenshots at 6.7", 6.5", 5.5" iPhone and 12.9" iPad sizes. Defer until UI is finalized.

---

## 🎨 Color palette — Rolligan choice pending

The current palette is in `src/App.jsx` lines 3–18 as a single `T` object.
This is the only definition; everything else references `T.<key>` or hardcoded hex in two non-code spots:

- `index.html` body background (`#060e1c`)
- `public/manifest.json` `background_color` / `theme_color` (`#060e1c`)

When you choose the Rolligan palette, swapping the `T` object + those two strings is a one-pass change.

**Current tokens (BANK-era):**
| Token | Hex | Usage |
|---|---|---|
| `bg` | `#060e1c` | App background (deep navy) |
| `s1` | `#0b1a2f` | Surface 1 — cards |
| `s2` | `#112240` | Surface 2 — buttons |
| `s3` | `#162e52` | Surface 3 — pressed/active |
| `border` | `#1c3460` | Borders |
| `gold` | `#f5a623` | Brand accent / primary |
| `gFade` | `rgba(245,166,35,0.13)` | Gold tinted background |
| `gGlow` | `rgba(245,166,35,0.35)` | Gold glow / shadow |
| `green` | `#00d97e` | Bank-action / success |
| `nFade` | `rgba(0,217,126,0.12)` | Green tinted background |
| `red` | `#ff4d5a` | Seven / danger |
| `rFade` | `rgba(255,77,90,0.13)` | Red tinted background |
| `text` | `#cce0f5` | Primary text |
| `sub` | `#4d7099` | Subtle text |

---

## 🛠️ Manual / dashboard work (you, not me)

### Vercel
- [ ] Rename Vercel project `bank-game` → `rolligan` in the dashboard
- [ ] After rename, the auto-generated URL becomes `rolligan.vercel.app`
- [ ] Once the rebrand PR merges to `main`, trigger a redeploy to confirm
- [ ] (Later) attach `rolligan.com` as a custom domain

### Domain
- [ ] Purchase `rolligan.com` (registrar of choice; Cloudflare Registrar is the cheap default)
- [ ] Point DNS at Vercel's CNAME (`cname.vercel-dns.com`) per Vercel's domain instructions
- [ ] Verify in Vercel dashboard

### GitHub repo (optional, can wait)
- [ ] Repo is still `brianlong1848-del/bank-game`. If you want it renamed to `rolligan`, do it under repo Settings. GitHub auto-redirects the old URL, but update the `repository.url` in `package.json` afterward.

### Apple Developer / App Store Connect
- [ ] Create the app record in App Store Connect with bundle ID `com.brianlong.rolligan` (or `com.clarendonlabs.rolligan` if you prefer the publisher namespace — needs to match `app.json` ios.bundleIdentifier on the Expo branch)
- [ ] Reserve the name "Rolligan" early; App Store name reservations are first-come first-served
- [ ] Privacy policy URL — required for submission. Needs to live somewhere (rolligan.com/privacy or a Notion page)
- [ ] Support URL — required. Same applies.

---

## 🧹 Code-side follow-ups (out of scope for this PR)

- [ ] Color palette swap once Rolligan colors chosen (one-pass change, see "Color palette" section above)
- [ ] Add a How-to-Play modal — flagged in copy refresh; doesn't exist on `main` yet (it does exist as a component on `claude/expo-ios-app` branch)
- [ ] On `claude/expo-ios-app`: update `app.json` brand fields (`name`, `slug`, `scheme`, `bundleIdentifier`) to Rolligan values; update placeholder splash + icon files; finish the BankGame port. See that branch for context.
- [ ] On `claude/expo-ios-app`: rename component file `BankGame.js` → `Rolligan.js` if you want full alignment (purely cosmetic, not user-facing).
- [ ] Consider adding a `LICENSE` file (proprietary or MIT) — repo currently has no license.
