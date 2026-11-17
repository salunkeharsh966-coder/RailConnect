import { Armchair, Clock, Route, ShieldCheck } from "lucide-react";

/** WhyRailConnect — the value proposition section. */

const REASONS = [
  {
    icon: Armchair,
    title: "Pick your exact berth",
    text: "See the real coach layout — lower, middle, upper, side berths — and choose the seat you actually want.",
  },
  {
    icon: Route,
    title: "Journey-wise availability",
    text: "A seat free from Mumbai to Panvel may be taken from Panvel onward. We check availability for your exact segment.",
  },
  {
    icon: Clock,
    title: "Real stop timings",
    text: "Departure and arrival come from your boarding and destination stops — never the train's global timetable.",
  },
  {
    icon: ShieldCheck,
    title: "Verified payments",
    text: "A booking is only confirmed after the payment is verified on the server. No optimistic confirmations.",
  },
];

const WhyRailConnect = () => (
  <section className="section why-section">
    <div className="container">
      <div className="section-head">
        <span className="eyebrow">Why RailConnect</span>
        <h2>Built around how trains actually work</h2>
        <p>
          Most booking sites show you a seat count. We show you the seat, the
          route and the segment — because that is what decides whether you can
          actually travel.
        </p>
      </div>

      <div className="grid grid-4">
        {REASONS.map((reason) => {
          const Icon = reason.icon;
          return (
            <article key={reason.title} className="card card-pad why-card">
              <span className="why-icon" aria-hidden="true">
                <Icon size={22} />
              </span>
              <h3>{reason.title}</h3>
              <p>{reason.text}</p>
            </article>
          );
        })}
      </div>
    </div>
  </section>
);

export default WhyRailConnect;
