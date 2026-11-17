import { Link } from "react-router-dom";
import { Compass, Home } from "lucide-react";

/** NotFoundPage — 404. */

const NotFoundPage = () => (
  <div className="container">
    <div className="state-block state-block-lg">
      <span className="state-icon" aria-hidden="true">
        <Compass size={34} />
      </span>
      <span className="error-code">404</span>
      <h1>This platform does not exist</h1>
      <p>
        The page you are looking for has been moved, renamed, or never existed.
        Let us get you back on track.
      </p>
      <div className="flex gap-3 wrap center">
        <Link to="/" className="btn btn-primary">
          <Home size={17} aria-hidden="true" /> Back to home
        </Link>
        <Link to="/trains" className="btn btn-secondary">
          Search trains
        </Link>
      </div>
    </div>
  </div>
);

export default NotFoundPage;
