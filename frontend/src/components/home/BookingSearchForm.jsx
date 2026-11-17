import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftRight, CalendarDays, Search } from "lucide-react";
import StationAutocomplete from "./StationAutocomplete";
import Button from "../common/Button";
import { useToast } from "../../context/ToastContext";
import { todayISO } from "../../utils/dateUtils";
import { validateJourneyDate, validateRoute } from "../../utils/validators";

/**
 * BookingSearchForm — the hero search.
 *
 * Validates that both stations are real records, that they differ, and that
 * the journey date is not in the past. On success it navigates to the results
 * page with the search in the URL, so the results are shareable and survive a
 * refresh.
 */

const BookingSearchForm = ({ compact = false }) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [journeyDate, setJourneyDate] = useState(todayISO());
  const [errors, setErrors] = useState({});

  const swap = () => {
    setFrom(to);
    setTo(from);
    setErrors({});
  };

  const submit = (e) => {
    e.preventDefault();

    const routeError = validateRoute(from, to);
    const dateError = validateJourneyDate(journeyDate);

    const nextErrors = {
      from: !from ? "Please select a boarding station" : "",
      to: !to ? "Please select a destination station" : "",
      route: routeError && from && to ? routeError : "",
      journeyDate: dateError || "",
    };

    setErrors(nextErrors);

    const firstMessage =
      nextErrors.from ||
      nextErrors.to ||
      nextErrors.route ||
      nextErrors.journeyDate;

    if (firstMessage) {
      toast.error(firstMessage);
      return;
    }

    const params = new URLSearchParams({
      from: String(from.id),
      to: String(to.id),
      date: journeyDate,
    });

    navigate(`/trains?${params.toString()}`);
  };

  return (
    <form
      className={`search-card ${compact ? "is-compact" : ""}`}
      onSubmit={submit}
      noValidate
    >
      <div className="search-card-head">
        <h2>Find your train</h2>
        <p>Real routes, real berths, real availability.</p>
      </div>

      <div className="search-grid">
        <StationAutocomplete
          label="From"
          value={from}
          onSelect={(station) => {
            setFrom(station);
            setErrors((prev) => ({ ...prev, from: "", route: "" }));
          }}
          error={errors.from || errors.route}
          excludeStationId={to?.id}
        />

        <div className="swap-wrap">
          <button
            type="button"
            className="swap-btn"
            onClick={swap}
            aria-label="Swap boarding and destination stations"
            title="Swap stations"
          >
            <ArrowLeftRight size={17} />
          </button>
        </div>

        <StationAutocomplete
          label="To"
          value={to}
          onSelect={(station) => {
            setTo(station);
            setErrors((prev) => ({ ...prev, to: "", route: "" }));
          }}
          error={errors.to}
          excludeStationId={from?.id}
        />

        <div className="field">
          <label className="field-label" htmlFor="journey-date">
            Journey date
          </label>
          <div className="input-wrap">
            <span className="input-icon" aria-hidden="true">
              <CalendarDays size={17} />
            </span>
            <input
              id="journey-date"
              type="date"
              className={`input ${errors.journeyDate ? "has-error" : ""}`}
              value={journeyDate}
              min={todayISO()}
              onChange={(e) => {
                setJourneyDate(e.target.value);
                setErrors((prev) => ({ ...prev, journeyDate: "" }));
              }}
              aria-invalid={errors.journeyDate ? "true" : undefined}
            />
          </div>
          {errors.journeyDate && (
            <span className="field-error" role="alert">
              {errors.journeyDate}
            </span>
          )}
        </div>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        block
        icon={Search}
        className="search-submit"
      >
        Search trains
      </Button>
    </form>
  );
};

export default BookingSearchForm;
