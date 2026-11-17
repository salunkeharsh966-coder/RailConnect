/**
 * Route helpers.
 *
 * The backend's train search can return a train whose route does not actually
 * contain both stations in the right order (or has no stops at all). Every
 * result must be re-validated against the real route before it is shown.
 */

/** Sort a route by stopOrder ascending. */
export const sortRoute = (route) =>
  (Array.isArray(route) ? [...route] : []).sort(
    (a, b) => Number(a.stopOrder) - Number(b.stopOrder)
  );

/**
 * Find the stop for a station id in a route.
 * Returns the stop object or null.
 */
export const findStopByStationId = (route, stationId) => {
  if (!stationId) return null;
  return (
    sortRoute(route).find(
      (stop) => String(stop?.station?.id) === String(stationId)
    ) || null
  );
};

/**
 * Validate that a route contains both stations with the boarding stop
 * strictly before the destination stop.
 *
 * Returns { valid, fromStop, toStop, reason }.
 */
export const resolveJourney = (route, fromStationId, toStationId) => {
  const sorted = sortRoute(route);

  if (sorted.length < 2) {
    return {
      valid: false,
      fromStop: null,
      toStop: null,
      reason: "This train has no usable route data.",
    };
  }

  const fromStop = findStopByStationId(sorted, fromStationId);
  const toStop = findStopByStationId(sorted, toStationId);

  if (!fromStop) {
    return {
      valid: false,
      fromStop: null,
      toStop,
      reason: "The boarding station is not on this train's route.",
    };
  }

  if (!toStop) {
    return {
      valid: false,
      fromStop,
      toStop: null,
      reason: "The destination station is not on this train's route.",
    };
  }

  if (Number(fromStop.stopOrder) >= Number(toStop.stopOrder)) {
    return {
      valid: false,
      fromStop,
      toStop,
      reason: "The boarding station comes after the destination on this route.",
    };
  }

  return { valid: true, fromStop, toStop, reason: null };
};

/**
 * The departure time to show for a journey: the boarding stop's own
 * departure, falling back to its arrival when it is the first stop and has
 * no departure recorded.
 */
export const boardingTime = (fromStop) =>
  fromStop?.departureTime || fromStop?.arrivalTime || null;

/**
 * The arrival time to show for a journey: the destination stop's own
 * arrival, falling back to its departure when it is the last stop and has
 * no arrival recorded.
 */
export const destinationTime = (toStop) =>
  toStop?.arrivalTime || toStop?.departureTime || null;

/**
 * Classify each stop of a route for the timeline UI.
 * Returns the route with an added `role` of "boarding" | "destination" |
 * "intermediate".
 */
export const classifyRoute = (route, fromStopOrder, toStopOrder) =>
  sortRoute(route).map((stop) => {
    let role = "intermediate";
    if (Number(stop.stopOrder) === Number(fromStopOrder)) role = "boarding";
    else if (Number(stop.stopOrder) === Number(toStopOrder))
      role = "destination";
    return { ...stop, role };
  });

/**
 * Does an existing reservation overlap a requested segment?
 * Mirrors JourneySeatReservationRepository.findOverlappingReservations:
 *   existing.fromStopOrder < requested.toStopOrder
 *   AND existing.toStopOrder > requested.fromStopOrder
 * and only CONFIRMED / PENDING reservations block a seat.
 */
export const overlaps = (existing, fromStopOrder, toStopOrder) => {
  const status = String(existing?.reservationStatus ?? "").toUpperCase();
  if (status !== "CONFIRMED" && status !== "PENDING") return false;
  return (
    Number(existing.fromStopOrder) < Number(toStopOrder) &&
    Number(existing.toStopOrder) > Number(fromStopOrder)
  );
};
