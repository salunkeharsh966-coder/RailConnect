import { Link } from "react-router-dom";
import { ArrowRight, Code2, Database, Layers, ShieldCheck } from "lucide-react";
import PageHeader from "../components/common/PageHeader";

/** AboutPage — what the project is and how it is built. */

const STACK = [
  {
    icon: Layers,
    title: "React + Vite frontend",
    text: "A single-page app with React Router, context-based state and a hand-built design system — no UI framework.",
  },
  {
    icon: Code2,
    title: "Spring Boot backend",
    text: "A REST API built with Spring Boot and Spring Data JPA, exposing the endpoints this app consumes.",
  },
  {
    icon: Database,
    title: "Relational database",
    text: "Stations, trains, routes, coaches, seats, bookings, passengers and payments in a normalised schema.",
  },
  {
    icon: ShieldCheck,
    title: "Server-verified payments",
    text: "Razorpay orders are created and verified on the server. The client can never mark a booking as paid.",
  },
];

const AboutPage = () => (
  <div className="container">
    <PageHeader
      title="About RailConnect"
      subtitle="A full-stack railway reservation system built end to end."
      crumbs={[{ label: "Home", to: "/" }, { label: "About" }]}
    />

    <section className="prose-block">
      <p>
        RailConnect is a complete railway reservation system: a React frontend
        talking to a Spring Boot REST API over a relational database. It covers
        the whole journey — searching trains on real routes, choosing a class
        and an exact berth, adding passengers, paying, and managing the booking
        afterwards.
      </p>
      <p>
        The design goal was honesty. Where a typical demo fakes availability
        with a random number, this app models the thing that actually decides
        whether you can travel: a seat is only free for <em>your</em> segment of
        the route. A berth occupied from Panvel to Ratnagiri is still bookable
        from Mumbai to Panvel — and the app knows the difference.
      </p>
    </section>

    <section className="section">
      <div className="section-head">
        <span className="eyebrow">Under the hood</span>
        <h2>How it is built</h2>
      </div>

      <div className="grid grid-2">
        {STACK.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="card card-pad">
              <span className="why-icon" aria-hidden="true">
                <Icon size={22} />
              </span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          );
        })}
      </div>
    </section>

    <section className="section">
      <div className="cta-band">
        <div>
          <h2>Ready to book?</h2>
          <p>Search a route and see the real timetable for yourself.</p>
        </div>
        <Link to="/trains" className="btn btn-primary btn-lg">
          Search trains <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </div>
    </section>
  </div>
);

export default AboutPage;
