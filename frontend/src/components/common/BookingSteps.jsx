import { BOOKING_STEPS } from "../../utils/constants";

/**
 * BookingSteps — the progress indicator for the booking flow.
 * `current` is a step key from BOOKING_STEPS.
 */

const BookingSteps = ({ current }) => {
  const currentIndex = BOOKING_STEPS.findIndex((s) => s.key === current);

  return (
    <nav className="steps" aria-label="Booking progress">
      {BOOKING_STEPS.map((step, index) => {
        const isDone = index < currentIndex;
        const isActive = index === currentIndex;

        return (
          <div
            key={step.key}
            className="step-wrap flex"
            style={{ alignItems: "center" }}
          >
            <div
              className={`step ${isActive ? "is-active" : ""} ${
                isDone ? "is-done" : ""
              }`}
              aria-current={isActive ? "step" : undefined}
            >
              <span className="step-num" aria-hidden="true">
                {isDone ? "✓" : index + 1}
              </span>
              <span className="step-label">{step.label}</span>
            </div>
            {index < BOOKING_STEPS.length - 1 && (
              <span
                className={`step-line ${isDone ? "is-done" : ""}`}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </nav>
  );
};

export default BookingSteps;
