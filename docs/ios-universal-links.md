# iOS Universal Links — open a shared game straight in the app

## What ships today (web side, this repo)

When a **scanned share link** (`https://rolligan.com/join?code=ABCD`) opens:

- **Android / desktop** → the web join flow loads and auto-joins, exactly as
  before. Untouched.
- **iPhone / iPad** → `src/JoinGame.jsx` shows a short "Play on iPhone" screen
  with the game code and sends the player to the **App Store** to get Rolligan.
  If they already have the app, the App Store page shows **Open**.

This already satisfies "if they don't have it, send them to the App Store." What
it does **not** do on its own is open an installed app **directly to that
specific game** — that needs Universal Links, configured on the iOS app below.

## The seamless upgrade — open the installed app straight to the game

With a Universal Link configured, iOS intercepts `rolligan.com/join?code=ABCD`
**before Safari loads the page**: installed → the app opens to that game;
not installed → Safari loads our page → we bounce to the App Store. The web
redirect above then only ever runs for people who don't have the app, so the two
behaviors compose correctly with **no web changes needed**.

Two pieces are required. One is web (this repo), one is the iOS app.

### 1. Web: serve the Apple App Site Association file (this repo) — READY TO ADD

Host this at **`https://rolligan.com/.well-known/apple-app-site-association`**
(no file extension, served as `application/json`). In this Vite/Vercel project,
put it at `public/.well-known/apple-app-site-association`.

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAMID.BUNDLEID",
        "paths": [ "/join", "/join/*" ]
      }
    ]
  }
}
```

Replace `TEAMID.BUNDLEID` with the real values, e.g.
`A1B2C3D4E5.com.clarendonlabs.rolligan`. Both are **unknown to this repo** —
see "What I need" below.

Add a header so Vercel serves it as JSON (in `vercel.json`):

```json
{
  "headers": [
    {
      "source": "/.well-known/apple-app-site-association",
      "headers": [{ "key": "Content-Type", "value": "application/json" }]
    }
  ]
}
```

> The file is intentionally **not** committed with placeholder values, because
> iOS caches the AASA on install and a wrong `appID` would need a redeploy to
> fix. Drop it in once the real Team ID + bundle ID are known.

### 2. iOS app (separate codebase — not in this repo)

- Add the **Associated Domains** capability with `applinks:rolligan.com`.
- Handle the incoming `NSUserActivity` / `onOpenURL` for
  `rolligan.com/join?code=ABCD`, read the `code`, and join that game.
- (Expo: add `associatedDomains: ["applinks:rolligan.com"]` to `app.json` under
  `ios`, and handle the URL via `Linking`.)

## What I need to finish the seamless path

1. **Apple Developer Team ID** (10 chars, e.g. `A1B2C3D4E5`).
2. **Bundle identifier** (docs mention `com.brianlong.rolligan` **or**
   `com.clarendonlabs.rolligan` — which one shipped?).
3. Confirmation the iOS app can add Associated Domains + handle the `/join` URL
   (or a ticket for whoever owns the app).

With 1–3 I can commit the AASA file + `vercel.json` header, and the shared link
will open an installed app straight to the game.

## Deferred deep link (optional, later)

App Store links can't carry the game `code` through a fresh install, so a
brand-new installer opens the app without it and types the code shown on the
interstitial. If we ever want the code to survive install automatically, that
needs a deferred-deep-link service (Branch, AppsFlyer, etc.) — out of scope for
now.
