/**
 * Shared constants for RailConnect.
 *
 * Class codes and fares mirror the backend exactly
 * (BookingService.validateSupportedClass / getFarePerPassenger).
 * The frontend displays these; it never invents a price.
 */

export const APP_NAME = "RailConnect";
export const APP_TAGLINE = "India's railways, beautifully booked.";

/** Travel classes the backend accepts, with its real per-passenger fares. */
export const TRAVEL_CLASSES = [
  { code: "1A", label: "AC First Class", short: "1A", fare: 2000 },
  { code: "2A", label: "AC 2 Tier", short: "2A", fare: 1500 },
  { code: "3A", label: "AC 3 Tier", short: "3A", fare: 1000 },
  { code: "SL", label: "Sleeper", short: "SL", fare: 500 },
  { code: "CC", label: "AC Chair Car", short: "CC", fare: 400 },
  { code: "EC", label: "Executive Chair Car", short: "EC", fare: 800 },
  { code: "2S", label: "Second Sitting", short: "2S", fare: 200 },
];

export const CLASS_LABEL = Object.fromEntries(
  TRAVEL_CLASSES.map((c) => [c.code, c.label])
);

/**
 * Coach types that are NOT reservable. Mirrors
 * BookingService.isReservableCoach exactly.
 */
export const NON_RESERVABLE_COACH_TYPES = [
  "GEN",
  "GENERAL",
  "GS",
  "UR",
  "EOG",
  "POWER",
  "PC",
  "PANTRY",
  "SLR",
  "LUGGAGE",
  "BRAKE",
  "SERVICE",
];

/** Booking statuses the backend uses. */
export const BOOKING_STATUS = {
  PENDING_PAYMENT: "PENDING_PAYMENT",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
};

/** Max passengers per booking — enforced by BookingService. */
export const MAX_PASSENGERS = 6;
export const MIN_PASSENGERS = 1;

/** Gender values the backend stores. */
export const GENDERS = ["MALE", "FEMALE", "OTHER"];

/** Berth type display labels (values come from the seat records). */
export const BERTH_LABELS = {
  LOWER: "Lower",
  MIDDLE: "Middle",
  UPPER: "Upper",
  SIDE_LOWER: "Side Lower",
  SIDE_UPPER: "Side Upper",
  "SIDE LOWER": "Side Lower",
  "SIDE UPPER": "Side Upper",
  WINDOW: "Window",
  AISLE: "Aisle",
};

/** Booking flow steps, in order. */
export const BOOKING_STEPS = [
  { key: "search", label: "Search" },
  { key: "train", label: "Train" },
  { key: "seats", label: "Seats" },
  { key: "passengers", label: "Passengers" },
  { key: "summary", label: "Review" },
  { key: "payment", label: "Payment" },
];

/** localStorage keys. */
export const STORAGE_KEYS = {
  USER: "railconnect_user",
  BOOKING_DRAFT: "railconnect_booking_draft",
};
