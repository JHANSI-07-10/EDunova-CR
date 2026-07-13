export function isValidEmail(email) {
  if (!email) return false;
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(email);
}

export function isValidPhone(phone) {
  if (!phone) return false;
  // Standard phone pattern: 7-15 digits, allowing optional leading '+', spaces, or dashes
  const re = /^\+?[0-9\s-]{7,15}$/;
  return re.test(phone);
}

export function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isPositiveNumber(value) {
  const num = Number(value);
  return !isNaN(num) && num > 0;
}

export function isNonNegativeNumber(value) {
  const num = Number(value);
  return !isNaN(num) && num >= 0;
}

export function isValidDateRange(startDate, endDate) {
  if (!startDate || !endDate) return false;
  const start = new Date(startDate);
  const end = new Date(endDate);
  return !isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start;
}
