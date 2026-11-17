/**
 * Form validation helpers.
 *
 * Rules mirror the backend's own checks so the user is told about a problem
 * before a request is made, and the server never has to reject it.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Required text field. */
export const required = (value, label = "This field") => {
  if (value === null || value === undefined) return `${label} is required`;
  if (typeof value === "string" && !value.trim()) return `${label} is required`;
  return null;
};

export const validateEmail = (email) => {
  const missing = required(email, "Email");
  if (missing) return missing;
  if (!EMAIL_RE.test(String(email).trim())) {
    return "Enter a valid email address";
  }
  return null;
};

export const validatePassword = (password) => {
  const missing = required(password, "Password");
  if (missing) return missing;
  if (String(password).length < 6) {
    return "Password must be at least 6 characters";
  }
  return null;
};

export const validateConfirmPassword = (password, confirm) => {
  const missing = required(confirm, "Confirm password");
  if (missing) return missing;
  if (password !== confirm) return "Passwords do not match";
  return null;
};

export const validateName = (name) => {
  const missing = required(name, "Name");
  if (missing) return missing;
  const trimmed = String(name).trim();
  if (trimmed.length < 2) return "Name must be at least 2 characters";
  if (trimmed.length > 80) return "Name is too long";
  return null;
};

export const validatePhone = (phone) => {
  if (!phone || !String(phone).trim()) return null; // optional
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 13) {
    return "Enter a valid phone number";
  }
  return null;
};

/** Passenger age: 1–120, matching a realistic rail booking. */
export const validateAge = (age) => {
  if (age === "" || age === null || age === undefined) {
    return "Age is required";
  }
  const n = Number(age);
  if (Number.isNaN(n)) return "Age must be a number";
  if (!Number.isInteger(n)) return "Age must be a whole number";
  if (n < 1) return "Age must be at least 1";
  if (n > 120) return "Age must be 120 or less";
  return null;
};

export const validateGender = (gender) => {
  if (!gender) return "Please select a gender";
  return null;
};

/** Journey date: required, not in the past. */
export const validateJourneyDate = (iso) => {
  const missing = required(iso, "Journey date");
  if (missing) return missing;
  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (String(iso) < todayISO) return "Journey date cannot be in the past";
  return null;
};

/** Source and destination must both be chosen and must differ. */
export const validateRoute = (from, to) => {
  if (!from) return "Please select a boarding station";
  if (!to) return "Please select a destination station";
  if (String(from.id) === String(to.id)) {
    return "Boarding and destination stations must be different";
  }
  return null;
};

/** Run a map of field -> error and return the first message, or null. */
export const firstError = (errors) => {
  const values = Object.values(errors || {}).filter(Boolean);
  return values.length ? values[0] : null;
};
