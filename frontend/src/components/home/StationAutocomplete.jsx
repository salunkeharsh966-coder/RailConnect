import { useEffect, useId, useRef, useState } from "react";
import { MapPin, Search, X } from "lucide-react";
import { useStations } from "../../context/StationContext";

/**
 * StationAutocomplete.
 *
 * The user MUST pick a real station record — free text is not a valid value.
 * Suggestions come from the station dataset already loaded in StationContext,
 * so typing never hits the network.
 *
 * Keyboard: ArrowUp / ArrowDown to move, Enter to select, Escape to close.
 */

const StationAutocomplete = ({
  label,
  value,
  onSelect,
  placeholder = "Station, code or city",
  error = "",
  disabled = false,
  excludeStationId = null,
}) => {
  const { searchStations, loading, error: stationError } = useStations();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef(null);
  const inputId = useId();

  // Show the selected station's name in the box.
  useEffect(() => {
    if (value) {
      setQuery(`${value.stationName} (${value.stationCode})`);
    }
  }, [value]);

  const suggestions = open
    ? searchStations(query, 8).filter(
        (s) => String(s.id) !== String(excludeStationId)
      )
    : [];

  // Close on outside click.
  useEffect(() => {
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const choose = (station) => {
    onSelect(station);
    setQuery(`${station.stationName} (${station.stationCode})`);
    setOpen(false);
  };

  const clear = () => {
    onSelect(null);
    setQuery("");
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (!open || suggestions.length === 0) {
      if (e.key === "ArrowDown") setOpen(true);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(suggestions[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const listId = `${inputId}-list`;

  return (
    <div className="field station-field" ref={wrapRef}>
      <label className="field-label" htmlFor={inputId}>
        {label}
      </label>

      <div className="input-wrap">
        <span className="input-icon" aria-hidden="true">
          <MapPin size={17} />
        </span>

        <input
          id={inputId}
          type="text"
          className={`input ${error ? "has-error" : ""}`}
          value={query}
          placeholder={placeholder}
          disabled={disabled || loading}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-invalid={error ? "true" : undefined}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlight(0);
            // Typing invalidates a previous selection.
            if (value) onSelect(null);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />

        {value && !disabled && (
          <button
            type="button"
            className="input-suffix-btn"
            onClick={clear}
            aria-label={`Clear ${label}`}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {open && !loading && suggestions.length > 0 && (
        <ul className="autocomplete-list" id={listId} role="listbox">
          {suggestions.map((station, index) => (
            <li
              key={station.id}
              role="option"
              aria-selected={index === highlight}
            >
              <button
                type="button"
                className={`autocomplete-item ${
                  index === highlight ? "is-highlight" : ""
                }`}
                onMouseEnter={() => setHighlight(index)}
                onClick={() => choose(station)}
              >
                <span className="ac-name">{station.stationName}</span>
                <span className="ac-meta">
                  <span className="ac-code">{station.stationCode}</span>
                  {station.city && <span>{station.city}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && !loading && query.trim() && suggestions.length === 0 && (
        <div className="autocomplete-empty">
          <Search size={14} aria-hidden="true" />
          No station matches “{query}”. Try a different spelling or the station
          code.
        </div>
      )}

      {stationError && (
        <span className="field-error" role="alert">
          {stationError}
        </span>
      )}
      {error && (
        <span className="field-error" role="alert">
          {error}
        </span>
      )}
      {!error && !stationError && (
        <span className="field-hint">
          Pick a station from the list — free text is not accepted.
        </span>
      )}
    </div>
  );
};

export default StationAutocomplete;
