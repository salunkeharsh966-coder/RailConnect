import { Link } from "react-router-dom";
import { ArrowRight, TrainFront } from "lucide-react";

/**
 * PopularRoutes.
 *
 * These are clearly labelled as curated suggestions, not live data — the
 * backend has no "popular routes" endpoint, so nothing here is presented as
 * a real statistic. Each card runs a real search when clicked.
 */

const ROUTES = [
  {
    from: "Mumbai CST",
    to: "Madgaon",
    fromCode: "CSTM",
    toCode: "MAO",
    note: "Konkan coast",
  },
  {
    from: "Mumbai CST",
    to: "Pune Junction",
    fromCode: "CSTM",
    toCode: "PUNE",
    note: "Deccan Queen country",
  },
  {
    from: "Mumbai CST",
    to: "Nagpur",
    fromCode: "CSTM",
    toCode: "NGP",
    note: "Across the state",
  },
  {
    from: "Mumbai CST",
    to: "Kanyakumari",
    fromCode: "CSTM",
    toCode: "CAPE",
    note: "End to end",
  },
];

const PopularRoutes = () => (
  <section className="section">
    <div className="container">
      <div className="section-head">
        <span className="eyebrow">Curated suggestions</span>
        <h2>Popular routes</h2>
        <p>
          Hand-picked corridors to get you started. Tap one to run a live search
          against the real timetable.
        </p>
      </div>

      <div className="grid grid-4 route-grid">
        {ROUTES.map((route) => (
          <Link
            key={`${route.fromCode}-${route.toCode}`}
            to={`/trains?from=${route.fromCode}&to=${route.toCode}`}
            className="card card-hover route-card"
          >
            <span className="route-icon" aria-hidden="true">
              <TrainFront size={18} />
            </span>
            <div className="route-cities">
              <strong>{route.from}</strong>
              <span className="route-arrow" aria-hidden="true">
                <ArrowRight size={14} />
              </span>
              <strong>{route.to}</strong>
            </div>
            <span className="route-note">{route.note}</span>
            <span className="route-codes mono">
              {route.fromCode} → {route.toCode}
            </span>
          </Link>
        ))}
      </div>
    </div>
  </section>
);

export default PopularRoutes;
