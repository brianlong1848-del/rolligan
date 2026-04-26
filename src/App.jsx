const SQRT3_2 = 0.8660254;

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

function PhoneFrame() {
  return (
    <svg
      className="phone-frame"
      viewBox="0 0 280 580"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="phone-screen" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%"  stopColor="#1A1A20" />
          <stop offset="60%" stopColor="#16161B" />
          <stop offset="100%" stopColor="#0F0F13" />
        </linearGradient>
        <radialGradient id="phone-glow" cx="50%" cy="35%" r="60%">
          <stop offset="0%"  stopColor="rgba(255,107,53,0.18)" />
          <stop offset="60%" stopColor="rgba(255,107,53,0.04)" />
          <stop offset="100%" stopColor="rgba(255,107,53,0)" />
        </radialGradient>
      </defs>

      {/* Outer frame */}
      <rect x="6" y="6" width="268" height="568" rx="42" ry="42"
        fill="#1A1A20"
        stroke="rgba(78, 205, 196, 0.55)"
        strokeWidth="2" />

      {/* Inner screen */}
      <rect x="14" y="14" width="252" height="552" rx="34" ry="34" fill="url(#phone-screen)" />
      <rect x="14" y="14" width="252" height="552" rx="34" ry="34" fill="url(#phone-glow)" />

      {/* Notch */}
      <rect x="105" y="22" width="70" height="22" rx="11" fill="#0A0A0E" />

      {/* Wordmark inside */}
      <text x="140" y="290"
        textAnchor="middle"
        fill="#FF6B35"
        fontFamily="Impact, 'Arial Black', sans-serif"
        fontWeight="900"
        fontSize="46"
        letterSpacing="-1">Rolligan</text>
      <text x="140" y="320"
        textAnchor="middle"
        fill="#4ECDC4"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="600"
        fontSize="9"
        letterSpacing="2.2">PUSH YOUR LUCK</text>

      {/* Mock pip cluster */}
      <g transform="translate(140, 360)">
        <circle cx="-22" cy="0" r="5" fill="#FF6B35" opacity="0.9" />
        <circle cx="0"   cy="0" r="5" fill="#4ECDC4" opacity="0.9" />
        <circle cx="22"  cy="0" r="5" fill="#FF6B35" opacity="0.9" />
      </g>

      {/* Mock CTA */}
      <rect x="60" y="430" width="160" height="44" rx="22" fill="#FF6B35" />
      <text x="140" y="458"
        textAnchor="middle"
        fill="#1A1A20"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="800"
        fontSize="13"
        letterSpacing="1">ROLL</text>

      {/* Bottom bar */}
      <rect x="100" y="540" width="80" height="4" rx="2" fill="rgba(248, 247, 244, 0.35)" />
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
          <a href="#how">How it works</a>
          <a href="#about">About</a>
          <a href="#ios" className="pill-cta pill-cta-sm">Notify me</a>
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
          <p className="tracker">Push your luck · A dice party game</p>
          <h1 id="hero-h" className="wordmark">Rolligan</h1>
          <p className="hook">The dice game we play when no one's paying attention.</p>
          <p className="hero-sub">For 2–10 people. iOS coming soon.</p>
          <div className="cta-row">
            <a href="#ios" className="pill-cta">Notify me ↓</a>
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

function ComingToIOS() {
  const subject = encodeURIComponent("Notify me when Rolligan launches");
  return (
    <section className="section" id="ios" aria-labelledby="ios-h">
      <div className="page">
        <p className="tracker">03 — Coming soon</p>
        <div className="ios-grid">
          <div className="ios-card">
            <span className="ios-pill">
              <span className="ios-pill-dot" aria-hidden="true" />
              Coming to iOS
            </span>
            <h2 id="ios-h">Get notified when we launch.</h2>
            <p className="ios-lede">
              One email when the iOS app is ready. No newsletter, no spam.
            </p>
            <form
              action={`mailto:hello@rolligan.com?subject=${subject}`}
              method="post"
              encType="text/plain"
              className="capture-form"
            >
              <label htmlFor="email">Your email</label>
              <input
                id="email"
                type="email"
                name="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
              <button type="submit" className="pill-cta">Notify me</button>
            </form>
            <p className="micro">We'll email you once. No newsletter, no spam.</p>
          </div>
          <div className="ios-visual">
            <PhoneFrame />
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
      <ComingToIOS />
      <About />
      <Footer />
    </>
  );
}
