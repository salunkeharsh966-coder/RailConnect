import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/**
 * ProtectedRoute — gates a route behind login and, optionally, the admin role.
 *
 * IMPORTANT: this is a UI guard only. The backend does not authenticate
 * requests, so it is not a security boundary. It exists so a normal user is
 * not shown admin screens they cannot meaningfully use.
 */

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { isLoggedIn, isAdmin } = useAuth();
  const location = useLocation();

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
