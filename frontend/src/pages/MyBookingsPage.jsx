import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Ticket,
  TrainFront,
  XCircle,
} from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import Button from "../components/common/Button";
import Loader from "../components/common/Loader";
import ErrorState from "../components/common/ErrorState";
import EmptyState from "../components/common/EmptyState";
import StatusBadge from "../components/common/StatusBadge";
import Modal from "../components/common/Modal";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { cancelBooking, getMyBookings } from "../services/bookingService";
import { formatINR } from "../utils/currencyUtils";
import { formatDateLong, formatDateTime, todayISO } from "../utils/dateUtils";
import { BOOKING_STATUS } from "../utils/constants";

/**
 * MyBookingsPage.
 *
 * Lists the signed-in user's real bookings from GET /api/bookings/my and lets
 * them cancel an eligible one. Cancellation goes through the backend, which
 * also handles the refund safety checks.
 */

const FILTERS = [
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const MyBookingsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError("");
    try {
      const data = await getMyBookings(user.id);
      setBookings(data);
    } catch (err) {
      setError(err.message || "Unable to load your bookings");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const today = todayISO();
    return bookings.filter((b) => {
      const status = String(b.bookingStatus || "").toUpperCase();
      if (filter === "cancelled") return status === BOOKING_STATUS.CANCELLED;
      if (filter === "upcoming") {
        return (
          status !== BOOKING_STATUS.CANCELLED &&
          String(b.journeyDate) >= today
        );
      }
      if (filter === "completed") {
        return (
          status !== BOOKING_STATUS.CANCELLED &&
          String(b.journeyDate) < today
        );
      }
      return true;
    });
  }, [bookings, filter]);

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await cancelBooking(cancelTarget.id);
      toast.success(`Booking ${cancelTarget.pnr} cancelled.`);
      setCancelTarget(null);
      await load();
    } catch (err) {
      toast.error(err.message || "Could not cancel this booking.");
    } finally {
      setCancelling(false);
    }
  };

  const canCancel = (booking) =>
    String(booking.bookingStatus || "").toUpperCase() !==
    BOOKING_STATUS.CANCELLED;

  return (
    <div>
      <PageHeader
        title="My bookings"
        subtitle="Every journey you have booked, with its live status."
        crumbs={[{ label: "Home", to: "/" }, { label: "My bookings" }]}
      />

      <div className="chip-row mb-6">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`chip ${filter === f.key ? "is-active" : ""}`}
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && <Loader message="Loading your bookings…" />}

      {!loading && error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          icon={Ticket}
          title={
            bookings.length === 0
              ? "No bookings yet"
              : "Nothing in this filter"
          }
          message={
            bookings.length === 0
              ? "Search a route and book your first journey."
              : "Try a different filter to see your other bookings."
          }
          action={
            <Button variant="primary" onClick={() => navigate("/trains")}>
              Search trains
            </Button>
          }
        />
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid">
          {filtered.map((booking) => (
            <article key={booking.id} className="card booking-row">
              <div className="booking-row-main">
                <div className="booking-row-head">
                  <span className="train-icon" aria-hidden="true">
                    <TrainFront size={17} />
                  </span>
                  <div>
                    <strong>
                      {booking.train?.trainName || "Train"}
                      {booking.train?.trainNumber
                        ? ` (#${booking.train.trainNumber})`
                        : ""}
                    </strong>
                    <span className="mono text-xs text-muted">
                      PNR {booking.pnr}
                    </span>
                  </div>
                  <StatusBadge status={booking.bookingStatus} />
                </div>

                <div className="booking-row-meta">
                  <span>
                    <CalendarDays size={14} aria-hidden="true" />
                    {formatDateLong(booking.journeyDate)}
                  </span>
                  <span>Class {booking.classType}</span>
                  <span>
                    {booking.totalPassengers} passenger
                    {booking.totalPassengers === 1 ? "" : "s"}
                  </span>
                  <span className="fw-700">
                    {formatINR(booking.totalAmount)}
                  </span>
                </div>

                <span className="text-xs text-muted">
                  Booked {formatDateTime(booking.bookingDate)}
                </span>
              </div>

              <div className="booking-row-actions">
                <Link
                  to={`/ticket/${booking.id}`}
                  className="btn btn-secondary btn-sm"
                >
                  View ticket <ArrowRight size={14} aria-hidden="true" />
                </Link>
                {canCancel(booking) && (
                  <Button
                    variant="outline-danger"
                    size="sm"
                    icon={XCircle}
                    onClick={() => setCancelTarget(booking)}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        title="Cancel this booking?"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setCancelTarget(null)}
              disabled={cancelling}
            >
              Keep booking
            </Button>
            <Button
              variant="danger"
              loading={cancelling}
              onClick={confirmCancel}
            >
              Yes, cancel it
            </Button>
          </>
        }
      >
        {cancelTarget && (
          <>
            <p>
              You are about to cancel booking{" "}
              <strong className="mono">{cancelTarget.pnr}</strong> for{" "}
              <strong>{cancelTarget.train?.trainName}</strong> on{" "}
              {formatDateLong(cancelTarget.journeyDate)}.
            </p>
            <div className="alert alert-warning mt-4" role="note">
              <span className="text-sm">
                If the booking was paid, a refund is initiated on the server
                before the seats are released. Refund timelines depend on your
                bank.
              </span>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default MyBookingsPage;
