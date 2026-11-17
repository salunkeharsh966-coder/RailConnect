import { useId } from "react";

/**
 * Input — labelled text/email/password/number/date input with error and hint
 * support. Every input gets a real <label> and aria-invalid wiring.
 */

const Input = ({
  label,
  type = "text",
  value,
  onChange,
  error = "",
  hint = "",
  required = false,
  icon: Icon = null,
  suffix = null,
  className = "",
  id: providedId,
  ...rest
}) => {
  const generatedId = useId();
  const id = providedId || generatedId;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") ||
    undefined;

  const inputEl = (
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      className={`input ${error ? "has-error" : ""} ${className}`}
      aria-invalid={error ? "true" : undefined}
      aria-describedby={describedBy}
      aria-required={required || undefined}
      {...rest}
    />
  );

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

      {Icon || suffix ? (
        <div className="input-wrap">
          {Icon && (
            <span className="input-icon" aria-hidden="true">
              <Icon size={17} />
            </span>
          )}
          {inputEl}
          {suffix}
        </div>
      ) : (
        inputEl
      )}

      {error && (
        <span className="field-error" id={errorId} role="alert">
          {error}
        </span>
      )}
      {hint && !error && (
        <span className="field-hint" id={hintId}>
          {hint}
        </span>
      )}
    </div>
  );
};

export default Input;
