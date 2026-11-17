import { BOOKING_STATUS } from "../../utils/constants";

/**
 * StatusBadge — renders a booking / payment status with the right colour.
 *
 * Only the statuses the backend actually returns are mapped; anything else
 * falls back to a neutral badge showing the raw value rather than guessing.
 */

const STATUS_MAP = {
  [BOOKING_STATUS.CONFIRMED]: { tone: "success", label: "Confirmed" },
  [BOOKING_STATUS.PENDING_PAYMENT]: {
    tone: "warning",
    label: "Payment pending",
  },
  [BOOKING_STATUS.CANCELLED]: { tone: "danger", label: "Cancelled" },
  SUCCESS: { tone: "success", label: "Paid" },
  CAPTURED: { tone: "success", label: "Paid" },
  PENDING: { tone: "warning", label: "Pending" },
  FAILED: { tone: "danger", label: "Failed" },
  REFUNDED: { tone: "info", label: "Refunded" },
  PROCESSED: { tone: "success", label: "Refunded" },
};

const StatusBadge = ({ status, label = null }) => {
  const key = String(status ?? "").toUpperCase();
  const mapped = STATUS_MAP[key];

  const tone = mapped?.tone ?? "neutral";
  const text = label ?? mapped?.label ?? (status || "Unknown");

  return (
    <span className={`badge badge-${tone}`}>
      <span className="badge-dot" aria-hidden="true" />
      {text}
    </span>
  );
};

export default StatusBadge;
