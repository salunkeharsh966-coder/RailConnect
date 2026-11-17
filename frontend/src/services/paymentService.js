import api from "./api";

/**
 * POST /api/payments?bookingId=&paymentMethod=RAZORPAY
 *
 * Returns the backend-created Razorpay order. Throws (HTTP 500) when the
 * Razorpay keys are not configured on the server — the UI must surface that
 * rather than pretending a payment happened.
 */
export const createPayment = async (bookingId, paymentMethod = "RAZORPAY") => {
  const response = await api.post("/api/payments", null, {
    params: { bookingId, paymentMethod },
  });
  return response.data;
};

/**
 * POST /api/payments/verify
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 *
 * This is the ONLY thing that may mark a booking as paid.
 */
export const verifyPayment = async (payload) => {
  const response = await api.post("/api/payments/verify", payload);
  return response.data;
};

/** GET /api/payments/{bookingId} */
export const getPaymentByBookingId = async (bookingId) => {
  const response = await api.get(`/api/payments/${bookingId}`);
  return response.data;
};

/** GET /api/payments */
export const getAllPayments = async () => {
  const response = await api.get("/api/payments");
  return Array.isArray(response.data) ? response.data : [];
};

/** GET /api/payments/{bookingId}/refund-status/refresh */
export const refreshRefundStatus = async (bookingId) => {
  const response = await api.get(
    `/api/payments/${bookingId}/refund-status/refresh`
  );
  return response.data;
};
