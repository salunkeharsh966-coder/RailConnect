import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Download, Ticket } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import Button from "../components/common/Button";
import EmptyState from "../components/common/EmptyState";
import { useBooking } from "../context/BookingContext";
import { formatINR } from "../utils/currencyUtils";
import { formatDateLong } from "../utils/dateUtils";

/**
 * BookingSuccessPage — the confirmation screen.
 *
 * It only ever shows a confirmed booking. If the booking is not confirmed, the
 * user is sent to the ticket page which reflects the real status.
 */

const BookingSuccessPage = () => {
  const navigate = useNavigate();
  const { draft } = useBooking();
  const booking = draft.booking;

  if (!booking) {
    return (
      <div className="container">
        <PageHeader
          title="Booking confirmed"
          crumbs={[{ label: "Home", to: "/" }]}
        />
        <EmptyState
          title="No booking to show"
          message="We could not find a recent booking in this session."
          action={
            <Button variant="primary" onClick={() => navigate("/my-bookings")}>
              My bookings
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="container">
      <PageHeader
        title="Booking confirmed"
        crumbs={[{ label: "Home", to: "/" }, { label: "Confirmed" }]}
      />

      <div className="success-card">
        <span className="success-icon" aria-hidden="true">
          <CheckCircle2 size={40} />
        </span>
        <h1>Your journey is booked</h1>
        <p>
          A confirmation has been recorded against your account. Keep your PNR
          handy for the journey.
        </p>

        <div className="pnr-block">
          <span className="pnr-label">PNR</span>
          <span className="pnr-value mono">{booking.pnr}</span>
        </div>

        <dl className="success-meta">
          <div>
            <dt>Train</dt>
            <dd>
              {draft.train?.trainName} (#{draft.train?.trainNumber})
            </dd>
          </div>
          <div>
            <dt>Journey date</dt>
            <dd>{formatDateLong(draft.journeyDate)}</dd>
          </div>
          <div>
            <dt>Class</dt>
            <dd>{booking.classType || draft.travelClass}</dd>
          </div>
          <div>
            <dt>Passengers</dt>
            <dd>{booking.totalPassengers || draft.passengers.length}</dd>
          </div>
          <div>
            <dt>Amount paid</dt>
            <dd>{formatINR(booking.totalAmount)}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{booking.status}</dd>
          </div>
        </dl>

        <div className="flex gap-3 wrap center mt-6">
          <Link to={`/ticket/${booking.id}`} className="btn btn-primary">
            <Ticket size={17} aria-hidden="true" /> View e-ticket
          </Link>
          <Link to="/my-bookings" className="btn btn-secondary">
            <Download size={17} aria-hidden="true" /> My bookings
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BookingSuccessPage;
