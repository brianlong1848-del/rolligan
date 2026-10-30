import { useState } from "react";

const APP_STORE_URL = "https://apps.apple.com/us/app/rolligan/id6774974562";

function AppStoreBadge({ className = "" }) {
  return (
    <a
      className={`app-badge ${className}`}
      href={APP_STORE_URL}
      target="_blank"
      rel="noreferrer"
      aria-label="Download Rolligan on the App Store"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="app-badge-logo">
        <path
          fill="currentColor"
          d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.45 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"
        />
      </svg>
      <span className="app-badge-text">
        <small>Download on the</small>
        <strong>App Store</strong>
      </span>
    </a>
  );
}

function HeroDice() {
  return (
    <img
      className="dice-art"
      src="/hero-dice.png"
      alt="Three Rolligan dice mid-roll"
      width="724"
      height="369"
      fetchPriority="high"
    />
  );
}

function PipMark() {
  return (
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#1A1A20" stroke="rgba(248,247,244,0.15)" />
      <circle cx="11" cy="16" r="5.5" fill="#FF6B35" />
      <circle cx="22" cy="10" r="3.2" fill="#4ECDC4" />
      <circle cx="22" cy="22" r="3.2" fill="#4ECDC4" />
    </svg>
  );
}

function Nav() {
  return (
    <nav className="nav" aria-label="Primary">
      <div className="nav-inner">
        <a href="#top" className="nav-logo" aria-label="Rolligan home">
          <span className="nav-dot" aria-hidden="true" />
          Rolligan
        </a>
        <div className="nav-links">
          <a href="#see">See it</a>
          <a href="#duo">iPhone Duo</a>
          <a href="#how">How it works</a>
          <a href={APP_STORE_URL} target="_blank" rel="noreferrer" className="pill-cta pill-cta-sm">Get the app</a>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="hero" id="top" aria-labelledby="hero-h">
      <div className="hero-grid">
        <div className="hero-text">
          <p className="tracker">Push your luck · Dice party game</p>
          <h1 id="hero-h" className="wordmark">Rolligan</h1>
          <p className="hook">The dice game where we can hang out, laugh, and not have to strategize while playing.</p>
          <p className="hero-sub">For 2+ players. First 3 games free, then $2.99 once.</p>
          <div className="cta-row">
            <AppStoreBadge />
            <a href="#see" className="pill-cta pill-glass">See it in action ↓</a>
          </div>
          <p className="hero-chips">
            <span className="chip">iPhone</span>
            <span className="chip">iPhone Duo</span>
            <span className="chip">Join free from any browser</span>
          </p>
        </div>
        <div className="hero-visual">
          <div className="hero-glow" aria-hidden="true" />
          <HeroDice />
        </div>
      </div>
    </section>
  );
}

const SCREENS = [
  { key: "board", label: "The pot", alt: "Rolligan game board: the pot at 348 with players banking" },
  { key: "winner", label: "The winner", alt: "Rolligan winner screen with final scores" },
  { key: "setup", label: "Game setup", alt: "Rolligan setup screen: add players and choose real or virtual dice" },
  { key: "home", label: "Home", alt: "Rolligan home screen" },
];

function PhoneFrame({ src, alt, className = "", eager = false }) {
  return (
    <figure className={`phone ${className}`}>
      <div className="phone-body">
        <img
          src={src}
          alt={alt}
          width="660"
          height="1434"
          loading={eager ? "eager" : "lazy"}
          decoding="async"
        />
        <span className="glass-sheen" aria-hidden="true" />
      </div>
    </figure>
  );
}

function PhoneRow() {
  return (
    <div className="phone-row">
      {SCREENS.map((s, i) => (
        <PhoneFrame
          key={s.key}
          src={`/shots/iphone-${s.key}.jpg`}
          alt={s.alt}
          className={`phone--${i + 1}`}
        />
      ))}
    </div>
  );
}

function Showcase() {
  return (
    <section className="section" id="see" aria-labelledby="see-h">
      <div className="page">
        <p className="tracker">02 — See it</p>
        <h2 id="see-h">Built for the table.</h2>
        <p className="lede">
          Big dice, big buttons, one shared pot. Everyone plays on their own phone, so the
          only thing on the table is the drama.
        </p>
      </div>
      <PhoneRow />
      <p className="fine page">Player faces shown are fictional demo avatars.</p>
    </section>
  );
}

function DuoSection() {
  const [i, setI] = useState(0);
  const cur = SCREENS[i];
  return (
    <section className="section duo" id="duo" aria-labelledby="duo-h">
      <div className="page">
        <p className="tracker">03 — iPhone Duo</p>
        <h2 id="duo-h">Open it up. Rolligan fills the whole screen.</h2>
        <p className="lede">
          Rolligan is built for iPhone Duo. Unfold it and the game spreads across the inner
          display: the scoreboard on one side, the big roll button on the other, and a hinge
          roll to throw the dice. Fold it shut and it plays like a regular iPhone.
        </p>

        <div className="duo-stage">
          <div className="duo-device" role="img" aria-label={`iPhone Duo unfolded, showing the Rolligan ${cur.label.toLowerCase()} screen`}>
            <div className="duo-bezel">
              {SCREENS.map((s, n) => (
                <img
                  key={s.key}
                  className={`duo-img ${n === i ? "is-on" : ""}`}
                  src={`/shots/duo-${s.key}.jpg`}
                  alt=""
                  width="1600"
                  height="1126"
                  loading={n === 0 ? "eager" : "lazy"}
                  decoding="async"
                />
              ))}
              <span className="duo-crease" aria-hidden="true" />
              <span className="glass-sheen" aria-hidden="true" />
            </div>
          </div>

          <div className="seg" role="tablist" aria-label="Rolligan screens on iPhone Duo">
            {SCREENS.map((s, n) => (
              <button
                key={s.key}
                role="tab"
                aria-selected={n === i}
                className={`seg-btn ${n === i ? "is-on" : ""}`}
                onClick={() => setI(n)}
                type="button"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <p className="fine">Real screens from the app on the iPhone Duo simulator. Player faces are fictional demo avatars.</p>
      </div>
    </section>
  );
}

function WhyPlay() {
  return (
    <section className="section" aria-labelledby="why-h">
      <div className="page">
        <p className="tracker">01 — Why play</p>
        <div className="glass-card why-card">
          <h2 id="why-h">A game for the table, not the spreadsheet.</h2>
          <p>
            Rolligan is the dice game where you can hang out, laugh, and not have to strategize while
            playing. Bring it out when the conversation's loose and nobody wants to think — roll the
            dice, build the pot, and bank your points before someone rolls a 7. That's the whole game.
          </p>
          <p>
            It doesn't punish you for being half-checked-out. The tension comes free — every roll,
            you're either pushing your luck or banking it, and either choice gets a reaction at the
            table.
          </p>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", title: "Roll", body: "Players take turns rolling two dice, and every roll adds to one shared pot. In the first three rolls a 7 is worth 70." },
    { n: "02", title: "Bank", body: "Anyone can bank at any time to lock in the pot. Once you bank, you're safe for the rest of the round." },
    { n: "03", title: "Bust", body: "After three rolls, doubles double the pot, but a 7 wipes it out for everyone who hasn't banked." },
  ];
  return (
    <section className="section" id="how" aria-labelledby="how-h">
      <div className="page">
        <p className="tracker">04 — How it works</p>
        <h2 id="how-h">Three moves. That's the whole game.</h2>
        <ol className="steps-grid">
          {steps.map((s) => (
            <li key={s.n} className="glass-card step-card">
              <span className="step-n">{s.n}</span>
              <strong>{s.title}</strong>
              <span className="step-body">{s.body}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function GetTheApp() {
  return (
    <section className="section" id="ios" aria-labelledby="ios-h">
      <div className="page">
        <p className="tracker">05 — Get the app</p>
        <div className="glass-card ios-card">
          <div className="ios-copy">
            <span className="ios-pill">
              <span className="ios-pill-dot" aria-hidden="true" />
              Now on iOS
            </span>
            <h2 id="ios-h">Try 3 games free.</h2>
            <p className="ios-lede">
              Download Rolligan, gather two or more friends, and you're playing in under a
              minute. Everyone joins from their own phone — no account needed.
            </p>
            <p className="ios-lede">
              Your first 3 games are free. After that, one $2.99 unlock keeps you playing
              forever: unlimited games, hosting rooms and every house rule. No subscription.
              Friends always join free, in the app or right here on the web.
            </p>
            <div className="cta-row">
              <AppStoreBadge />
              <a href="/join" className="pill-cta pill-glass">Joining a friend? Enter a code</a>
            </div>
          </div>
          <div className="ios-phones" aria-hidden="false">
            <PhoneFrame src="/shots/iphone-home.jpg" alt="Rolligan home screen on iPhone" className="ios-phone ios-phone--back" />
            <PhoneFrame src="/shots/iphone-board.jpg" alt="Rolligan game board on iPhone" className="ios-phone ios-phone--front" />
          </div>
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section className="section" id="about" aria-labelledby="about-h">
      <div className="page">
        <p className="tracker">06 — Who builds it</p>
        <h2 id="about-h">An independent studio in Chicago.</h2>
        <p>
          Rolligan is made by{" "}
          <a href="https://clarendon.dev" target="_blank" rel="noreferrer">Clarendon Labs</a> — an
          independent app studio building games, home tools, and everyday utilities. One well-made
          app at a time.
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer>
      <div className="page footer-inner">
        <span className="footer-mark">
          <PipMark />
          © 2026 Clarendon Labs LLC
        </span>
        <span className="footer-links">
          <a href="/privacy.html">Privacy Policy</a>
          <span aria-hidden="true">·</span>
          <a href="mailto:support@clarendon.dev">Support</a>
          <span aria-hidden="true">·</span>
          rolligan.com
        </span>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <>
      <div className="ambient" aria-hidden="true">
        <span className="orb orb--a" />
        <span className="orb orb--b" />
        <span className="orb orb--c" />
      </div>
      <Nav />
      <Hero />
      <WhyPlay />
      <Showcase />
      <DuoSection />
      <HowItWorks />
      <GetTheApp />
      <About />
      <Footer />
    </>
  );
}
