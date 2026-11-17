import { Trash2, User } from "lucide-react";
import Input from "../common/Input";
import Select from "../common/Select";
import { GENDERS } from "../../utils/constants";
import {
  validateAge,
  validateGender,
  validateName,
} from "../../utils/validators";

/**
 * PassengerForm — one passenger row.
 *
 * Each passenger is bound to a specific seat, so the seat number is shown
 * read-only next to the fields. Validation mirrors the backend's own checks.
 */

const GENDER_OPTIONS = GENDERS.map((g) => ({
  value: g,
  label: g.charAt(0) + g.slice(1).toLowerCase(),
}));

const PassengerForm = ({
  index,
  passenger,
  seat,
  onChange,
  onRemove,
  canRemove,
  errors = {},
}) => {
  const update = (field, value) => {
    onChange(index, { ...passenger, [field]: value });
  };

  return (
    <div className="passenger-card">
      <div className="passenger-head">
        <span className="passenger-index" aria-hidden="true">
          <User size={15} />
        </span>
        <div className="passenger-title">
          <strong>Passenger {index + 1}</strong>
          {seat && (
            <span className="text-xs text-muted">
              Seat {seat.seatNumber} · {seat.berthType}
            </span>
          )}
        </div>

        {canRemove && (
          <button
            type="button"
            className="icon-btn is-danger"
            onClick={() => onRemove(index)}
            aria-label={`Remove passenger ${index + 1}`}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="passenger-grid">
        <Input
          label="Full name"
          value={passenger.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="As on the ID proof"
          required
          error={errors.name || validateName(passenger.name) || ""}
          autoComplete="off"
        />

        <Input
          label="Age"
          type="number"
          min="1"
          max="120"
          value={passenger.age}
          onChange={(e) => update("age", e.target.value)}
          placeholder="e.g. 32"
          required
          error={errors.age || validateAge(passenger.age) || ""}
        />

        <Select
          label="Gender"
          value={passenger.gender}
          onChange={(e) => update("gender", e.target.value)}
          options={GENDER_OPTIONS}
          placeholder="Select gender"
          required
          error={errors.gender || validateGender(passenger.gender) || ""}
        />
      </div>
    </div>
  );
};

export default PassengerForm;
