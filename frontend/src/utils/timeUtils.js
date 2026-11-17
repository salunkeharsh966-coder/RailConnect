/**
 * Time helpers for train schedules.
 *
 * The backend stores stop times as plain "HH:mm" strings. A journey can cross
 * midnight, so a duration is only meaningful when the day offset is known.
 */

/** "06:00" -> 360 (minutes since midnight). Returns null if unparseable. */
export const toMinutes = (hhmm) => {
  if (!hhmm || typeof hhmm !== "string") return null;
  const match = hhmm.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

/** "06:00" -> "6:00 AM" */
export const formatTime12 = (hhmm) => {
  const mins = toMinutes(hhmm);
  if (mins === null) return hhmm || "—";
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
};

/**
 * Duration between two "HH:mm" times, assuming the arrival is on the same
 * day or the next day (a single midnight crossing). Returns minutes.
 */
export const durationMinutes = (departure, arrival) => {
  const from = toMinutes(departure);
  const to = toMinutes(arrival);
  if (from === null || to === null) return null;
  let diff = to - from;
  if (diff < 0) diff += 24 * 60;
  return diff;
};

/** 375 -> "6h 15m" */
export const formatDuration = (minutes) => {
  if (minutes === null || minutes === undefined) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

/**
 * Does a journey from `departure` to `arrival` cross midnight?
 * Used to show a "+1 day" marker on the arrival time.
 */
export const crossesMidnight = (departure, arrival) => {
  const from = toMinutes(departure);
  const to = toMinutes(arrival);
  if (from === null || to === null) return false;
  return to < from;
};

/** Convenience: duration string plus a +1 marker when it crosses midnight. */
export const describeJourney = (departure, arrival) => {
  const mins = durationMinutes(departure, arrival);
  return {
    duration: formatDuration(mins),
    nextDay: crossesMidnight(departure, arrival),
    minutes: mins,
  };
};
