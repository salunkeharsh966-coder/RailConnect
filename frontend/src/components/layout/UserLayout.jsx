import { NavLink, Outlet } from "react-router-dom";
import { Ticket, User } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

/**
 * UserLayout — the signed-in account area: a sidebar plus the page content.
 */

const UserLayout = () => {
  const { user, isAdmin } = useAuth();

  return (
    <div className="container">
      <div className="account-layout">
        <aside className="account-sidebar">
          <div className="account-sidebar-head">
            <span className="avatar avatar-lg" aria-hidden="true">
              {String(user?.name ?? "U")[0]?.toUpperCase()}
            </span>
            <div>
              <strong>{user?.name}</strong>
              <span className="text-xs text-muted">{user?.email}</span>
            </div>
          </div>

          <nav className="account-nav" aria-label="Account">
            <NavLink
              to="/my-account"
              className={({ isActive }) =>
                `account-nav-item ${isActive ? "is-active" : ""}`
              }
            >
              <User size={17} aria-hidden="true" /> My Profile
            </NavLink>
            <NavLink
              to="/my-bookings"
              className={({ isActive }) =>
                `account-nav-item ${isActive ? "is-active" : ""}`
              }
            >
              <Ticket size={17} aria-hidden="true" /> My Bookings
            </NavLink>
          </nav>

          {isAdmin && (
            <p className="text-xs text-muted mt-4">
              You have administrator access. Open the Admin Dashboard from the
              account menu above.
            </p>
          )}
        </aside>

        <div className="account-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default UserLayout;
