/**
 * Date helpers.
 *
 * All journey dates are handled as plain "yyyy-MM-dd" strings so the value
 * that goes into an <input type="date"> is exactly what the backend receives.
 * No UTC conversion is ever applied to a journey date — that is what causes
 * off-by-one-day bugs for Indian local dates.
 */

/** Today as yyyy-MM-dd in the browser's local timezone. */
export const todayISO = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

/** Add days to a yyyy-MM-dd string, returning yyyy-MM-dd. */
export const addDaysISO = (iso, days) => {
  const [y, m, d] = String(iso).split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
};

/** Is a yyyy-MM-dd string strictly before today? */
export const isPastDate = (iso) => {
  if (!iso) return false;
  return String(iso) < todayISO();
};

/** "2026-11-20" -> "Fri, 20 Nov 2026" */
export const formatDateLong = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = String(iso).split("-").map(Number);
  if (!y || !m || !d) return String(iso);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/** "2026-11-20" -> "20 Nov" */
export const formatDateShort = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = String(iso).split("-").map(Number);
  if (!y || !m || !d) return String(iso);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

/** ISO datetime -> "20 Nov 2026, 3:40 pm" */
export const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

/** Days between today and a journey date (negative = past). */
export const daysUntil = (iso) => {
  if (!iso) return null;
  const [y, m, d] = String(iso).split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86400000);
};
