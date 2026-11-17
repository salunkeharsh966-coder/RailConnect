import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getAllStations } from "../services/stationService";

/**
 * StationContext.
 *
 * GET /api/stations returns the whole dataset (~4,100 rows, ~2 MB). It is
 * fetched ONCE here and filtered in memory, so typing in the autocomplete
 * never hits the network.
 */

const StationContext = createContext(null);

export const StationProvider = ({ children }) => {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAllStations();
      setStations(data);
    } catch (err) {
      setError(err.message || "Unable to load stations");
      setStations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Filter stations by name, code or city. Case-insensitive, prefix matches
   * ranked above substring matches.
   */
  const searchStations = useCallback(
    (query, limit = 8) => {
      const q = String(query ?? "").trim().toLowerCase();
      if (!q) return [];

      const prefix = [];
      const contains = [];

      for (const station of stations) {
        const name = String(station.stationName ?? "").toLowerCase();
        const code = String(station.stationCode ?? "").toLowerCase();
        const city = String(station.city ?? "").toLowerCase();

        if (code === q || name.startsWith(q) || city.startsWith(q)) {
          prefix.push(station);
        } else if (name.includes(q) || city.includes(q) || code.includes(q)) {
          contains.push(station);
        }

        if (prefix.length >= limit) break;
      }

      return [...prefix, ...contains].slice(0, limit);
    },
    [stations]
  );

  const getStationById = useCallback(
    (id) => stations.find((s) => String(s.id) === String(id)) || null,
    [stations]
  );

  const value = useMemo(
    () => ({
      stations,
      loading,
      error,
      reload: load,
      searchStations,
      getStationById,
      count: stations.length,
    }),
    [stations, loading, error, load, searchStations, getStationById]
  );

  return (
    <StationContext.Provider value={value}>{children}</StationContext.Provider>
  );
};

export const useStations = () => {
  const context = useContext(StationContext);
  if (!context) {
    throw new Error("useStations must be used inside a StationProvider");
  }
  return context;
};

export default StationContext;
