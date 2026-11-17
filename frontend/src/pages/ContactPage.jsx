import { Clock, Mail, MapPin, Phone } from "lucide-react";
import PageHeader from "../components/common/PageHeader";

/** ContactPage — contact details and support hours. */

const CHANNELS = [
  {
    icon: Phone,
    title: "Railway enquiry",
    lines: ["139 (toll-free)", "Available 24×7"],
  },
  {
    icon: Mail,
    title: "Email support",
    lines: ["support@railconnect.in", "Replies within one working day"],
  },
  {
    icon: MapPin,
    title: "Registered office",
    lines: ["RailConnect Technologies", "Mumbai, Maharashtra, India"],
  },
  {
    icon: Clock,
    title: "Support hours",
    lines: ["Mon–Sat, 9:00 AM – 7:00 PM IST", "Emergency helpline always open"],
  },
];

const ContactPage = () => (
  <div className="container">
    <PageHeader
      title="Contact us"
      subtitle="We are here to help with your booking."
      crumbs={[{ label: "Home", to: "/" }, { label: "Contact" }]}
    />

    <div className="grid grid-2">
      {CHANNELS.map((channel) => {
        const Icon = channel.icon;
        return (
          <article key={channel.title} className="card card-pad contact-card">
            <span className="why-icon" aria-hidden="true">
              <Icon size={22} />
            </span>
            <h3>{channel.title}</h3>
            {channel.lines.map((line) => (
              <p key={line} className="contact-line">
                {line}
              </p>
            ))}
          </article>
        );
      })}
    </div>

    <p className="text-sm text-muted mt-6">
      RailConnect is a demonstration project and is not affiliated with Indian
      Railways. For official bookings, please use the IRCTC website or app.
    </p>
  </div>
);

export default ContactPage;
