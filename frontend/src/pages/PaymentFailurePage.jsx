import { Link, useNavigate } from "react-router-dom";
import { RefreshCw, XCircle } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import Button from "../components/common/Button";
import { useBooking } from "../context/BookingContext";

/** PaymentFailurePage — shown when a payment did not go through. */

const PaymentFailurePage = () => {
  const navigate = useNavigate();
  const { draft } = useBooking();
  const booking = draft.booking;

  return (
    <div className="container">
      <PageHeader
        title="Payment failed"
        crumbs={[{ label: "Home", to: "/" }]}
      />

      <div className="state-block state-block-lg">
        <span className="state-icon is-error" aria-hidden="true">
          <XCircle size={34} />
        </span>
        <h1>Your payment did not go through</h1>
        <p>
          No amount has been charged. Your booking is still saved as payment
          pending, so you can try again.
        </p>

        {booking?.pnr && (
          <p className="mono text-sm">
            Booking reference: <strong>{booking.pnr}</strong>
          </p>
        )}

        <div className="flex gap-3 wrap center mt-4">
          <Button
            variant="primary"
            icon={RefreshCw}
            onClick={() => navigate("/booking/payment")}
          >
            Try payment again
          </Button>
          <Link to="/my-bookings" className="btn btn-secondary">
            Go to my bookings
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailurePage;
