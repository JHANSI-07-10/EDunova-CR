export function isValidEmail(email) {
  if (!email) return false;
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(email);
}

export function isTextOnly(text) {
  if (!text) return false;
  return /^[A-Za-z\s]+$/.test(text);
}

export function isExact10Digits(phone) {
  if (!phone) return false;
  return /^\d{10}$/.test(phone);
}

export function isGmail(email) {
  if (!email) return false;
  return /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email);
}

export function isNumberOnly(value) {
  if (!value) return false;
  return /^\d+$/.test(value);
}

export function isExact12Digits(value) {
  if (!value) return false;
  return /^\d{12}$/.test(value);
}

export function isExact6Digits(value) {
  if (!value) return false;
  return /^\d{6}$/.test(value);
}

export function isValidPercentage(value) {
  if (value === '' || value === null || value === undefined) return false;
  const num = Number(value);
  return !isNaN(num) && num >= 0 && num <= 100;
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
