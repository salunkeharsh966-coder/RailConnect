import api from "./api";

/** GET /api/stations — the full dataset (~4,100 rows). Fetched once, cached. */
export const getAllStations = async () => {
  const response = await api.get("/api/stations");
  return Array.isArray(response.data) ? response.data : [];
};

/** GET /api/stations/{id} */
export const getStationById = async (id) => {
  const response = await api.get(`/api/stations/${id}`);
  return response.data;
};

/** GET /api/stations/code/{code} */
export const getStationByCode = async (code) => {
  const response = await api.get(`/api/stations/code/${code}`);
  return response.data;
};

/** GET /api/stations/search?name= — fallback when the bulk load fails. */
export const searchStationsByName = async (name) => {
  const response = await api.get("/api/stations/search", {
    params: { name },
  });
  return Array.isArray(response.data) ? response.data : [];
};

/** GET /api/stations/city/{city} */
export const getStationsByCity = async (city) => {
  const response = await api.get(`/api/stations/city/${city}`);
  return Array.isArray(response.data) ? response.data : [];
};

/* ---------- Admin ---------- */

/** POST /api/stations */
export const addStation = async (station) => {
  const response = await api.post("/api/stations", station);
  return response.data;
};

/** PUT /api/stations/{id} */
export const updateStation = async (id, station) => {
  const response = await api.put(`/api/stations/${id}`, station);
  return response.data;
};

/** DELETE /api/stations/{id} */
export const deleteStation = async (id) => {
  const response = await api.delete(`/api/stations/${id}`);
  return response.data;
};
