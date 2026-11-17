import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Armchair,
  Building2,
  LayoutDashboard,
  Ticket,
  TrainFront,
  Users,
  Container,
} from "lucide-react";
import Loader from "../../components/common/Loader";
import ErrorState from "../../components/common/ErrorState";
import { getAllTrains } from "../../services/trainService";
import { getAllStations } from "../../services/stationService";
import { getAllBookings } from "../../services/bookingService";
import { getAllUsers } from "../../services/userService";
import { getAllCoaches } from "../../services/coachService";
import { getAllSeats } from "../../services/seatService";
import { formatINR } from "../../utils/currencyUtils";
import { BOOKING_STATUS } from "../../utils/constants";

/**
 * AdminDashboardPage.
 *
 * Real counts pulled from the backend — nothing here is hard-coded. Each
 * figure links to the screen that manages it.
 */

const AdminDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [trains, stations, bookings, users, coaches, seats] =
        await Promise.all([
          getAllTrains(),
          getAllStations(),
          getAllBookings(),
          getAllUsers(),
          getAllCoaches(),
          getAllSeats(),
        ]);

      const confirmed = bookings.filter(
        (b) =>
          String(b.bookingStatus).toUpperCase() === BOOKING_STATUS.CONFIRMED
      );
      const revenue = confirmed.reduce(
        (sum, b) => sum + (Number(b.totalAmount) || 0),
        0
      );

      setStats({
        trains: trains.length,
        stations: stations.length,
        coaches: coaches.length,
        seats: seats.length,
        bookings: bookings.length,
        confirmed: confirmed.length,
        users: users.length,
        revenue,
      });
    } catch (err) {
      setError(err.message || "Unable to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <Loader message="Loading dashboard…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const CARDS = [
    {
      icon: TrainFront,
      value: stats.trains,
      label: "Trains",
      to: "/admin/trains",
    },
    {
      icon: Building2,
      value: stats.stations.toLocaleString("en-IN"),
      label: "Stations",
      to: "/admin/stations",
    },
    {
      icon: Container,
      value: stats.coaches,
      label: "Coaches",
      to: "/admin/coaches",
    },
    {
      icon: Armchair,
      value: stats.seats.toLocaleString("en-IN"),
      label: "Seats",
      to: "/admin/seats",
    },
    {
      icon: Ticket,
      value: stats.bookings,
      label: "Bookings",
      to: "/admin/bookings",
    },
    {
      icon: Users,
      value: stats.users,
      label: "Users",
      to: "/admin/users",
    },
  ];

  return (
    <div>
      <div className="admin-page-head">
        <h1>
          <LayoutDashboard size={22} aria-hidden="true" /> Overview
        </h1>
        <p>Live figures from the RailConnect backend.</p>
      </div>

      <div className="stat-grid">
        {CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} to={card.to} className="stat-card">
              <span className="stat-icon" aria-hidden="true">
                <Icon size={20} />
              </span>
              <div className="stat-value">{card.value}</div>
              <div className="stat-label">{card.label}</div>
            </Link>
          );
        })}
      </div>

      <div className="stat-grid mt-6">
        <div className="stat-card">
          <span className="stat-icon" aria-hidden="true">
            <Ticket size={20} />
          </span>
          <div className="stat-value">{stats.confirmed}</div>
          <div className="stat-label">Confirmed bookings</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon" aria-hidden="true">
            <Ticket size={20} />
          </span>
          <div className="stat-value">{formatINR(stats.revenue)}</div>
          <div className="stat-label">Confirmed revenue</div>
        </div>
      </div>

      <div className="alert alert-info mt-6" role="note">
        <span className="text-sm">
          The backend does not authenticate requests, so this admin area is a
          UI convenience, not a security boundary. See the project report.
        </span>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
