import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Armchair,
  Clock,
  Info,
  TrainFront,
  Container,
} from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import Button from "../components/common/Button";
import Loader from "../components/common/Loader";
import ErrorState from "../components/common/ErrorState";
import EmptyState from "../components/common/EmptyState";
import { useStations } from "../context/StationContext";
import { useBooking } from "../context/BookingContext";
import { useToast } from "../context/ToastContext";
import { getTrainById } from "../services/trainService";
import { getTrainRoute } from "../services/trainStopService";
import { getCoachesByTrain } from "../services/coachService";
import {
  boardingTime,
  classifyRoute,
  destinationTime,
  resolveJourney,
} from "../utils/routeUtils";
import { availableClasses, totalSeats } from "../utils/coachUtils";
import { describeJourney, formatTime12 } from "../utils/timeUtils";
import { CLASS_LABEL } from "../utils/constants";
import { formatDateLong } from "../utils/dateUtils";

/**
 * TrainDetailsPage.
 *
 * Shows the train's real route as a timeline, marks the boarding and
 * destination stops, and lists only the travel classes that actually exist on
 * this train (derived from its real coach records).
 */

const TrainDetailsPage = () => {
  const { trainId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getStationById, loading: stationsLoading } = useStations();
  const { setJourney } = useBooking();

  const fromId = searchParams.get("from");
  const toId = searchParams.get("to");
  const date = searchParams.get("date") || "";

  const [train, setTrain] = useState(null);
  const [route, setRoute] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedClass, setSelectedClass] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [trainData, routeData, coachData] = await Promise.all([
        getTrainById(trainId),
        getTrainRoute(trainId),
        getCoachesByTrain(trainId),
      ]);
      setTrain(trainData);
      setRoute(routeData);
      setCoaches(coachData);
    } catch (err) {
      setError(err.message || "Unable to load this train");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainId]);

  const fromStation = fromId ? getStationById(fromId) : null;
  const toStation = toId ? getStationById(toId) : null;

  const journey =
    fromStation && toStation
      ? resolveJourney(route, fromStation.id, toStation.id)
      : { valid: false, fromStop: null, toStop: null, reason: null };

  const classes = availableClasses(coaches);
  const timeline = journey.valid
    ? classifyRoute(route, journey.fromStop.stopOrder, journey.toStop.stopOrder)
    : [];

  const dep = journey.valid ? boardingTime(journey.fromStop) : null;
  const arr = journey.valid ? destinationTime(journey.toStop) : null;
  const info = describeJourney(dep, arr);

  const proceed = () => {
    if (!selectedClass) {
      toast.error("Please choose a travel class to continue.");
      return;
    }

    const chosen = classes.find((c) => c.code === selectedClass);

    setJourney({
      fromStation,
      toStation,
      journeyDate: date,
      train,
      fromStop: journey.fromStop,
      toStop: journey.toStop,
    });

    const params = new URLSearchParams({
      from: String(fromStation.id),
      to: String(toStation.id),
      date,
      class: selectedClass,
      coach: String(chosen?.coaches?.[0]?.id ?? ""),
    });

    navigate(`/booking/seats?${params.toString()}`);
  };

  if (loading || stationsLoading) {
    return (
      <div className="container">
        <Loader message="Loading train details…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <ErrorState message={error} onRetry={load} />
      </div>
    );
  }

  if (!train) {
    return (
      <div className="container">
        <EmptyState
          icon={TrainFront}
          title="Train not found"
          message="This train does not exist or has been removed."
        />
      </div>
    );
  }

  return (
    <div className="container">
      <PageHeader
        title={train.trainName}
        subtitle={`#${train.trainNumber}${date ? ` · ${formatDateLong(date)}` : ""}`}
        crumbs={[
          { label: "Home", to: "/" },
          { label: "Search trains", to: "/trains" },
          { label: "Train details" },
        ]}
      />

      {!journey.valid && fromStation && toStation && (
        <div className="alert alert-warning" role="alert">
          <Info size={17} aria-hidden="true" />
          <div>
            <strong>This train does not cover your journey.</strong>
            <p>{journey.reason}</p>
          </div>
        </div>
      )}

      <div className="details-grid">
        <div className="details-main">
          {journey.valid && (
            <section className="card card-pad">
              <h2 className="card-title">Your journey</h2>
              <div className="journey-summary">
                <div className="timing-block">
                  <span className="timing-time">{formatTime12(dep)}</span>
                  <span className="timing-station">
                    {journey.fromStop.station?.stationName}
                  </span>
                  <span className="text-xs text-muted">
                    Stop {journey.fromStop.stopOrder}
                  </span>
                </div>
                <div className="timing-mid">
                  <span className="timing-duration">
                    <Clock size={13} aria-hidden="true" /> {info.duration}
                  </span>
                  <span className="timing-line" aria-hidden="true" />
                </div>
                <div className="timing-block is-end">
                  <span className="timing-time">
                    {formatTime12(arr)}
                    {info.nextDay && <sup className="next-day">+1</sup>}
                  </span>
                  <span className="timing-station">
                    {journey.toStop.station?.stationName}
                  </span>
                  <span className="text-xs text-muted">
                    Stop {journey.toStop.stopOrder}
                  </span>
                </div>
              </div>
            </section>
          )}

          <section className="card card-pad">
            <h2 className="card-title">
              <Container size={18} aria-hidden="true" /> Route &amp; stops
            </h2>

            {route.length === 0 && (
              <p className="text-sm text-muted">
                No stops are configured for this train.
              </p>
            )}

            {route.length > 0 && (
              <ol className="timeline">
                {(journey.valid ? timeline : route).map((stop, index) => (
                  <li
                    key={stop.id ?? index}
                    className={`timeline-item ${
                      stop.role ? `is-${stop.role}` : ""
                    }`}
                  >
                    <span className="timeline-dot" aria-hidden="true" />
                    <div className="timeline-body">
                      <div className="timeline-station">
                        <strong>{stop.station?.stationName}</strong>
                        <span className="mono text-xs text-muted">
                          {stop.station?.stationCode}
                        </span>
                        {stop.role === "boarding" && (
                          <span className="badge badge-royal">Boarding</span>
                        )}
                        {stop.role === "destination" && (
                          <span className="badge badge-success">
                            Destination
                          </span>
                        )}
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
          </section>
        </div>

        <aside className="details-side">
          <section className="card card-pad">
            <h2 className="card-title">
              <Armchair size={18} aria-hidden="true" /> Choose your class
            </h2>

            {classes.length === 0 && (
              <p className="text-sm text-muted">
                No reservable coaches are configured on this train yet.
              </p>
            )}

            {classes.length > 0 && (
              <div className="class-list">
                {classes.map((cls) => (
                  <button
                    key={cls.code}
                    type="button"
                    className={`class-option ${
                      selectedClass === cls.code ? "is-selected" : ""
                    }`}
                    onClick={() => setSelectedClass(cls.code)}
                    aria-pressed={selectedClass === cls.code}
                  >
                    <span className="class-code">{cls.code}</span>
                    <span className="class-info">
                      <strong>{CLASS_LABEL[cls.code] || cls.code}</strong>
                      <span className="text-xs text-muted">
                        {cls.coaches.length} coach
                        {cls.coaches.length === 1 ? "" : "es"} ·{" "}
                        {totalSeats(cls.coaches)} seats
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            <Button
              variant="primary"
              block
              iconRight={ArrowRight}
              className="mt-4"
              disabled={!journey.valid || classes.length === 0}
              onClick={proceed}
            >
              Choose seats
            </Button>

            {!journey.valid && (
              <p className="text-xs text-muted mt-3">
                Seat selection is only available when this train covers your
                chosen journey.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
};

export default TrainDetailsPage;
