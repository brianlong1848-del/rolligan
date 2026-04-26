function Hero() {
  return (
    <header className="hero">
      <h1 className="wordmark">Rolligan</h1>
      <p className="tagline">Push your luck</p>
      <p className="subhead">A push-your-luck dice party game for groups of 2–10.</p>
    </header>
  );
}

function WhyPlay() {
  return (
    <section aria-labelledby="why">
      <div className="page">
        <h2 id="why">Why play</h2>
        <p>
          Rolligan is the game we play when no one's paying attention. We bring it out when friends are
          drinking, the conversation's loose, and nobody wants to think about strategy. Roll the dice,
          build the pot, bank your points before someone rolls a 7. That's it.
        </p>
        <p>
          It doesn't punish you for being half-checked-out. The tension comes free — every roll, you're
          either pushing your luck or you're not, and either choice will get a reaction at the table.
        </p>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section aria-labelledby="how">
      <div className="page">
        <h2 id="how">How it works</h2>
        <ol className="steps">
          <li className="step">
            <span className="step-num">1</span>
            <div className="step-body">
              <strong>Roll</strong>
              <span>On your turn, roll two dice as many times as you dare.</span>
            </div>
          </li>
          <li className="step">
            <span className="step-num">2</span>
            <div className="step-body">
              <strong>Build the pot</strong>
              <span>Every roll that isn't a 7 adds to the pot in front of you.</span>
            </div>
          </li>
          <li className="step">
            <span className="step-num">3</span>
            <div className="step-body">
              <strong>Bank or bust</strong>
              <span>Bank to keep what you've got — or roll a 7 and lose it all.</span>
            </div>
          </li>
        </ol>
      </div>
    </section>
  );
}

function Capture() {
  const subject = encodeURIComponent("Notify me when Rolligan launches");
  return (
    <section aria-labelledby="ios" className="capture">
      <div className="page">
        <span className="pill">Coming to iOS</span>
        <h2 id="ios">Get notified at launch</h2>
        <form
          action={`mailto:hello@rolligan.com?subject=${subject}`}
          method="post"
          encType="text/plain"
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
          <button type="submit">Notify me</button>
        </form>
        <p className="micro">We'll email you once. No newsletter, no spam.</p>
      </div>
    </section>
  );
}

function About() {
  return (
    <section aria-labelledby="about">
      <div className="page">
        <h2 id="about">About</h2>
        <p>
          Rolligan is made by{" "}
          <a href="https://clarendon.dev" target="_blank" rel="noreferrer">
            Clarendon Labs
          </a>{" "}
          — an independent app studio in Chicago building games, home tools, and everyday utilities.
          One well-made app at a time.
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer>
      <div className="page">© 2026 Clarendon Labs LLC · rolligan.com</div>
    </footer>
  );
}

export default function App() {
  return (
    <main>
      <Hero />
      <WhyPlay />
      <HowItWorks />
      <Capture />
      <About />
      <Footer />
    </main>
  );
}
