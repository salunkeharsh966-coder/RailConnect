/**
 * Currency helpers. The backend returns fares as plain numbers in INR.
 */

/** 1500 -> "₹1,500" */
export const formatINR = (amount) => {
  const value = Number(amount);
  if (Number.isNaN(value)) return "₹0";
  return `₹${value.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })}`;
};

/** 1500 -> "1,500" (no symbol, for inputs) */
export const formatNumber = (amount) => {
  const value = Number(amount);
  if (Number.isNaN(value)) return "0";
  return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
};

/** Rupees -> paise, for Razorpay amounts. */
export const toPaise = (rupees) => Math.round(Number(rupees) * 100);
