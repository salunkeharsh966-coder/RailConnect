import axios from "axios";

/**
 * Centralised Axios instance for the RailConnect frontend.
 *
 * The backend has NO JWT / Spring Security. Authentication is a plain
 * `userId` query parameter on the endpoints that need it, so there is no
 * Authorization header to attach. The logged-in user is read from
 * localStorage and exposed via `getCurrentUserId()` for services that
 * must pass it.
 */

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

const USER_KEY = "railconnect_user";

export const getStoredUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const getCurrentUserId = () => getStoredUser()?.id ?? null;

/** Normalise any backend error into a single readable message. */
export const extractErrorMessage = (error) => {
  if (!error) return "Something went wrong";

  if (error.code === "ECONNABORTED") {
    return "The request timed out. Please check your connection and try again.";
  }

  if (!error.response) {
    return (
      "Cannot reach the RailConnect server. Make sure the backend is " +
      "running and VITE_API_BASE_URL points to it."
    );
  }

  const { status, data } = error.response;

  // Backend error shapes: {message}, {error, message}, or a bare string.
  let message = null;
  if (typeof data === "string" && data.trim()) {
    message = data;
  } else if (data && typeof data === "object") {
    message = data.message || data.error || null;
  }

  if (message) return message;

  switch (status) {
    case 400:
      return "The request was rejected. Please check the details and try again.";
    case 401:
      return "Your session has expired. Please sign in again.";
    case 403:
      return "You do not have permission to do that.";
    case 404:
      return "We could not find what you were looking for.";
    case 409:
      return "That action conflicts with the current state. Please refresh.";
    case 500:
      return "The server ran into a problem. Please try again shortly.";
    default:
      return `Request failed (HTTP ${status}).`;
  }
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const normalised = new Error(extractErrorMessage(error));
    normalised.status = error.response?.status ?? null;
    normalised.original = error;
    return Promise.reject(normalised);
  }
);

export { BASE_URL };
export default api;
