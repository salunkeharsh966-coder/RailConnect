import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Filter,
  Search,
  TrainFront,
} from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import Button from "../components/common/Button";
import EmptyState from "../components/common/EmptyState";
import ErrorState from "../components/common/ErrorState";
import { SkeletonList } from "../components/common/Skeleton";
import StationAutocomplete from "../components/home/StationAutocomplete";
import { useStations } from "../context/StationContext";
import { useToast } from "../context/ToastContext";
import { useTrainSearch } from "../hooks/useTrainSearch";
import { boardingTime, destinationTime } from "../utils/routeUtils";
import { describeJourney, formatTime12 } from "../utils/timeUtils";
import { formatDateLong, todayISO } from "../utils/dateUtils";
import { validateJourneyDate, validateRoute } from "../utils/validators";

/**
 * TrainResultsPage.
 *
 * Reads the search from the URL (?from=&to=&date=), runs the real search and
 * shows only trains whose route genuinely covers the journey. The URL is the
 * source of truth, so the page survives a refresh and can be shared.
 */

const TrainResultsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getStationById, loading: stationsLoading } = useStations();
  const { results, loading, error, searched, skipped, run } = useTrainSearch();

  const fromId = searchParams.get("from");
  const toId = searchParams.get("to");
  const date = searchParams.get("date") || todayISO();

  const [fromStation, setFromStation] = useState(null);
  const [toStation, setToStation] = useState(null);
  const [journeyDate, setJourneyDate] = useState(date);
  const [formErrors, setFormErrors] = useState({});
  const [sortBy, setSortBy] = useState("departure");

  // Resolve the URL ids into real station records once the dataset is loaded.
  useEffect(() => {
    if (stationsLoading) return;
    if (fromId) setFromStation(getStationById(fromId));
    if (toId) setToStation(getStationById(toId));
  }, [fromId, toId, stationsLoading, getStationById]);

  // Run the search whenever the resolved stations change.
  useEffect(() => {
    if (!fromStation || !toStation) return;
    run(fromStation, toStation);
  }, [fromStation, toStation, run]);

  const sorted = useMemo(() => {
    const list = [...results];
    if (sortBy === "duration") {
      list.sort((a, b) => {
        const da = describeJourney(
          boardingTime(a.journey.fromStop),
          destinationTime(a.journey.toStop)
        ).minutes;
        const db = describeJourney(
          boardingTime(b.journey.fromStop),
          destinationTime(b.journey.toStop)
        ).minutes;
        return (da ?? 1e9) - (db ?? 1e9);
      });
    } else {
      list.sort((a, b) => {
        const ta = boardingTime(a.journey.fromStop) || "99:99";
        const tb = boardingTime(b.journey.fromStop) || "99:99";
        return ta.localeCompare(tb);
      });
    }
    return list;
  }, [results, sortBy]);

  const submit = (e) => {
    e.preventDefault();

    const routeError = validateRoute(fromStation, toStation);
    const dateError = validateJourneyDate(journeyDate);

    const nextErrors = {
      from: !fromStation ? "Please select a boarding station" : "",
      to: !toStation ? "Please select a destination station" : "",
      route: routeError && fromStation && toStation ? routeError : "",
      journeyDate: dateError || "",
    };

    setFormErrors(nextErrors);

    const firstMessage =
      nextErrors.from ||
      nextErrors.to ||
      nextErrors.route ||
      nextErrors.journeyDate;

    if (firstMessage) {
      toast.error(firstMessage);
      return;
    }

    setSearchParams({
      from: String(fromStation.id),
      to: String(toStation.id),
      date: journeyDate,
    });
  };

  const goToTrain = (item) => {
    const params = new URLSearchParams({
      from: String(fromStation.id),
      to: String(toStation.id),
      date: journeyDate,
    });
    navigate(`/trains/${item.train.id}?${params.toString()}`);
  };

  const ready = Boolean(fromStation && toStation);

  return (
    <div className="container">
      <PageHeader
        title="Search trains"
        subtitle={
          ready
            ? `${fromStation.stationName} → ${
                toStation.stationName
              } · ${formatDateLong(journeyDate)}`
            : "Choose your stations and journey date."
        }
        crumbs={[{ label: "Home", to: "/" }, { label: "Search trains" }]}
      />

      <form
        className="card card-pad search-inline"
        onSubmit={submit}
        noValidate
      >
        <div className="search-inline-grid">
          <StationAutocomplete
            label="From"
            value={fromStation}
            onSelect={(s) => {
              setFromStation(s);
              setFormErrors((p) => ({ ...p, from: "", route: "" }));
            }}
            error={formErrors.from || formErrors.route}
            excludeStationId={toStation?.id}
          />
          <StationAutocomplete
            label="To"
            value={toStation}
            onSelect={(s) => {
              setToStation(s);
              setFormErrors((p) => ({ ...p, to: "", route: "" }));
            }}
            error={formErrors.to}
            excludeStationId={fromStation?.id}
          />
          <div className="field">
            <label className="field-label" htmlFor="results-date">
              Journey date
            </label>
            <div className="input-wrap">
              <span className="input-icon" aria-hidden="true">
                <CalendarDays size={17} />
              </span>
              <input
                id="results-date"
                type="date"
                className={`input ${
                  formErrors.journeyDate ? "has-error" : ""
                }`}
                value={journeyDate}
                min={todayISO()}
                onChange={(e) => {
                  setJourneyDate(e.target.value);
                  setFormErrors((p) => ({ ...p, journeyDate: "" }));
                }}
              />
            </div>
            {formErrors.journeyDate && (
              <span className="field-error" role="alert">
                {formErrors.journeyDate}
              </span>
            )}
          </div>
          <Button type="submit" variant="primary" icon={Search}>
            Search
          </Button>
        </div>
      </form>

      {loading && <SkeletonList count={3} />}

      {!loading && error && (
        <ErrorState
          title="Search failed"
          message={error}
          onRetry={() => ready && run(fromStation, toStation)}
        />
      )}

      {!loading && !error && searched && sorted.length === 0 && (
        <EmptyState
          icon={TrainFront}
          title="No trains found for this route"
          message={
            skipped > 0
              ? `The search returned ${skipped} train(s), but none of them actually stop at both stations in the right order. Try a different pair of stations.`
              : "No train in the system runs between these stations. Try a different pair of stations."
          }
          action={
            <Link to="/routes" className="btn btn-secondary">
              Browse all routes
            </Link>
          }
        />
      )}

      {!loading && !error && sorted.length > 0 && (
        <>
          <div className="results-bar">
            <span className="results-count">
              <strong>{sorted.length}</strong> train
              {sorted.length === 1 ? "" : "s"} found
              {skipped > 0 && (
                <span className="text-muted">
                  {" "}
                  · {skipped} hidden (route does not cover this journey)
                </span>
              )}
            </span>

            <label className="sort-control">
              <Filter size={15} aria-hidden="true" />
              <span className="sr-only">Sort by</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="select select-sm"
              >
                <option value="departure">Departure time</option>
                <option value="duration">Journey duration</option>
              </select>
            </label>
          </div>

          <div className="grid">
            {sorted.map((item) => {
              const { train, journey } = item;
              const dep = boardingTime(journey.fromStop);
              const arr = destinationTime(journey.toStop);
              const info = describeJourney(dep, arr);

              return (
                <article key={train.id} className="card train-card">
                  <div className="train-card-head">
                    <div className="train-identity">
                      <span className="train-icon" aria-hidden="true">
                        <TrainFront size={18} />
                      </span>
                      <div>
                        <strong>{train.trainName}</strong>
                        <span className="mono text-sm text-muted">
                          #{train.trainNumber}
                        </span>
                      </div>
                    </div>

                    <div className="train-timing">
                      <div className="timing-block">
                        <span className="timing-time">{formatTime12(dep)}</span>
                        <span className="timing-station">
                          {journey.fromStop.station?.stationName}
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
                      </div>
                    </div>
                  </div>

                  <div className="train-card-foot">
                    <span className="text-sm text-muted">
                      Boarding at stop {journey.fromStop.stopOrder} · alight at
                      stop {journey.toStop.stopOrder}
                    </span>
                    <Button
                      variant="primary"
                      size="sm"
                      iconRight={ArrowRight}
                      onClick={() => goToTrain(item)}
                    >
                      Select seats
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {!loading && !searched && !ready && (
        <EmptyState
          icon={Search}
          title="Start your search"
          message="Pick a boarding station and a destination above to see the trains that actually run between them."
        />
      )}
    </div>
  );
};

export default TrainResultsPage;
