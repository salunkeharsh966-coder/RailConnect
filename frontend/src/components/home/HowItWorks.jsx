/** HowItWorks — the four-step booking explanation. */

const STEPS = [
  {
    n: "01",
    title: "Search your route",
    text: "Choose your boarding and destination stations from the real station list and pick a journey date.",
  },
  {
    n: "02",
    title: "Compare trains",
    text: "See every train whose route genuinely covers your journey, with the correct stop timings and duration.",
  },
  {
    n: "03",
    title: "Choose class and berth",
    text: "Pick a class that exists on that train, then select your exact seat from the live coach layout.",
  },
  {
    n: "04",
    title: "Pay and travel",
    text: "Add passengers, review the fare, pay securely and get your e-ticket with a real PNR.",
  },
];

const HowItWorks = () => (
  <section className="section how-section">
    <div className="container">
      <div className="section-head">
        <span className="eyebrow">How it works</span>
        <h2>Four steps to your seat</h2>
      </div>

      <ol className="how-grid">
        {STEPS.map((step) => (
          <li key={step.n} className="how-step">
            <span className="how-num" aria-hidden="true">
              {step.n}
            </span>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </li>
        ))}
      </ol>
    </div>
  </section>
);

export default HowItWorks;
