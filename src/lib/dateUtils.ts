/**
 * Returns the "active day" date as YYYY-MM-DD in the user's LOCAL timezone.
 *
 * Key rules:
 * - Always uses the device's local timezone (never UTC)
 * - 1 AM cutoff: if it's between midnight and 1 AM, treat it as still the
 *   previous day. Late-night logging stays on the same day as dinner.
 *
 * This fixes two bugs:
 * 1. Convex runs in UTC — logging at 9 PM ET would hit UTC next-day without this
 * 2. Tyler's request: day resets at 1 AM local time, not midnight
 */
export function getLocalDateString(now?: Date): string {
  const d = now || new Date();

  // If it's before 1 AM local time, treat it as still yesterday
  const hours = d.getHours();
  const effectiveDate = hours < 1 ? new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1) : d;

  const year = effectiveDate.getFullYear();
  const month = String(effectiveDate.getMonth() + 1).padStart(2, "0");
  const day = String(effectiveDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Format a Date object to YYYY-MM-DD using LOCAL timezone (not UTC).
 * Safe to use instead of d.toISOString().split('T')[0] which uses UTC.
 */
export function dateToLocalStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
