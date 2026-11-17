import api from "./api";

/** GET /api/admin/users */
export const getAllUsers = async () => {
  const response = await api.get("/api/admin/users");
  return Array.isArray(response.data) ? response.data : [];
};

/** GET /api/admin/users/{id} */
export const getUserById = async (id) => {
  const response = await api.get(`/api/admin/users/${id}`);
  return response.data;
};

/** DELETE /api/admin/users/{id} */
export const deleteUser = async (id) => {
  const response = await api.delete(`/api/admin/users/${id}`);
  return response.data;
};
