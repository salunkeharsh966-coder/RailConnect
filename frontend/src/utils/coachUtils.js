import { NON_RESERVABLE_COACH_TYPES } from "./constants";

/**
 * Coach helpers that mirror the backend's own reservability rules
 * (BookingService.isReservableCoach) so the UI never offers a class the
 * server would reject.
 */

const normalise = (value) =>
  String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s_-]/g, "");

/** Is this coach bookable? */
export const isReservableCoach = (coach) => {
  if (!coach) return false;

  // reservationAllowed === false means explicitly not reservable.
  if (coach.reservationAllowed === false) return false;

  const category = coach.coachCategory
    ? String(coach.coachCategory).trim().toUpperCase()
    : null;
  if (category && category !== "PASSENGER") return false;

  const type = normalise(coach.coachType);
  if (!type) return false;

  return !NON_RESERVABLE_COACH_TYPES.includes(type);
};

/** Normalise a class code the way the backend does. */
export const normaliseClass = (value) => {
  const v = normalise(value);
  switch (v) {
    case "SL":
    case "SLEEPER":
      return "SL";
    case "1A":
    case "ACFIRST":
    case "FIRSTAC":
    case "FIRSTCLASSAC":
      return "1A";
    case "2A":
    case "AC2TIER":
    case "SECONDAC":
      return "2A";
    case "3A":
    case "AC3TIER":
    case "THIRDAC":
      return "3A";
    case "CC":
    case "CHAIRCAR":
      return "CC";
    case "EC":
    case "EXECUTIVECHAIRCAR":
      return "EC";
    case "2S":
    case "SECONDSITTING":
    case "SECONDSEATING":
      return "2S";
    default:
      return v;
  }
};

/** Only the reservable coaches of a train. */
export const reservableCoaches = (coaches) =>
  (Array.isArray(coaches) ? coaches : []).filter(isReservableCoach);

/**
 * Distinct travel classes actually present on a train, in a sensible order.
 * Returns [{ code, coaches: [...] }].
 */
export const availableClasses = (coaches) => {
  const order = ["1A", "2A", "3A", "EC", "CC", "SL", "2S"];
  const map = new Map();

  for (const coach of reservableCoaches(coaches)) {
    const code = normaliseClass(coach.coachType);
    if (!code) continue;
    if (!map.has(code)) map.set(code, []);
    map.get(code).push(coach);
  }

  return [...map.entries()]
    .map(([code, list]) => ({
      code,
      coaches: list.sort(
        (a, b) => (a.coachPosition ?? 999) - (b.coachPosition ?? 999)
      ),
    }))
    .sort((a, b) => {
      const ia = order.indexOf(a.code);
      const ib = order.indexOf(b.code);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
};

/** Total configured seats across a set of coaches. */
export const totalSeats = (coaches) =>
  (Array.isArray(coaches) ? coaches : []).reduce(
    (sum, c) => sum + (Number(c?.totalSeats) || 0),
    0
  );
