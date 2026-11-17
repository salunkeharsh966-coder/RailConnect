import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { STORAGE_KEYS } from "../utils/constants";

/**
 * BookingContext — holds the multi-step booking draft so the user never loses
 * what they typed when navigating back and forth between steps.
 *
 * The draft is mirrored into sessionStorage so a refresh mid-flow does not
 * wipe the passenger details.
 */

const BookingContext = createContext(null);

const EMPTY_DRAFT = {
  fromStation: null,
  toStation: null,
  journeyDate: "",
  train: null,
  fromStop: null,
  toStop: null,
  travelClass: "",
  coach: null,
  selectedSeats: [],
  passengers: [],
  booking: null,
};

const readDraft = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.BOOKING_DRAFT);
    if (!raw) return { ...EMPTY_DRAFT };
    return { ...EMPTY_DRAFT, ...JSON.parse(raw) };
  } catch {
    return { ...EMPTY_DRAFT };
  }
};

export const BookingProvider = ({ children }) => {
  const [draft, setDraft] = useState(readDraft);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        STORAGE_KEYS.BOOKING_DRAFT,
        JSON.stringify(draft)
      );
    } catch {
      /* ignore quota / privacy-mode errors */
    }
  }, [draft]);

  /** Merge a partial update into the draft. */
  const updateDraft = useCallback((patch) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  /**
   * Set the journey (search + train + segment) and clear anything downstream
   * that no longer applies.
   */
  const setJourney = useCallback((journey) => {
    setDraft((prev) => ({
      ...prev,
      ...journey,
      travelClass: "",
      coach: null,
      selectedSeats: [],
      passengers: [],
      booking: null,
    }));
  }, []);

  /** Set the class/coach and clear seat + passenger selections. */
  const setClassAndCoach = useCallback((travelClass, coach) => {
    setDraft((prev) => ({
      ...prev,
      travelClass,
      coach,
      selectedSeats: [],
      passengers: [],
      booking: null,
    }));
  }, []);

  const setSelectedSeats = useCallback((seats) => {
    setDraft((prev) => ({ ...prev, selectedSeats: seats }));
  }, []);

  const setPassengers = useCallback((passengers) => {
    setDraft((prev) => ({ ...prev, passengers }));
  }, []);

  const setBooking = useCallback((booking) => {
    setDraft((prev) => ({ ...prev, booking }));
  }, []);

  const resetDraft = useCallback(() => {
    setDraft({ ...EMPTY_DRAFT });
    try {
      sessionStorage.removeItem(STORAGE_KEYS.BOOKING_DRAFT);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({
      draft,
      updateDraft,
      setJourney,
      setClassAndCoach,
      setSelectedSeats,
      setPassengers,
      setBooking,
      resetDraft,
      hasJourney: Boolean(draft.train && draft.fromStop && draft.toStop),
      hasSeats: draft.selectedSeats.length > 0,
      hasPassengers: draft.passengers.length > 0,
    }),
    [
      draft,
      updateDraft,
      setJourney,
      setClassAndCoach,
      setSelectedSeats,
      setPassengers,
      setBooking,
      resetDraft,
    ]
  );

  return (
    <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
  );
};

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error("useBooking must be used inside a BookingProvider");
  }
  return context;
};

export default BookingContext;
