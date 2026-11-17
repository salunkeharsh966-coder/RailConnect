import api from "./api";

/**
 * POST /api/passengers?bookingId=
 * Body: { name, age, gender }
 * Passengers can only be added once the booking row exists.
 */
export const addPassenger = async (bookingId, passenger) => {
  const response = await api.post("/api/passengers", passenger, {
    params: { bookingId },
  });
  return response.data;
};

/** GET /api/passengers/{bookingId} */
export const getPassengersByBooking = async (bookingId) => {
  const response = await api.get(`/api/passengers/${bookingId}`);
  return Array.isArray(response.data) ? response.data : [];
};

/** Add several passengers sequentially, preserving order. */
export const addPassengers = async (bookingId, passengers) => {
  const saved = [];
  for (const passenger of passengers) {
    saved.push(await addPassenger(bookingId, passenger));
  }
  return saved;
};
