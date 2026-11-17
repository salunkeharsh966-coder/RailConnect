import api from "./api";

/**
 * GET /api/trains/search?source=&destination=
 *
 * The backend merges a direct source/destination match with a route
 * (train_stops) match. Results are NOT guaranteed to be valid journeys,
 * so callers must re-validate against the route before displaying.
 */
export const searchTrains = async (source, destination) => {
  const response = await api.get("/api/trains/search", {
    params: { source, destination },
  });
  return Array.isArray(response.data) ? response.data : [];
};

/** GET /api/trains */
export const getAllTrains = async () => {
  const response = await api.get("/api/trains");
  return Array.isArray(response.data) ? response.data : [];
};

/** GET /api/trains/{id} */
export const getTrainById = async (id) => {
  const response = await api.get(`/api/trains/${id}`);
  return response.data;
};

/* ---------- Admin ---------- */

/** POST /api/admin/trains */
export const addTrain = async (train) => {
  const response = await api.post("/api/admin/trains", train);
  return response.data;
};

/** PUT /api/admin/trains/{id} */
export const updateTrain = async (id, train) => {
  const response = await api.put(`/api/admin/trains/${id}`, train);
  return response.data;
};

/** DELETE /api/admin/trains/{id} */
export const deleteTrain = async (id) => {
  const response = await api.delete(`/api/admin/trains/${id}`);
  return response.data;
};
