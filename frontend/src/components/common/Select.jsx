import { useId } from "react";

/** Select — labelled dropdown with error support. */

const Select = ({
  label,
  value,
  onChange,
  options = [],
  placeholder = "Select…",
  error = "",
  hint = "",
  required = false,
  className = "",
  id: providedId,
  ...rest
}) => {
  const generatedId = useId();
  const id = providedId || generatedId;
  const errorId = `${id}-error`;

  return (
    <div className="field">
      {label && (
        <label className="field-label" htmlFor={id}>
          {label}
          {required && (
            <span className="field-required" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <select
        id={id}
        value={value}
        onChange={onChange}
        className={`select ${error ? "has-error" : ""} ${className}`}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? errorId : undefined}
        aria-required={required || undefined}
        {...rest}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {error && (
        <span className="field-error" id={errorId} role="alert">
          {error}
        </span>
      )}
      {hint && !error && <span className="field-hint">{hint}</span>}
    </div>
  );
};

export default Select;
