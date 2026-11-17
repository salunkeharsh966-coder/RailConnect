import { formatINR } from "../../utils/currencyUtils";
import { CLASS_LABEL } from "../../utils/constants";

/**
 * FareSummary — the fare breakdown.
 *
 * The per-passenger fare and the total come from the backend's own fare table
 * (BookingService.getFarePerPassenger). The frontend only multiplies by the
 * passenger count for display; the authoritative total is the one the backend
 * returns on the booking.
 */

const FareSummary = ({
  travelClass,
  farePerPassenger,
  passengerCount,
  totalAmount,
  compact = false,
}) => {
  const computedTotal =
    totalAmount ?? Number(farePerPassenger || 0) * Number(passengerCount || 0);

  return (
    <div className={`fare-summary ${compact ? "is-compact" : ""}`}>
      <div className="fare-row">
        <span>Class</span>
        <strong>{CLASS_LABEL[travelClass] || travelClass || "—"}</strong>
      </div>
      <div className="fare-row">
        <span>Fare per passenger</span>
        <strong>{formatINR(farePerPassenger)}</strong>
      </div>
      <div className="fare-row">
        <span>Passengers</span>
        <strong>× {passengerCount}</strong>
      </div>
      <div className="fare-row fare-total">
        <span>Total payable</span>
        <strong>{formatINR(computedTotal)}</strong>
      </div>
      <p className="text-xs text-muted mt-2">
        Fares are calculated by the server. The final amount is confirmed when
        the booking is created.
      </p>
    </div>
  );
};

export default FareSummary;
