import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CreditCard, Lock, ShieldCheck } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import Button from "../components/common/Button";
import Loader from "../components/common/Loader";
import EmptyState from "../components/common/EmptyState";
import BookingSteps from "../components/common/BookingSteps";
import JourneySummaryCard from "../components/booking/JourneySummaryCard";
import FareSummary from "../components/booking/FareSummary";
import { useBooking } from "../context/BookingContext";
import { useToast } from "../context/ToastContext";
import { createPayment, verifyPayment } from "../services/paymentService";
import { formatINR } from "../utils/currencyUtils";

/**
 * PaymentPage.
 *
 * The real Razorpay flow: the server creates the order, the Razorpay checkout
 * collects the payment, and the server verifies the signature. The client can
 * NEVER mark a booking as paid — only /api/payments/verify can do that.
 *
 * If the server has no Razorpay keys configured, order creation fails and we
 * say so plainly instead of faking a successful payment.
 */

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const PaymentPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { draft, setBooking } = useBooking();

  const booking = draft.booking;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  // Create the Razorpay order as soon as the page opens.
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (!booking?.id) {
        setError("No booking found. Please start the booking again.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const created = await createPayment(booking.id, "RAZORPAY");
        if (!cancelled) setOrder(created);
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message ||
              "The payment gateway could not be initialised. Please try again later."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking?.id]);

  const pay = async () => {
    if (!order) return;

    setPaying(true);
    try {
      const ready = await loadRazorpay();
      if (!ready) {
        toast.error("Could not load the payment gateway. Check your connection.");
        return;
      }

      const options = {
        key: order.keyId || order.key,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "RailConnect",
        description: `Booking ${booking.pnr}`,
        order_id: order.orderId || order.id,
        handler: async (response) => {
          try {
            const verified = await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setBooking({ ...booking, ...(verified?.booking || {}), paid: true });
            toast.success("Payment verified. Your booking is confirmed.");
            navigate("/booking/success");
          } catch (err) {
            toast.error(
              err.message ||
                "Payment verification failed. Please contact support."
            );
            navigate("/booking/failure");
          }
        },
        modal: {
          ondismiss: () => {
            toast.info("Payment cancelled. Your booking is still pending.");
          },
        },
        theme: { color: "#1d4ed8" },
      };

      const checkout = new window.Razorpay(options);
      checkout.on("payment.failed", () => {
        toast.error("The payment failed. No amount has been charged.");
        navigate("/booking/failure");
      });
      checkout.open();
    } finally {
      setPaying(false);
    }
  };

  if (!booking) {
    return (
      <div className="container">
        <PageHeader title="Payment" crumbs={[{ label: "Home", to: "/" }]} />
        <EmptyState
          title="No pending booking"
          message="There is no booking awaiting payment."
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
        title="Payment"
        subtitle={`Booking ${booking.pnr}`}
        crumbs={[
          { label: "Home", to: "/" },
          { label: "Search trains", to: "/trains" },
          { label: "Payment" },
        ]}
      />

      <BookingSteps current="payment" />

      <div className="booking-grid">
        <div className="booking-main">
          <JourneySummaryCard
            draft={draft}
            travelClass={draft.travelClass}
            coach={draft.coach}
          />

          <section className="card card-pad">
            <h2 className="card-title">
              <CreditCard size={18} aria-hidden="true" /> Pay securely
            </h2>

            {loading && <Loader message="Preparing the payment gateway…" />}

            {!loading && error && (
              <div className="alert alert-error" role="alert">
                <AlertTriangle size={17} aria-hidden="true" />
                <div>
                  <strong>Payment is unavailable right now.</strong>
                  <p>{error}</p>
                  <p className="text-xs">
                    Your booking is saved as payment pending. You can retry from
                    My Bookings once the gateway is available.
                  </p>
                </div>
              </div>
            )}

            {!loading && !error && order && (
              <>
                <p className="text-sm text-muted">
                  You will be redirected to the Razorpay checkout to complete
                  the payment of <strong>{formatINR(booking.totalAmount)}</strong>
                  .
                </p>

                <Button
                  variant="primary"
                  size="lg"
                  block
                  icon={Lock}
                  className="mt-4"
                  loading={paying}
                  onClick={pay}
                >
                  Pay {formatINR(booking.totalAmount)}
                </Button>

                <p className="text-xs text-muted mt-3">
                  <ShieldCheck size={12} aria-hidden="true" /> Your booking is
                  confirmed only after the server verifies the payment.
                </p>
              </>
            )}
          </section>
        </div>

        <aside className="booking-side">
          <section className="card card-pad sticky-side">
            <h2 className="card-title">Order summary</h2>
            <FareSummary
              travelClass={booking.classType || draft.travelClass}
              farePerPassenger={
                booking.totalAmount && booking.totalPassengers
                  ? booking.totalAmount / booking.totalPassengers
                  : 0
              }
              passengerCount={
                booking.totalPassengers || draft.passengers.length
              }
              totalAmount={booking.totalAmount}
            />
            <div className="fare-row mt-3">
              <span>PNR</span>
              <strong className="mono">{booking.pnr}</strong>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default PaymentPage;
