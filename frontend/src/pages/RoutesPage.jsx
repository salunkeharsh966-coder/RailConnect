import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Route, TrainFront } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import Loader from "../components/common/Loader";
import ErrorState from "../components/common/ErrorState";
import EmptyState from "../components/common/EmptyState";
import { getAllTrains } from "../services/trainService";
import { getTrainRoute } from "../services/trainStopService";
import { sortRoute } from "../utils/routeUtils";
import { formatTime12 } from "../utils/timeUtils";

/**
 * RoutesPage — browse every train and its real route.
 *
 * Routes are loaded lazily: the list of trains comes first, and each train's
 * stops are fetched only when its card is expanded.
 */

const RoutesPage = () => {
  const [trains, setTrains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);
  const [routes, setRoutes] = useState({});
  const [routeLoading, setRouteLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAllTrains();
      setTrains(data);
    } catch (err) {
      setError(err.message || "Unable to load trains");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (trainId) => {
    if (openId === trainId) {
      setOpenId(null);
      return;
    }

    setOpenId(trainId);

    if (routes[trainId]) return;

    setRouteLoading(true);
    try {
      const route = await getTrainRoute(trainId);
      setRoutes((prev) => ({ ...prev, [trainId]: sortRoute(route) }));
    } catch {
      setRoutes((prev) => ({ ...prev, [trainId]: [] }));
    } finally {
      setRouteLoading(false);
    }
  };

  return (
    <div className="container">
      <PageHeader
        title="Train routes"
        subtitle="Every train in the system and the stops it actually makes."
        crumbs={[{ label: "Home", to: "/" }, { label: "Train Routes" }]}
      />

      {loading && <Loader message="Loading trains…" />}

      {!loading && error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && trains.length === 0 && (
        <EmptyState
          icon={TrainFront}
          title="No trains available"
          message="The train list is empty. An administrator can add trains from the admin dashboard."
        />
      )}

      {!loading && !error && trains.length > 0 && (
        <div className="route-list">
          {trains.map((train) => {
            const isOpen = openId === train.id;
            const route = routes[train.id];

            return (
              <article key={train.id} className="card route-row">
                <button
                  type="button"
                  className="route-row-head"
                  onClick={() => toggle(train.id)}
                  aria-expanded={isOpen}
                >
                  <span className="route-row-icon" aria-hidden="true">
                    <TrainFront size={18} />
                  </span>
                  <span className="route-row-main">
                    <strong>{train.trainName}</strong>
                    <span className="mono text-sm text-muted">
                      #{train.trainNumber}
                    </span>
                  </span>
                  <span className="route-row-ends">
                    {train.sourceStation?.stationName || "—"}
                    <ArrowRight size={14} aria-hidden="true" />
                    {train.destinationStation?.stationName || "—"}
                  </span>
                  <span
                    className={`chev ${isOpen ? "is-open" : ""}`}
                    aria-hidden="true"
                  >
                    ▾
                  </span>
                </button>

                {isOpen && (
                  <div className="route-row-body">
                    {routeLoading && !route && (
                      <Loader message="Loading route…" inline />
                    )}

                    {route && route.length === 0 && (
                      <p className="text-sm text-muted">
                        No stops are configured for this train yet.
                      </p>
                    )}

                    {route && route.length > 0 && (
                      <ol className="timeline">
                        {route.map((stop, index) => (
                          <li key={stop.id ?? index} className="timeline-item">
                            <span className="timeline-dot" aria-hidden="true" />
                            <div className="timeline-body">
                              <div className="timeline-station">
                                <strong>{stop.station?.stationName}</strong>
                                <span className="mono text-xs text-muted">
                                  {stop.station?.stationCode}
                                </span>
                              </div>
                              <div className="timeline-times">
                                <span>Arr {formatTime12(stop.arrivalTime)}</span>
                                <span>Dep {formatTime12(stop.departureTime)}</span>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}

                    <Link
                      to={`/trains/${train.id}`}
                      className="btn btn-secondary btn-sm mt-4"
                    >
                      <Route size={15} aria-hidden="true" /> View train details
                    </Link>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RoutesPage;
