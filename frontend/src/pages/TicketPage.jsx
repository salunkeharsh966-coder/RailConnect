import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Printer, TrainFront } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import Button from "../components/common/Button";
import Loader from "../components/common/Loader";
import ErrorState from "../components/common/ErrorState";
import StatusBadge from "../components/common/StatusBadge";
import { getBookingById } from "../services/bookingService";
import { getPassengersByBooking } from "../services/passengerService";
import { getReservationsByBooking } from "../services/journeySeatService";
import { formatINR } from "../utils/currencyUtils";
import { formatDateLong } from "../utils/dateUtils";

/**
 * TicketPage — the printable e-ticket.
 *
 * Everything shown here comes from the backend: the booking, its passengers
 * and the actual seat reservations. Nothing is invented client-side.
 */

const TicketPage = () => {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [passengers, setPassengers] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [bookingData, passengerData, reservationData] = await Promise.all([
        getBookingById(bookingId),
        getPassengersByBooking(bookingId),
        getReservationsByBooking(bookingId),
      ]);
      setBooking(bookingData);
      setPassengers(passengerData);
      setReservations(reservationData);
    } catch (err) {
      setError(err.message || "Unable to load this ticket");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  if (loading) {
    return (
      <div className="container">
        <Loader message="Loading your ticket…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <ErrorState message={error} onRetry={load} />
      </div>
    );
  }

  if (!booking) return null;

  const seatFor = (index) => {
    const reservation = reservations[index];
    if (!reservation) return "—";
    return `${reservation.coachNumber || ""} / ${reservation.seatNumber || ""}`;
  };

  return (
    <div className="container">
      <PageHeader
        title="E-ticket"
        subtitle={`PNR ${booking.pnr}`}
        crumbs={[
          { label: "Home", to: "/" },
          { label: "My bookings", to: "/my-bookings" },
          { label: "Ticket" },
        ]}
        actions={
          <Button
            variant="secondary"
            icon={Printer}
            onClick={() => window.print()}
          >
            Print / Save PDF
          </Button>
        }
      />

      <div className="ticket" id="ticket">
        <div className="ticket-head">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              <TrainFront size={20} />
            </span>
            <span className="brand-text">
              <strong>RailConnect</strong>
              <small>Electronic Reservation Slip</small>
            </span>
          </div>
          <StatusBadge status={booking.status} />
        </div>

        <div className="ticket-pnr">
          <span>PNR</span>
          <strong className="mono">{booking.pnr}</strong>
        </div>

        <div className="ticket-grid">
          <div>
            <span className="ticket-label">Train</span>
            <strong>
              {booking.train?.trainName || "—"}
              {booking.train?.trainNumber
                ? ` (#${booking.train.trainNumber})`
                : ""}
            </strong>
          </div>
          <div>
            <span className="ticket-label">Journey date</span>
            <strong>{formatDateLong(booking.journeyDate)}</strong>
          </div>
          <div>
            <span className="ticket-label">Class</span>
            <strong>{booking.classType || "—"}</strong>
          </div>
          <div>
            <span className="ticket-label">Total fare</span>
            <strong>{formatINR(booking.totalAmount)}</strong>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Passenger</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Coach / Berth</th>
              </tr>
            </thead>
            <tbody>
              {passengers.map((p, index) => (
                <tr key={p.id ?? index}>
                  <td>{index + 1}</td>
                  <td>{p.name}</td>
                  <td>{p.age}</td>
                  <td>{p.gender}</td>
                  <td className="mono">{seatFor(index)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="ticket-note">
          This is a computer-generated reservation slip. Please carry a valid
          photo ID during the journey. RailConnect is a demonstration project
          and is not affiliated with Indian Railways.
        </p>
      </div>

      <div className="mt-6 no-print">
        <Link to="/my-bookings" className="btn btn-ghost">
          <ArrowLeft size={16} aria-hidden="true" /> Back to my bookings
        </Link>
      </div>
    </div>
  );
};

export default TicketPage;
