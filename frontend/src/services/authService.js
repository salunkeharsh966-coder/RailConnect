import api from "./api";

/** POST /api/auth/register — public registration always creates role USER. */
export const registerUser = async (userData) => {
  const response = await api.post("/api/auth/register", userData);
  return response.data;
};

/** POST /api/auth/login — returns the full User object (id, name, email, role). */
export const loginUser = async (credentials) => {
  const response = await api.post("/api/auth/login", credentials);
  return response.data;
};
