import { useCallback, useEffect, useRef, useState } from "react";
import {
  checkSeatAvailability,
  getReservationsByTrainAndDate,
} from "../services/journeySeatService";
import { overlaps } from "../utils/routeUtils";

/**
 * useSeatAvailability.
 *
 * Journey-wise availability. Coach-level seatStatus is NOT enough: the same
 * seat can be free on one segment and taken on another.
 *
 * Strategy:
 *  1. Bulk-load every reservation for the train + journey date (one request).
 *  2. Compute availability locally with the SAME overlap predicate the backend
 *     uses, so the grid renders instantly.
 *  3. Re-check the specific seats against the server before booking — the
 *     server remains the source of truth.
 */

export const useSeatAvailability = ({
  trainId,
  journeyDate,
  fromStopOrder,
  toStopOrder,
}) => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const load = useCallback(async () => {
    if (!trainId || !journeyDate) return;

    const id = ++requestId.current;
    setLoading(true);
    setError("");

    try {
      const data = await getReservationsByTrainAndDate(trainId, journeyDate);
      if (id === requestId.current) setReservations(data);
    } catch (err) {
      if (id === requestId.current) {
        setError(err.message || "Unable to load seat availability");
        setReservations([]);
      }
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [trainId, journeyDate]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Is a seat free for the requested segment, judged from the bulk data?
   * Mirrors JourneySeatReservationRepository.findOverlappingReservations.
   */
  const isAvailableLocally = useCallback(
    (seatId) => {
      if (!fromStopOrder || !toStopOrder) return true;
      return !reservations.some(
        (r) =>
          String(r?.seat?.id) === String(seatId) &&
          overlaps(r, fromStopOrder, toStopOrder)
      );
    },
    [reservations, fromStopOrder, toStopOrder]
  );

  /**
   * Authoritative per-seat check against the backend. Used right before the
   * booking is created, so a seat taken in the meantime is caught.
   */
  const verifySeatOnServer = useCallback(
    async (seatId) => {
      if (!trainId || !journeyDate || !fromStopOrder || !toStopOrder) {
        return true;
      }
      return checkSeatAvailability({
        trainId,
        seatId,
        journeyDate,
        fromStopOrder,
        toStopOrder,
      });
    },
    [trainId, journeyDate, fromStopOrder, toStopOrder]
  );

  /**
   * Re-verify a whole selection. Returns the ids that are no longer free.
   */
  const verifySelection = useCallback(
    async (seatIds) => {
      const taken = [];
      for (const seatId of seatIds) {
        // eslint-disable-next-line no-await-in-loop
        const ok = await verifySeatOnServer(seatId);
        if (!ok) taken.push(seatId);
      }
      return taken;
    },
    [verifySeatOnServer]
  );

  return {
    reservations,
    loading,
    error,
    reload: load,
    isAvailableLocally,
    verifySeatOnServer,
    verifySelection,
  };
};

export default useSeatAvailability;
