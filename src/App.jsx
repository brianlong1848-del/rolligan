const APP_STORE_URL = "https://apps.apple.com/us/app/rolligan/id6774974562";

const SQRT3_2 = 0.8660254;

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

const PIP_PATTERNS = {
  1: [[0.5, 0.5]],
  2: [[0.27, 0.73], [0.73, 0.27]],
  3: [[0.27, 0.73], [0.5, 0.5], [0.73, 0.27]],
  4: [[0.27, 0.73], [0.73, 0.73], [0.27, 0.27], [0.73, 0.27]],
  5: [[0.27, 0.73], [0.73, 0.73], [0.5, 0.5], [0.27, 0.27], [0.73, 0.27]],
  6: [[0.27, 0.78], [0.27, 0.5], [0.27, 0.22], [0.73, 0.78], [0.73, 0.5], [0.73, 0.22]],
};

function project(face, u, v, s) {
  const vx = { x: s * SQRT3_2, y: -s / 2 };
  const vy = { x: -s * SQRT3_2, y: -s / 2 };
  const vz = { x: 0, y: -s };
  if (face === "right") return { x: u * vx.x + v * vz.x, y: u * vx.y + v * vz.y };
  if (face === "left")  return { x: u * vy.x + v * vz.x, y: u * vy.y + v * vz.y };
  return { x: vz.x + u * vx.x + v * vy.x, y: vz.y + u * vx.y + v * vy.y };
}

function IsoDie({ cx, cy, size, faces, idPrefix, pipColor, pipOpacity = 0.92, animClass }) {
  const s = size;
  const vx = { x: s * SQRT3_2, y: -s / 2 };
  const vy = { x: -s * SQRT3_2, y: -s / 2 };
  const vz = { x: 0, y: -s };

  const right = `M ${cx} ${cy} L ${cx + vx.x} ${cy + vx.y} L ${cx + vx.x + vz.x} ${cy + vx.y + vz.y} L ${cx + vz.x} ${cy + vz.y} Z`;
  const left  = `M ${cx} ${cy} L ${cx + vy.x} ${cy + vy.y} L ${cx + vy.x + vz.x} ${cy + vy.y + vz.y} L ${cx + vz.x} ${cy + vz.y} Z`;
  const top   = `M ${cx + vz.x} ${cy + vz.y} L ${cx + vz.x + vx.x} ${cy + vz.y + vx.y} L ${cx + vz.x + vx.x + vy.x} ${cy + vz.y + vx.y + vy.y} L ${cx + vz.x + vy.x} ${cy + vz.y + vy.y} Z`;

  const r = s * 0.058;

  const pipsOn = (face) =>
    PIP_PATTERNS[faces[face]].map(([u, v], i) => {
      const p = project(face, u, v, s);
      return (
        <circle
          key={`${face}-${i}`}
          cx={cx + p.x}
          cy={cy + p.y}
          r={r}
          fill={pipColor}
          opacity={pipOpacity}
        />
      );
    });

  return (
    <g className={`die ${animClass}`}>
      <path d={left}  fill={`url(#${idPrefix}-left)`}  />
      <path d={right} fill={`url(#${idPrefix}-right)`} />
      <path d={top}   fill={`url(#${idPrefix}-top)`}   />
      {/* edge highlights */}
      <path d={top}   fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
      <path d={right} fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="1" />
      <path d={left}  fill="none" stroke="rgba(0,0,0,0.28)" strokeWidth="1" />
      {pipsOn("left")}
      {pipsOn("right")}
      {pipsOn("top")}
    </g>
  );
}

function DiceCluster() {
  return (
    <svg
      className="dice-art"
      viewBox="0 0 720 720"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        {/* Orange die — glossy primary */}
        <linearGradient id="orange-top" x1="0" y1="0" x2="0.55" y2="1">
          <stop offset="0%"  stopColor="#FFB084" />
          <stop offset="55%" stopColor="#FF8A55" />
          <stop offset="100%" stopColor="#F2682E" />
        </linearGradient>
        <linearGradient id="orange-right" x1="0.1" y1="0" x2="0.5" y2="1">
          <stop offset="0%"  stopColor="#E25A24" />
          <stop offset="100%" stopColor="#A33E15" />
        </linearGradient>
        <linearGradient id="orange-left" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%"  stopColor="#7E2C0E" />
          <stop offset="100%" stopColor="#481805" />
        </linearGradient>

        {/* Mint die */}
        <linearGradient id="mint-top" x1="0" y1="0" x2="0.55" y2="1">
          <stop offset="0%"  stopColor="#A8F0E8" />
          <stop offset="55%" stopColor="#6CDDD2" />
          <stop offset="100%" stopColor="#3FB8AE" />
        </linearGradient>
        <linearGradient id="mint-right" x1="0.1" y1="0" x2="0.5" y2="1">
          <stop offset="0%"  stopColor="#34A89F" />
          <stop offset="100%" stopColor="#1F7E76" />
        </linearGradient>
        <linearGradient id="mint-left" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%"  stopColor="#155952" />
          <stop offset="100%" stopColor="#0A3531" />
        </linearGradient>

        {/* Gloss highlights for top faces */}
        <linearGradient id="orange2-top" x1="0" y1="0" x2="0.55" y2="1">
          <stop offset="0%"  stopColor="#FFA070" />
          <stop offset="55%" stopColor="#FF7740" />
          <stop offset="100%" stopColor="#E15A20" />
        </linearGradient>
        <linearGradient id="orange2-right" x1="0.1" y1="0" x2="0.5" y2="1">
          <stop offset="0%"  stopColor="#CC4D1E" />
          <stop offset="100%" stopColor="#8E3210" />
        </linearGradient>
        <linearGradient id="orange2-left" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%"  stopColor="#6E2509" />
          <stop offset="100%" stopColor="#3F1304" />
        </linearGradient>
      </defs>

      {/* Soft floor shadow under cluster */}
      <ellipse cx="360" cy="650" rx="240" ry="22" fill="rgba(0,0,0,0.45)" />

      {/* Mint die — back-left, mid */}
      <IsoDie
        cx={170}
        cy={360}
        size={140}
        faces={{ top: 4, right: 6, left: 2 }}
        idPrefix="mint"
        pipColor="#FF6B35"
        animClass="die-b"
      />

      {/* Smaller orange die — back-right */}
      <IsoDie
        cx={555}
        cy={355}
        size={120}
        faces={{ top: 2, right: 3, left: 1 }}
        idPrefix="orange2"
        pipColor="#4ECDC4"
        animClass="die-c"
      />

      {/* Big orange die — foreground */}
      <IsoDie
        cx={360}
        cy={580}
        size={200}
        faces={{ top: 5, right: 3, left: 2 }}
        idPrefix="orange"
        pipColor="#4ECDC4"
        animClass="die-a"
      />
    </svg>
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

function PhoneShot() {
  return (
    <div className="phone-shot-stack">
      <div className="phone-shot phone-shot--back">
        <img
          src="/app-gameplay.png"
          alt="Rolligan gameplay — the pot building as players roll"
          width="320"
          height="695"
          loading="lazy"
        />
      </div>
      <div className="phone-shot phone-shot--front">
        <img
          src="/app-home.png"
          alt="Rolligan home screen on iPhone"
          width="320"
          height="695"
          loading="lazy"
        />
      </div>
    </div>
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
          <a href="#how">How it works</a>
          <a href="#about">About</a>
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
          <p className="hook">The dice game where we can hangout, laugh, and not have to strategize while playing.</p>
          <p className="hero-sub">For 2+ players. Free on the App Store.</p>
          <div className="cta-row">
            <AppStoreBadge />
            <a href="#how" className="pill-cta pill-outline">How it works ↓</a>
          </div>
        </div>
        <div className="hero-visual">
          <DiceCluster />
        </div>
      </div>
    </section>
  );
}

function WhyPlay() {
  return (
    <section className="section" aria-labelledby="why-h">
      <div className="page">
        <p className="tracker">01 — Why play</p>
        <h2 id="why-h">A game for the table, not the spreadsheet.</h2>
        <p>
          Rolligan is the game we play when no one's paying attention. We bring it out when friends
          are drinking, the conversation's loose, and nobody wants to think about strategy. Roll the
          dice, build the pot, bank your points before someone rolls a 7. That's it.
        </p>
        <p>
          It doesn't punish you for being half-checked-out. The tension comes free — every roll,
          you're either pushing your luck or you're not, and either choice will get a reaction at
          the table.
        </p>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", title: "Roll", body: "On your turn, roll two dice as many times as you dare." },
    { n: "02", title: "Build the pot", body: "Every roll that isn't a 7 adds points to the pot in front of you." },
    { n: "03", title: "Bank or bust", body: "Bank to keep what you've got. Roll a 7 and you lose it all." },
  ];
  return (
    <section className="section section--alt" id="how" aria-labelledby="how-h">
      <div className="page">
        <p className="tracker">02 — How it works</p>
        <h2 id="how-h">Three moves. That's the whole game.</h2>
        <ol className="steps-grid">
          {steps.map((s) => (
            <li key={s.n} className="step-card">
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
        <p className="tracker">03 — Get the app</p>
        <div className="ios-grid">
          <div className="ios-card">
            <span className="ios-pill">
              <span className="ios-pill-dot" aria-hidden="true" />
              Now on iOS
            </span>
            <h2 id="ios-h">Free on the App Store.</h2>
            <p className="ios-lede">
              Download Rolligan, gather two or more friends, and you're playing in under a
              minute. Everyone joins from their own phone — no account needed.
            </p>
            <AppStoreBadge />
          </div>
          <div className="ios-visual">
            <PhoneShot />
          </div>
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section className="section section--alt" id="about" aria-labelledby="about-h">
      <div className="page">
        <p className="tracker">04 — Who builds it</p>
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
        <span>rolligan.com</span>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <>
      <Nav />
      <Hero />
      <WhyPlay />
      <HowItWorks />
      <GetTheApp />
      <About />
      <Footer />
    </>
  );
}
