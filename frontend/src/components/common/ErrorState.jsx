import { AlertTriangle, RotateCw } from "lucide-react";
import Button from "./Button";

/** ErrorState — shown when a request failed, with an optional retry. */

const ErrorState = ({
  title = "Something went wrong",
  message = "",
  onRetry = null,
  retryLabel = "Try again",
}) => (
  <div className="state-block" role="alert">
    <span className="state-icon is-error" aria-hidden="true">
      <AlertTriangle size={28} />
    </span>
    <h3>{title}</h3>
    {message && <p>{message}</p>}
    {onRetry && (
      <Button variant="secondary" icon={RotateCw} onClick={onRetry}>
        {retryLabel}
      </Button>
    )}
  </div>
);

export default ErrorState;
