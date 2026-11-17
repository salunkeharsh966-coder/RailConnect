import api from "./api";

/**
 * POST /api/bookings?userId=&trainId=
 * Body: { journeyDate, classType, totalPassengers }
 *
 * The backend computes the fare, generates the PNR and sets the status to
 * PENDING_PAYMENT. Never send totalAmount or pnr from the client.
 */
export const createBooking = async (userId, trainId, booking) => {
  const response = await api.post("/api/bookings", booking, {
    params: { userId, trainId },
  });
  return response.data;
};

/** GET /api/bookings/{id} */
export const getBookingById = async (id) => {
  const response = await api.get(`/api/bookings/${id}`);
  return response.data;
};

/** GET /api/bookings/pnr/{pnr} */
export const getBookingByPnr = async (pnr) => {
  const response = await api.get(`/api/bookings/pnr/${pnr}`);
  return response.data;
};

/** GET /api/bookings/my?userId= */
export const getMyBookings = async (userId) => {
  const response = await api.get("/api/bookings/my", { params: { userId } });
  return Array.isArray(response.data) ? response.data : [];
};

/** PUT /api/bookings/{id}/cancel */
export const cancelBooking = async (id) => {
  const response = await api.put(`/api/bookings/${id}/cancel`);
  return response.data;
};

/* ---------- Admin ---------- */

/** GET /api/admin/bookings */
export const getAllBookings = async () => {
  const response = await api.get("/api/admin/bookings");
  return Array.isArray(response.data) ? response.data : [];
};

/** GET /api/admin/bookings/{id} */
export const getAdminBookingById = async (id) => {
  const response = await api.get(`/api/admin/bookings/${id}`);
  return response.data;
};

/** PUT /api/admin/bookings/{id}/cancel */
export const adminCancelBooking = async (id) => {
  const response = await api.put(`/api/admin/bookings/${id}/cancel`);
  return response.data;
};
