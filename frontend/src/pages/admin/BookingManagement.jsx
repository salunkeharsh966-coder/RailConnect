import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Ticket, XCircle } from "lucide-react";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import Loader from "../../components/common/Loader";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import StatusBadge from "../../components/common/StatusBadge";
import { useToast } from "../../context/ToastContext";
import {
  adminCancelBooking,
  getAllBookings,
} from "../../services/bookingService";
import { formatINR } from "../../utils/currencyUtils";
import { formatDateLong, formatDateTime } from "../../utils/dateUtils";
import { BOOKING_STATUS } from "../../utils/constants";

/** BookingManagement — view and cancel any booking. */

const BookingManagement = () => {
  const { toast } = useToast();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setBookings(await getAllBookings());
    } catch (err) {
      setError(err.message || "Unable to load bookings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bookings.filter((b) => {
      const status = String(b.bookingStatus || "").toUpperCase();
      if (statusFilter !== "ALL" && status !== statusFilter) return false;
      if (!q) return true;
      return (
        String(b.pnr ?? "").toLowerCase().includes(q) ||
        String(b.train?.trainName ?? "").toLowerCase().includes(q) ||
        String(b.user?.name ?? "").toLowerCase().includes(q) ||
        String(b.user?.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [bookings, query, statusFilter]);

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await adminCancelBooking(cancelTarget.id);
      toast.success(`Booking ${cancelTarget.pnr} cancelled.`);
      setCancelTarget(null);
      await load();
    } catch (err) {
      toast.error(err.message || "Could not cancel this booking.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div>
      <div className="admin-page-head">
        <h1>
          <Ticket size={22} aria-hidden="true" /> Bookings
        </h1>
        <p>{bookings.length} bookings in the system.</p>
      </div>

      <div className="admin-toolbar">
        <input
          className="input"
          placeholder="Search by PNR, train or passenger…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search bookings"
        />
        <select
          className="select select-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="ALL">All statuses</option>
          <option value={BOOKING_STATUS.CONFIRMED}>Confirmed</option>
          <option value={BOOKING_STATUS.PENDING_PAYMENT}>Payment pending</option>
          <option value={BOOKING_STATUS.CANCELLED}>Cancelled</option>
        </select>
      </div>

      {loading && <Loader message="Loading bookings…" />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          icon={Ticket}
          title="No bookings"
          message="No booking matches your filters."
        />
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>PNR</th>
                <th>Passenger</th>
                <th>Train</th>
                <th>Journey</th>
                <th>Class</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((booking) => (
                <tr key={booking.id}>
                  <td className="mono">{booking.pnr}</td>
                  <td>
                    <div className="flex-col">
                      <span>{booking.user?.name || "—"}</span>
                      <span className="text-xs text-muted">
                        {booking.user?.email || ""}
                      </span>
                    </div>
                  </td>
                  <td>{booking.train?.trainName || "—"}</td>
                  <td>{formatDateLong(booking.journeyDate)}</td>
                  <td>{booking.classType}</td>
                  <td className="mono">{formatINR(booking.totalAmount)}</td>
                  <td>
                    <StatusBadge status={booking.bookingStatus} />
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <Link
                        to={`/ticket/${booking.id}`}
                        className="icon-btn"
                        aria-label={`View booking ${booking.pnr}`}
                      >
                        <Eye size={15} />
                      </Link>
                      {String(booking.bookingStatus).toUpperCase() !==
                        BOOKING_STATUS.CANCELLED && (
                        <button
                          type="button"
                          className="icon-btn is-danger"
                          onClick={() => setCancelTarget(booking)}
                          aria-label={`Cancel booking ${booking.pnr}`}
                        >
                          <XCircle size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        title="Cancel booking?"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setCancelTarget(null)}
              disabled={cancelling}
            >
              Keep booking
            </Button>
            <Button variant="danger" loading={cancelling} onClick={confirmCancel}>
              Yes, cancel it
            </Button>
          </>
        }
      >
        {cancelTarget && (
          <>
            <p>
              Cancel booking <strong className="mono">{cancelTarget.pnr}</strong>{" "}
              for <strong>{cancelTarget.user?.name}</strong>?
            </p>
            <p className="text-sm text-muted mt-3">
              Booked {formatDateTime(cancelTarget.bookingDate)} ·{" "}
              {formatINR(cancelTarget.totalAmount)}
            </p>
          </>
        )}
      </Modal>
    </div>
  );
};

export default BookingManagement;
