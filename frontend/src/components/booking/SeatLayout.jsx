import { BERTH_LABELS } from "../../utils/constants";

/**
 * SeatLayout — the visual coach layout.
 *
 * Seats are grouped by berth type so the grid reads like a real coach: lower
 * and upper berths in one block, side berths in another. Each seat shows its
 * number and berth type, and its state (available / selected / occupied) is
 * driven by the journey-wise availability check, not a coach-level flag.
 */

const SeatLayout = ({
  seats,
  selectedSeatIds,
  isAvailable,
  onToggle,
  maxSelectable,
}) => {
  if (!seats || seats.length === 0) {
    return (
      <p className="text-sm text-muted">
        No seats are configured for this coach yet.
      </p>
    );
  }

  const selectedSet = new Set(selectedSeatIds.map(String));

  // Group by berth type, preserving a sensible order.
  const order = [
    "LOWER",
    "MIDDLE",
    "UPPER",
    "SIDE_LOWER",
    "SIDE_UPPER",
    "SIDE LOWER",
    "SIDE UPPER",
    "WINDOW",
    "AISLE",
  ];

  const groups = new Map();
  for (const seat of seats) {
    const key = String(seat.berthType || "OTHER").toUpperCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(seat);
  }

  const sortedGroups = [...groups.entries()].sort((a, b) => {
    const ia = order.indexOf(a[0]);
    const ib = order.indexOf(b[0]);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  return (
    <div className="seat-layout">
      {sortedGroups.map(([berthType, groupSeats]) => (
        <div key={berthType} className="seat-group">
          <h4 className="seat-group-title">
            {BERTH_LABELS[berthType] || berthType}
            <span className="text-xs text-muted">
              {" "}
              · {groupSeats.length} seats
            </span>
          </h4>

          <div className="seat-grid">
            {groupSeats
              .sort(
                (a, b) =>
                  (Number(a.seatNumber) || 0) - (Number(b.seatNumber) || 0)
              )
              .map((seat) => {
                const available = isAvailable(seat.id);
                const selected = selectedSet.has(String(seat.id));
                const atLimit =
                  !selected && selectedSeatIds.length >= maxSelectable;

                const state = !available
                  ? "is-occupied"
                  : selected
                  ? "is-selected"
                  : "is-available";

                return (
                  <button
                    key={seat.id}
                    type="button"
                    className={`seat ${state}`}
                    disabled={!available || atLimit}
                    onClick={() => onToggle(seat)}
                    aria-pressed={selected}
                    aria-label={`Seat ${seat.seatNumber}, ${
                      BERTH_LABELS[seat.berthType] || seat.berthType
                    }, ${available ? "available" : "occupied"}`}
                    title={
                      !available
                        ? `Seat ${seat.seatNumber} is already booked for this journey`
                        : atLimit
                        ? `You can select at most ${maxSelectable} seats`
                        : `Seat ${seat.seatNumber} — ${
                            BERTH_LABELS[seat.berthType] || seat.berthType
                          }`
                    }
                  >
                    <span className="seat-num">{seat.seatNumber}</span>
                    <span className="seat-berth" aria-hidden="true">
                      {(BERTH_LABELS[seat.berthType] || seat.berthType || "")
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SeatLayout;
