import { Container } from "lucide-react";
import { CLASS_LABEL } from "../../utils/constants";

/**
 * CoachSelector — pick a coach within the chosen class.
 *
 * Only coaches that belong to the selected class are shown, and each one
 * displays its real seat count from the backend.
 */

const CoachSelector = ({ coaches, selectedCoachId, onSelect }) => {
  if (!coaches || coaches.length === 0) {
    return (
      <p className="text-sm text-muted">
        No coaches are available for this class on this train.
      </p>
    );
  }

  return (
    <div className="coach-selector" role="group" aria-label="Choose a coach">
      {coaches.map((coach) => {
        const isSelected = String(coach.id) === String(selectedCoachId);
        return (
          <button
            key={coach.id}
            type="button"
            className={`coach-chip ${isSelected ? "is-selected" : ""}`}
            onClick={() => onSelect(coach)}
            aria-pressed={isSelected}
          >
            <span className="coach-chip-icon" aria-hidden="true">
              <Container size={15} />
            </span>
            <span className="coach-chip-body">
              <strong>{coach.coachNumber || coach.coachName || "Coach"}</strong>
              <span className="text-xs text-muted">
                {CLASS_LABEL[coach.coachType] || coach.coachType} ·{" "}
                {coach.totalSeats ?? 0} seats
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default CoachSelector;
