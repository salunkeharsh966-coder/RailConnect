import { useCallback, useState } from "react";
import { searchTrains } from "../services/trainService";
import { getTrainRoute } from "../services/trainStopService";
import { resolveJourney } from "../utils/routeUtils";

/**
 * useTrainSearch.
 *
 * Runs the real search endpoint, then RE-VALIDATES every result against the
 * train's actual route. A train is only kept when both stations exist as stops
 * with the boarding stop strictly before the destination stop.
 *
 * This is what stops trains with missing or incomplete route data (e.g. a
 * train with a single stop, or none at all) from being shown as valid journeys.
 */

export const useTrainSearch = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [skipped, setSkipped] = useState(0);

  const run = useCallback(async (fromStation, toStation) => {
    setLoading(true);
    setError("");
    setResults([]);
    setSkipped(0);
    setSearched(true);

    try {
      const trains = await searchTrains(
        fromStation.stationName,
        toStation.stationName
      );

      if (!trains.length) {
        setResults([]);
        return [];
      }

      // Fetch every route in parallel, then validate.
      const withRoutes = await Promise.all(
        trains.map(async (train) => {
          try {
            const route = await getTrainRoute(train.id);
            const journey = resolveJourney(
              route,
              fromStation.id,
              toStation.id
            );
            return { train, route, journey };
          } catch {
            return {
              train,
              route: [],
              journey: {
                valid: false,
                fromStop: null,
                toStop: null,
                reason: "Route could not be loaded.",
              },
            };
          }
        })
      );

      const valid = withRoutes.filter((item) => item.journey.valid);
      setSkipped(withRoutes.length - valid.length);
      setResults(valid);
      return valid;
    } catch (err) {
      setError(err.message || "Unable to search trains");
      setResults([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResults([]);
    setError("");
    setSearched(false);
    setSkipped(0);
  }, []);

  return { results, loading, error, searched, skipped, run, reset };
};

export default useTrainSearch;
