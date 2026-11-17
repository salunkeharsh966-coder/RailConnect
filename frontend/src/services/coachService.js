import api from "./api";

/** GET /api/coaches/train/{trainId} */
export const getCoachesByTrain = async (trainId) => {
  const response = await api.get(`/api/coaches/train/${trainId}`);
  return Array.isArray(response.data) ? response.data : [];
};

/** GET /api/coaches */
export const getAllCoaches = async () => {
  const response = await api.get("/api/coaches");
  return Array.isArray(response.data) ? response.data : [];
};

/** GET /api/coaches/{coachId} */
export const getCoachById = async (coachId) => {
  const response = await api.get(`/api/coaches/${coachId}`);
  return response.data;
};

/* ---------- Admin ---------- */

/** POST /api/coaches?trainId= */
export const addCoach = async (trainId, coach) => {
  const response = await api.post("/api/coaches", coach, {
    params: { trainId },
  });
  return response.data;
};

/** POST /api/coaches/train/{trainId}/formation/{formationType} */
export const createFormation = async (trainId, formationType) => {
  const response = await api.post(
    `/api/coaches/train/${trainId}/formation/${formationType}`
  );
  return response.data;
};

/** PUT /api/coaches/{coachId} */
export const updateCoach = async (coachId, coach) => {
  const response = await api.put(`/api/coaches/${coachId}`, coach);
  return response.data;
};

/** DELETE /api/coaches/{coachId} */
export const deleteCoach = async (coachId) => {
  const response = await api.delete(`/api/coaches/${coachId}`);
  return response.data;
};
