import { Loader2 } from "lucide-react";

/**
 * Button — the single button primitive for the whole app.
 *
 * variant: primary | navy | secondary | ghost | success | danger | outline-danger
 * size:    sm | md | lg
 */

const Button = ({
  children,
  variant = "primary",
  size = "md",
  type = "button",
  loading = false,
  disabled = false,
  block = false,
  icon: Icon = null,
  iconRight: IconRight = null,
  className = "",
  ...rest
}) => {
  const classes = [
    "btn",
    `btn-${variant}`,
    size !== "md" ? `btn-${size}` : "",
    block ? "btn-block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      className={classes}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <span className="btn-spinner" aria-hidden="true" />
      ) : (
        Icon && <Icon size={size === "sm" ? 15 : 17} aria-hidden="true" />
      )}
      {children}
      {!loading && IconRight && (
        <IconRight size={size === "sm" ? 15 : 17} aria-hidden="true" />
      )}
    </button>
  );
};

export default Button;
