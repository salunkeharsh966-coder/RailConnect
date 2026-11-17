import { Link } from "react-router-dom";
import {
  BadgeCheck,
  CalendarDays,
  Mail,
  Phone,
  ShieldCheck,
  Ticket,
  User,
} from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import { useAuth } from "../context/AuthContext";
import { formatDateTime } from "../utils/dateUtils";

/**
 * ProfilePage.
 *
 * Shows the signed-in user's own details. The backend exposes no profile
 * update endpoint, so the fields are read-only and the page says so plainly
 * rather than offering an edit form that cannot save.
 */

const ProfilePage = () => {
  const { user, isAdmin } = useAuth();

  const initials = String(user?.name ?? "U")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div>
      <PageHeader
        title="My profile"
        subtitle="Your account details on RailConnect."
        crumbs={[{ label: "Home", to: "/" }, { label: "My profile" }]}
      />

      <section className="card card-pad profile-card">
        <div className="profile-head">
          <span className="avatar avatar-lg" aria-hidden="true">
            {initials || <User size={20} />}
          </span>
          <div>
            <h2>{user?.name}</h2>
            <span className="text-sm text-muted">{user?.email}</span>
            {isAdmin && (
              <span className="badge badge-navy mt-2">Administrator</span>
            )}
          </div>
        </div>

        <dl className="profile-grid">
          <div>
            <dt>
              <User size={14} aria-hidden="true" /> Full name
            </dt>
            <dd>{user?.name || "—"}</dd>
          </div>
          <div>
            <dt>
              <Mail size={14} aria-hidden="true" /> Email
            </dt>
            <dd>{user?.email || "—"}</dd>
          </div>
          <div>
            <dt>
              <Phone size={14} aria-hidden="true" /> Phone
            </dt>
            <dd>{user?.phone || "Not provided"}</dd>
          </div>
          <div>
            <dt>
              <ShieldCheck size={14} aria-hidden="true" /> Role
            </dt>
            <dd>{user?.role || "USER"}</dd>
          </div>
          <div>
            <dt>
              <CalendarDays size={14} aria-hidden="true" /> Member since
            </dt>
            <dd>{formatDateTime(user?.createdAt)}</dd>
          </div>
          <div>
            <dt>
              <BadgeCheck size={14} aria-hidden="true" /> Account ID
            </dt>
            <dd className="mono">#{user?.id}</dd>
          </div>
        </dl>

        <div className="alert alert-info mt-6" role="note">
          <span className="text-sm">
            Profile editing is not available in this build — the backend does
            not expose an update-profile endpoint. Contact support to change
            your details.
          </span>
        </div>

        <div className="flex gap-3 wrap mt-6">
          <Link to="/my-bookings" className="btn btn-primary">
            <Ticket size={16} aria-hidden="true" /> My bookings
          </Link>
          <Link to="/trains" className="btn btn-secondary">
            Search trains
          </Link>
        </div>
      </section>
    </div>
  );
};

export default ProfilePage;
