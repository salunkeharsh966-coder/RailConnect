import {
  BellRing,
  CreditCard,
  FileText,
  Headphones,
  RefreshCcw,
  Users,
} from "lucide-react";

/** ServicesSection — the services grid. */

const SERVICES = [
  {
    icon: CreditCard,
    title: "Secure payments",
    text: "Pay through Razorpay with server-side verification before your booking is confirmed.",
  },
  {
    icon: FileText,
    title: "Digital e-tickets",
    text: "Every confirmed booking gets a printable ticket with PNR, coach and berth details.",
  },
  {
    icon: RefreshCcw,
    title: "Easy cancellation",
    text: "Cancel an eligible booking in a couple of taps and see the updated status immediately.",
  },
  {
    icon: Users,
    title: "Group bookings",
    text: "Book up to six passengers on a single PNR and assign each one their own berth.",
  },
  {
    icon: BellRing,
    title: "Booking updates",
    text: "Track every booking from your account — upcoming, completed and cancelled.",
  },
  {
    icon: Headphones,
    title: "Support",
    text: "Railway enquiry on 139, or reach our team at support@railconnect.in.",
  },
];

const ServicesSection = () => (
  <section className="section">
    <div className="container">
      <div className="section-head">
        <span className="eyebrow">Services</span>
        <h2>Everything around the journey</h2>
        <p>
          From choosing a berth to cancelling a plan — the whole trip is handled
          in one place.
        </p>
      </div>

      <div className="grid grid-3">
        {SERVICES.map((service) => {
          const Icon = service.icon;
          return (
            <article key={service.title} className="card card-pad service-card">
              <span className="service-icon" aria-hidden="true">
                <Icon size={20} />
              </span>
              <h3>{service.title}</h3>
              <p>{service.text}</p>
            </article>
          );
        })}
      </div>
    </div>
  </section>
);

export default ServicesSection;
