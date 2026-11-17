import api from "./api";

/** GET /api/seats/coach/{coachId} */
export const getSeatsByCoach = async (coachId) => {
  const response = await api.get(`/api/seats/coach/${coachId}`);
  return Array.isArray(response.data) ? response.data : [];
};

/** GET /api/seats */
export const getAllSeats = async () => {
  const response = await api.get("/api/seats");
  return Array.isArray(response.data) ? response.data : [];
};

/** GET /api/seats/{seatId} */
export const getSeatById = async (seatId) => {
  const response = await api.get(`/api/seats/${seatId}`);
  return response.data;
};

/* ---------- Admin ---------- */

/** POST /api/seats/coach/{coachId} */
export const addSeat = async (coachId, seat) => {
  const response = await api.post(`/api/seats/coach/${coachId}`, seat);
  return response.data;
};

/** PUT /api/seats/{seatId} */
export const updateSeat = async (seatId, seat) => {
  const response = await api.put(`/api/seats/${seatId}`, seat);
  return response.data;
};

/** DELETE /api/seats/{seatId} */
export const deleteSeat = async (seatId) => {
  const response = await api.delete(`/api/seats/${seatId}`);
  return response.data;
};

/** POST /api/seats/generate-missing/{coachId} */
export const generateMissingSeats = async (coachId) => {
  const response = await api.post(`/api/seats/generate-missing/${coachId}`);
  return response.data;
};
