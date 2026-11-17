import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Info, ShieldCheck } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import Button from "../components/common/Button";
import EmptyState from "../components/common/EmptyState";
import BookingSteps from "../components/common/BookingSteps";
import JourneySummaryCard from "../components/booking/JourneySummaryCard";
import FareSummary from "../components/booking/FareSummary";
import { useBooking } from "../context/BookingContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { createBooking } from "../services/bookingService";
import { TRAVEL_CLASSES } from "../utils/constants";

/**
 * BookingSummaryPage.
 *
 * Reviews the journey, passengers and fare, then creates the booking on the
 * server. The booking is created with status PENDING_PAYMENT — it is NOT
 * confirmed here. Confirmation only happens after the payment is verified.
 */

const BookingSummaryPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoggedIn } = useAuth();
  const { draft, setBooking } = useBooking();
  const [submitting, setSubmitting] = useState(false);

  const { train, journeyDate, travelClass, coach } = draft;
  const seats = draft.selectedSeats || [];
  const passengers = draft.passengers || [];

  const farePerPassenger =
    TRAVEL_CLASSES.find((c) => c.code === travelClass)?.fare ?? 0;

  const proceed = async () => {
    if (!isLoggedIn) {
      toast.info("Please sign in to complete your booking.");
      navigate("/login", { state: { from: { pathname: "/booking/summary" } } });
      return;
    }

    setSubmitting(true);
    try {
      const booking = await createBooking(user.id, train.id, {
        journeyDate,
        classType: travelClass,
        totalPassengers: passengers.length,
      });

      setBooking(booking);
      toast.success(`Booking created — PNR ${booking.pnr}`);
      navigate("/booking/payment");
    } catch (err) {
      toast.error(err.message || "Could not create the booking.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!train || seats.length === 0 || passengers.length === 0) {
    return (
      <div className="container">
        <PageHeader
          title="Review booking"
          crumbs={[{ label: "Home", to: "/" }]}
        />
        <EmptyState
          title="Nothing to review"
          message="Your booking details are incomplete. Please start the search again."
          action={
            <Button variant="primary" onClick={() => navigate("/trains")}>
              Search trains
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="container">
      <PageHeader
        title="Review your booking"
        subtitle="Check everything before you pay."
        crumbs={[
          { label: "Home", to: "/" },
          { label: "Search trains", to: "/trains" },
          { label: "Review" },
        ]}
      />

      <BookingSteps current="summary" />

      <div className="booking-grid">
        <div className="booking-main">
          <JourneySummaryCard
            draft={draft}
            travelClass={travelClass}
            coach={coach}
          />

          <section className="card card-pad">
            <h2 className="card-title">Passengers &amp; berths</h2>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Age</th>
                    <th>Gender</th>
                    <th>Coach / Berth</th>
                  </tr>
                </thead>
                <tbody>
                  {passengers.map((p, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{p.name}</td>
                      <td>{p.age}</td>
                      <td>{p.gender}</td>
                      <td className="mono">
                        {coach?.coachNumber || coach?.coachName} /{" "}
                        {seats[index]?.seatNumber}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card card-pad">
            <h2 className="card-title">Booking conditions</h2>
            <ul className="condition-list">
              <li>
                Your booking is created as <strong>payment pending</strong> and
                is only confirmed once the payment is verified by the server.
              </li>
              <li>
                Berths are reserved for your exact journey segment. A seat may
                be free for part of the route and occupied for another.
              </li>
              <li>
                Cancellation is available from My Bookings and is subject to the
                railway's refund rules.
              </li>
            </ul>
          </section>
        </div>

        <aside className="booking-side">
          <section className="card card-pad sticky-side">
            <h2 className="card-title">Fare</h2>
            <FareSummary
              travelClass={travelClass}
              farePerPassenger={farePerPassenger}
              passengerCount={passengers.length}
            />

            <div className="alert alert-info mt-4" role="note">
              <ShieldCheck size={16} aria-hidden="true" />
              <span className="text-xs">
                The final amount is calculated by the server when the booking is
                created.
              </span>
            </div>

            <div className="flex gap-2 mt-4">
              <Button
                variant="ghost"
                icon={ArrowLeft}
                onClick={() => navigate("/booking/passengers")}
              >
                Back
              </Button>
              <Button
                variant="primary"
                iconRight={ArrowRight}
                className="flex-1"
                loading={submitting}
                onClick={proceed}
              >
                Proceed to payment
              </Button>
            </div>

            {!isLoggedIn && (
              <p className="text-xs text-muted mt-3">
                <Info size={12} aria-hidden="true" /> You will be asked to sign
                in before the booking is created.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
};

export default BookingSummaryPage;
