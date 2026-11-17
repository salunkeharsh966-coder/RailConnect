import { ArrowRight, CalendarDays, Clock, TrainFront } from "lucide-react";
import { formatDateLong } from "../../utils/dateUtils";
import { describeJourney, formatTime12 } from "../../utils/timeUtils";
import { boardingTime, destinationTime } from "../../utils/routeUtils";
import { CLASS_LABEL } from "../../utils/constants";

/**
 * JourneySummaryCard — a compact recap of the journey, shown across the
 * booking steps so the user always knows what they are booking.
 */

const JourneySummaryCard = ({ draft, travelClass, coach }) => {
  const { train, fromStop, toStop, journeyDate } = draft || {};

  if (!train || !fromStop || !toStop) return null;

  const dep = boardingTime(fromStop);
  const arr = destinationTime(toStop);
  const info = describeJourney(dep, arr);

  return (
    <div className="journey-card">
      <div className="journey-card-top">
        <span className="train-icon" aria-hidden="true">
          <TrainFront size={17} />
        </span>
        <div>
          <strong>{train.trainName}</strong>
          <span className="mono text-xs text-muted">#{train.trainNumber}</span>
        </div>
        {travelClass && (
          <span className="badge badge-royal ml-auto">
            {CLASS_LABEL[travelClass] || travelClass}
          </span>
        )}
      </div>

      <div className="journey-card-route">
        <div className="timing-block">
          <span className="timing-time">{formatTime12(dep)}</span>
          <span className="timing-station">{fromStop.station?.stationName}</span>
        </div>
        <span className="route-arrow" aria-hidden="true">
          <ArrowRight size={15} />
        </span>
        <div className="timing-block is-end">
          <span className="timing-time">
            {formatTime12(arr)}
            {info.nextDay && <sup className="next-day">+1</sup>}
          </span>
          <span className="timing-station">{toStop.station?.stationName}</span>
        </div>
      </div>

      <div className="journey-card-meta">
        <span>
          <CalendarDays size={14} aria-hidden="true" />
          {formatDateLong(journeyDate)}
        </span>
        <span>
          <Clock size={14} aria-hidden="true" />
          {info.duration}
        </span>
        {coach && (
          <span>Coach {coach.coachNumber || coach.coachName || "—"}</span>
        )}
      </div>
    </div>
  );
};

export default JourneySummaryCard;
