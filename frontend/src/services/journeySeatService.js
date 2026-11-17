import api from "./api";

/**
 * GET /api/journey-seat-reservations/availability
 *
 * IMPORTANT: this endpoint returns PLAIN TEXT, not JSON:
 *   "Seat is AVAILABLE for this journey segment."
 *   "Seat is NOT AVAILABLE for this journey segment."
 *
 * "NOT AVAILABLE" also contains the substring "AVAILABLE", so the check
 * must be a prefix test, never an includes() test.
 */
export const checkSeatAvailability = async ({
  trainId,
  seatId,
  journeyDate,
  fromStopOrder,
  toStopOrder,
}) => {
  const response = await api.get("/api/journey-seat-reservations/availability", {
    params: { trainId, seatId, journeyDate, fromStopOrder, toStopOrder },
    responseType: "text",
    transformResponse: [(data) => data],
  });

  const text = String(response.data ?? "");
  return text.trim().startsWith("Seat is AVAILABLE");
};

/**
 * POST /api/journey-seat-reservations?bookingId=&seatId=&fromStopOrder=&toStopOrder=
 * Reserves one specific seat for one passenger. Requires a CONFIRMED booking.
 */
export const reserveSeat = async ({
  bookingId,
  seatId,
  fromStopOrder,
  toStopOrder,
}) => {
  const response = await api.post("/api/journey-seat-reservations", null, {
    params: { bookingId, seatId, fromStopOrder, toStopOrder },
  });
  return response.data;
};

/**
 * POST /api/journey-seat-reservations/auto-allocate?bookingId=&fromStopOrder=&toStopOrder=
 * Allocates seats for every unassigned passenger. Requires a CONFIRMED booking.
 */
export const autoAllocateSeats = async ({
  bookingId,
  fromStopOrder,
  toStopOrder,
}) => {
  const response = await api.post(
    "/api/journey-seat-reservations/auto-allocate",
    null,
    { params: { bookingId, fromStopOrder, toStopOrder } }
  );
  return Array.isArray(response.data) ? response.data : [];
};

/** GET /api/journey-seat-reservations/booking/{bookingId} */
export const getReservationsByBooking = async (bookingId) => {
  const response = await api.get(
    `/api/journey-seat-reservations/booking/${bookingId}`
  );
  return Array.isArray(response.data) ? response.data : [];
};

/** GET /api/journey-seat-reservations/train/{trainId}?journeyDate= */
export const getReservationsByTrainAndDate = async (trainId, journeyDate) => {
  const response = await api.get(
    `/api/journey-seat-reservations/train/${trainId}`,
    { params: { journeyDate } }
  );
  return Array.isArray(response.data) ? response.data : [];
};
