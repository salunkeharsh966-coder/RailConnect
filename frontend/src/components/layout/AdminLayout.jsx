import { NavLink, Outlet } from "react-router-dom";
import {
  Armchair,
  Building2,
  LayoutDashboard,
  Route,
  Ticket,
  TrainFront,
  Users,
  Container,
} from "lucide-react";

/**
 * AdminLayout — sidebar navigation for the admin area.
 *
 * Every link here maps to an endpoint that actually exists in the backend.
 */

const ADMIN_LINKS = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/trains", label: "Trains", icon: TrainFront },
  { to: "/admin/stations", label: "Stations", icon: Building2 },
  { to: "/admin/routes", label: "Routes", icon: Route },
  { to: "/admin/coaches", label: "Coaches", icon: Container },
  { to: "/admin/seats", label: "Seats", icon: Armchair },
  { to: "/admin/bookings", label: "Bookings", icon: Ticket },
  { to: "/admin/users", label: "Users", icon: Users },
];

const AdminLayout = () => (
  <div className="container">
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-head">
          <span className="badge badge-navy">Admin</span>
          <strong>Control Panel</strong>
        </div>

        <nav className="admin-nav" aria-label="Admin">
          {ADMIN_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `admin-nav-item ${isActive ? "is-active" : ""}`
                }
              >
                <Icon size={17} aria-hidden="true" /> {link.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <div className="admin-content">
        <Outlet />
      </div>
    </div>
  </div>
);

export default AdminLayout;
