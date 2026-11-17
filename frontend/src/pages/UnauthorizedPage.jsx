import { Link } from "react-router-dom";
import { Home, ShieldAlert } from "lucide-react";

/** UnauthorizedPage — shown when a non-admin opens an admin route. */

const UnauthorizedPage = () => (
  <div className="container">
    <div className="state-block state-block-lg">
      <span className="state-icon is-error" aria-hidden="true">
        <ShieldAlert size={34} />
      </span>
      <span className="error-code">403</span>
      <h1>Administrator access required</h1>
      <p>
        This area is limited to administrator accounts. If you believe you
        should have access, please contact the system administrator.
      </p>
      <div className="flex gap-3 wrap center">
        <Link to="/" className="btn btn-primary">
          <Home size={17} aria-hidden="true" /> Back to home
        </Link>
        <Link to="/my-bookings" className="btn btn-secondary">
          My bookings
        </Link>
      </div>
    </div>
  </div>
);

export default UnauthorizedPage;
