export function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export function currentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export function isValidEmail(value, required = false) {
  if (!value) return !required;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isDigitsOnly(value) {
  return /^\d+$/.test(value);
}

export function isTodayOrPast(value) {
  return Boolean(value) && value <= todayDate();
}

export function isTodayOrFuture(value) {
  return Boolean(value) && value >= todayDate();
}

export function isCurrentOrFutureTime(dateValue, timeValue) {
  if (!dateValue || !timeValue) return false;
  if (dateValue > todayDate()) return true;
  if (dateValue < todayDate()) return false;
  return timeValue >= currentTime();
}
