import { Link } from "react-router-dom";
import {
  BadgeCheck,
  Clock,
  ShieldCheck,
  Sparkles,
  Ticket,
  TrainFront,
} from "lucide-react";

/**
 * HeroSection — the landing hero.
 *
 * The booking search form is passed in as a child so the hero stays a pure
 * presentational component.
 */

const TRUST = [
  { icon: ShieldCheck, label: "Secure booking" },
  { icon: BadgeCheck, label: "Real seat availability" },
  { icon: Clock, label: "Instant confirmation" },
];

const HeroSection = ({ children }) => (
  <section className="hero">
    <div className="hero-bg" aria-hidden="true">
      <span className="hero-orb hero-orb-1" />
      <span className="hero-orb hero-orb-2" />
      <span className="hero-grid" />
    </div>

    <div className="container hero-inner">
      <div className="hero-copy">
        <span className="hero-pill">
          <Sparkles size={14} aria-hidden="true" />
          India's railways, beautifully booked
        </span>

        <h1 className="hero-title">
          Your journey begins
          <span className="hero-title-accent"> with the right seat.</span>
        </h1>

        <p className="hero-sub">
          Search trains across India, see the real route, pick your exact berth
          and pay securely — all in one place. No guesswork, no phantom
          availability.
        </p>

        <div className="hero-actions">
          <Link to="/trains" className="btn btn-primary btn-lg">
            <TrainFront size={18} aria-hidden="true" />
            Book a ticket
          </Link>
          <Link to="/routes" className="btn btn-secondary btn-lg">
            <Ticket size={18} aria-hidden="true" />
            Explore routes
          </Link>
        </div>

        <ul className="hero-trust">
          {TRUST.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.label}>
                <Icon size={16} aria-hidden="true" />
                {item.label}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="hero-form-wrap">{children}</div>
    </div>
  </section>
);

export default HeroSection;
