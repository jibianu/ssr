/**
 * Resolve displayable event time from API payload.
 * Backend stores free-text timing in `timeing` (legacy typo); templates use `startTime`.
 */
export function eventTimingLooksLikeTime(value: string | null | undefined): boolean {
  if (value == null || typeof value !== 'string') {
    return false;
  }
  const v = value.trim();
  if (!v) {
    return false;
  }
  if (/^\d+$/.test(v)) {
    return false;
  }
  return /[\d:]/.test(v) || /\b(am|pm|a\.m\.|p\.m\.)\b/i.test(v);
}

export function resolveEventStartTime(event: {
  startTime?: string | null;
  StartTime?: string | null;
  timeing?: string | null;
  Timeing?: string | null;
} | null | undefined): string | null {
  if (!event) {
    return null;
  }
  const explicit = event.startTime ?? event.StartTime;
  if (explicit?.trim()) {
    return explicit.trim();
  }
  const timeing = event.timeing ?? event.Timeing;
  return eventTimingLooksLikeTime(timeing) ? String(timeing).trim() : null;
}
