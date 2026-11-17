import { Route, Routes } from "react-router-dom";

import MainLayout from "./components/layout/MainLayout";
import UserLayout from "./components/layout/UserLayout";
import AdminLayout from "./components/layout/AdminLayout";
import ProtectedRoute from "./components/common/ProtectedRoute";

import HomePage from "./pages/HomePage";
import TrainResultsPage from "./pages/TrainResultsPage";
import TrainDetailsPage from "./pages/TrainDetailsPage";
import RoutesPage from "./pages/RoutesPage";
import ServicesPage from "./pages/ServicesPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import NotFoundPage from "./pages/NotFoundPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";

import SeatSelectionPage from "./pages/SeatSelectionPage";
import PassengerDetailsPage from "./pages/PassengerDetailsPage";
import BookingSummaryPage from "./pages/BookingSummaryPage";
import PaymentPage from "./pages/PaymentPage";
import PaymentFailurePage from "./pages/PaymentFailurePage";
import BookingSuccessPage from "./pages/BookingSuccessPage";
import TicketPage from "./pages/TicketPage";

import ProfilePage from "./pages/ProfilePage";
import MyBookingsPage from "./pages/MyBookingsPage";

import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import TrainManagement from "./pages/admin/TrainManagement";
import StationManagement from "./pages/admin/StationManagement";
import RouteManagement from "./pages/admin/RouteManagement";
import CoachManagement from "./pages/admin/CoachManagement";
import SeatManagement from "./pages/admin/SeatManagement";
import BookingManagement from "./pages/admin/BookingManagement";
import UserManagement from "./pages/admin/UserManagement";

/**
 * App — the route tree.
 *
 * Public pages sit under MainLayout (navbar + footer). The booking flow and the
 * account area are wrapped in ProtectedRoute. The admin area additionally
 * requires the ADMIN role.
 *
 * NOTE: the role check is a UI guard only — the backend does not authenticate
 * requests, so it is not a security boundary. See the project report.
 */

const App = () => (
  <Routes>
    {/* ---------- Public ---------- */}
    <Route element={<MainLayout />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/trains" element={<TrainResultsPage />} />
      <Route path="/trains/:trainId" element={<TrainDetailsPage />} />
      <Route path="/routes" element={<RoutesPage />} />
      <Route path="/services" element={<ServicesPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* ---------- Booking flow (signed in) ---------- */}
      <Route
        path="/booking/seats"
        element={
          <ProtectedRoute>
            <SeatSelectionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/booking/passengers"
        element={
          <ProtectedRoute>
            <PassengerDetailsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/booking/summary"
        element={
          <ProtectedRoute>
            <BookingSummaryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/booking/payment"
        element={
          <ProtectedRoute>
            <PaymentPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/booking/success"
        element={
          <ProtectedRoute>
            <BookingSuccessPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/booking/failure"
        element={
          <ProtectedRoute>
            <PaymentFailurePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ticket/:bookingId"
        element={
          <ProtectedRoute>
            <TicketPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Route>

    {/* ---------- Account area (signed in) ---------- */}
    <Route
      element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }
    >
      <Route element={<UserLayout />}>
        <Route path="/my-account" element={<ProfilePage />} />
        <Route path="/my-bookings" element={<MyBookingsPage />} />
      </Route>
    </Route>

    {/* ---------- Admin area (ADMIN role) ---------- */}
    <Route
      element={
        <ProtectedRoute requireAdmin>
          <MainLayout />
        </ProtectedRoute>
      }
    >
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="trains" element={<TrainManagement />} />
        <Route path="stations" element={<StationManagement />} />
        <Route path="routes" element={<RouteManagement />} />
        <Route path="coaches" element={<CoachManagement />} />
        <Route path="seats" element={<SeatManagement />} />
        <Route path="bookings" element={<BookingManagement />} />
        <Route path="users" element={<UserManagement />} />
      </Route>
    </Route>
  </Routes>
);

export default App;
