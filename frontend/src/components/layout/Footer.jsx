import { Link } from "react-router-dom";
import { Mail, MapPin, Phone, TrainFront } from "lucide-react";
import { APP_NAME } from "../../utils/constants";

/** Footer — site-wide footer with navigation and contact details. */

const Footer = () => (
  <footer className="footer">
    <div className="container">
      <div className="footer-grid">
        <div className="footer-brand">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              <TrainFront size={20} />
            </span>
            <span className="brand-text">
              <strong>{APP_NAME}</strong>
              <small>Railway Reservation</small>
            </span>
          </div>
          <p>
            A modern way to search trains, pick your exact berth and book your
            journey across India — with real availability, not guesses.
          </p>
        </div>

        <div className="footer-col">
          <h4>Book</h4>
          <Link to="/trains">Search trains</Link>
          <Link to="/routes">Train routes</Link>
          <Link to="/my-bookings">My bookings</Link>
        </div>

        <div className="footer-col">
          <h4>Company</h4>
          <Link to="/about">About us</Link>
          <Link to="/services">Services</Link>
          <Link to="/contact">Contact</Link>
        </div>

        <div className="footer-col">
          <h4>Reach us</h4>
          <span className="footer-contact">
            <Phone size={15} aria-hidden="true" /> 139 (Railway Enquiry)
          </span>
          <span className="footer-contact">
            <Mail size={15} aria-hidden="true" /> support@railconnect.in
          </span>
          <span className="footer-contact">
            <MapPin size={15} aria-hidden="true" /> Mumbai, India
          </span>
        </div>
      </div>

      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} {APP_NAME}. A demonstration project.
        </span>
        <span className="text-xs">
          Not affiliated with Indian Railways. Fares and availability come from
          this project's own backend.
        </span>
      </div>
    </div>
  </footer>
);

export default Footer;
