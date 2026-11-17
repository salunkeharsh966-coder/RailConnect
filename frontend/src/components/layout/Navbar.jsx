import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Ticket,
  TrainFront,
  User,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { APP_NAME } from "../../utils/constants";

/**
 * Navbar — the primary navigation.
 *
 * Guests see Login / Register. Signed-in users get an account dropdown with
 * My Profile, My Bookings, Admin Dashboard (admins only) and Logout.
 */

const PUBLIC_LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/trains", label: "Book Tickets" },
  { to: "/routes", label: "Train Routes" },
  { to: "/services", label: "Services" },
  { to: "/about", label: "About" },
];

const Navbar = () => {
  const { isLoggedIn, isAdmin, user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menus on navigation.
  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  // Close the account dropdown on an outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return undefined;

    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    toast.success("You have been signed out.");
    navigate("/");
  };

  const initials = String(user?.name ?? "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="brand" aria-label={`${APP_NAME} home`}>
          <span className="brand-mark" aria-hidden="true">
            <TrainFront size={20} />
          </span>
          <span className="brand-text">
            <strong>{APP_NAME}</strong>
            <small>Railway Reservation</small>
          </span>
        </Link>

        <nav className="nav-links hide-mobile" aria-label="Main">
          {PUBLIC_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `nav-link ${isActive ? "is-active" : ""}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="nav-actions">
          {isLoggedIn ? (
            <div className="account-menu" ref={menuRef}>
              <button
                type="button"
                className="account-trigger"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                <span className="avatar" aria-hidden="true">
                  {initials || <User size={15} />}
                </span>
                <span className="account-name hide-mobile">
                  {user?.name?.split(" ")[0] || "Account"}
                </span>
                <ChevronDown size={15} aria-hidden="true" />
              </button>

              {menuOpen && (
                <div className="account-dropdown" role="menu">
                  <div className="account-head">
                    <strong>{user?.name}</strong>
                    <span>{user?.email}</span>
                    {isAdmin && (
                      <span className="badge badge-navy mt-2">
                        Administrator
                      </span>
                    )}
                  </div>

                  <Link
                    to="/my-account"
                    className="account-item"
                    role="menuitem"
                  >
                    <User size={16} aria-hidden="true" /> My Profile
                  </Link>
                  <Link
                    to="/my-bookings"
                    className="account-item"
                    role="menuitem"
                  >
                    <Ticket size={16} aria-hidden="true" /> My Bookings
                  </Link>

                  {isAdmin && (
                    <Link to="/admin" className="account-item" role="menuitem">
                      <LayoutDashboard size={16} aria-hidden="true" /> Admin
                      Dashboard
                    </Link>
                  )}

                  <button
                    type="button"
                    className="account-item is-danger"
                    onClick={handleLogout}
                    role="menuitem"
                  >
                    <LogOut size={16} aria-hidden="true" /> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <Link to="/login" className="btn btn-ghost btn-sm">
                Login
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Register
              </Link>
            </div>
          )}

          <button
            type="button"
            className="nav-toggle hide-desktop"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="mobile-nav hide-desktop" aria-label="Mobile">
          {PUBLIC_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `mobile-link ${isActive ? "is-active" : ""}`
              }
            >
              {link.label}
            </NavLink>
          ))}

          {isLoggedIn && (
            <>
              <NavLink to="/my-account" className="mobile-link">
                My Profile
              </NavLink>
              <NavLink to="/my-bookings" className="mobile-link">
                My Bookings
              </NavLink>
              {isAdmin && (
                <NavLink to="/admin" className="mobile-link">
                  Admin Dashboard
                </NavLink>
              )}
              <button
                type="button"
                className="mobile-link is-danger"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          )}
        </nav>
      )}
    </header>
  );
};

export default Navbar;
