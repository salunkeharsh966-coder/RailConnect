import api from "./api";

/**
 * GET /api/train-stops/train/{trainId}
 * Returns the route ordered by stopOrder.
 */
export const getTrainRoute = async (trainId) => {
  if (!trainId) {
    throw new Error("Train ID is required to fetch the route.");
  }

  const response = await api.get(`/api/train-stops/train/${trainId}`);
  const route = Array.isArray(response.data) ? response.data : [];

  return route.sort((a, b) => Number(a.stopOrder) - Number(b.stopOrder));
};

/** GET /api/train-stops/{id} */
export const getTrainStopById = async (id) => {
  const response = await api.get(`/api/train-stops/${id}`);
  return response.data;
};

/* ---------- Admin ---------- */

/** POST /api/train-stops?trainId=&stationId= */
export const addTrainStop = async (trainId, stationId, trainStop) => {
  const response = await api.post("/api/train-stops", trainStop, {
    params: { trainId, stationId },
  });
  return response.data;
};

/** PUT /api/train-stops/{id} */
export const updateTrainStop = async (id, trainStop) => {
  const response = await api.put(`/api/train-stops/${id}`, trainStop);
  return response.data;
};

/** DELETE /api/train-stops/{id} */
export const deleteTrainStop = async (id) => {
  const response = await api.delete(`/api/train-stops/${id}`);
  return response.data;
};
