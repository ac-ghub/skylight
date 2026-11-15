// Bedtime schedule: between `start` and `end` the ceiling fades to black
// ("off") or to a soft glow ("dim"), then comes back by itself. Times are
// wall-clock "HH:MM" in `timeZone` (set from the phone that edits the
// schedule), so they stay right even if the Pi's own time zone is wrong.

export type BedtimeMode = "off" | "dim";

export interface Bedtime {
  enabled: boolean;
  /** When bedtime begins, "HH:MM" 24-hour. */
  start: string;
  /** When the sky comes back, "HH:MM" 24-hour. May be "earlier" than start
   *  (an overnight window such as 23:00 → 07:00). */
  end: string;
  mode: BedtimeMode;
  /** Brightness kept during bedtime when mode = "dim", 0.05..0.6. */
  dimLevel: number;
  /** IANA zone the times are in (e.g. "Australia/Sydney"). "" = the display's
   *  own clock. */
  timeZone: string;
}

export const DEFAULT_BEDTIME: Bedtime = {
  enabled: false,
  start: "23:00",
  end: "07:00",
  mode: "off",
  dimLevel: 0.2,
  timeZone: "",
};

export const BEDTIME_DIM_MIN = 0.05;
export const BEDTIME_DIM_MAX = 0.6;

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidHHMM(s: unknown): s is string {
  return typeof s === "string" && HHMM.test(s);
}

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string") return false;
  if (tz === "") return true;
  try {
    new Intl.DateTimeFormat("en-AU", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Minutes past midnight of `date` in `timeZone` ("" = local clock). */
export function minutesOfDay(date: Date, timeZone: string): number {
  if (!timeZone) return date.getHours() * 60 + date.getMinutes();
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return (h % 24) * 60 + m;
}

/** True when `now` falls inside the bedtime window. */
export function isBedtime(b: Bedtime, now: Date): boolean {
  if (!b.enabled || !isValidHHMM(b.start) || !isValidHHMM(b.end)) return false;
  const start = toMinutes(b.start);
  const end = toMinutes(b.end);
  if (start === end) return false; // zero-length window: never
  const tz = isValidTimeZone(b.timeZone) ? b.timeZone : "";
  const t = minutesOfDay(now, tz);
  return start < end ? t >= start && t < end : t >= start || t < end;
}

/** How much of the sky to show right now: 1 = normal, 0 = black. */
export function bedtimeLevel(b: Bedtime, now: Date): number {
  if (!isBedtime(b, now)) return 1;
  if (b.mode === "off") return 0;
  return Math.min(BEDTIME_DIM_MAX, Math.max(BEDTIME_DIM_MIN, b.dimLevel));
}

/** Check a bedtime patch from the control panel. Returns an error message, or
 *  null when it's fine. */
export function bedtimeError(patch: Partial<Bedtime>): string | null {
  if (typeof patch !== "object" || patch === null) return "bedtime must be an object";
  if ("enabled" in patch && typeof patch.enabled !== "boolean") return "bedtime.enabled must be true or false";
  if ("start" in patch && !isValidHHMM(patch.start)) return "bedtime.start must be HH:MM";
  if ("end" in patch && !isValidHHMM(patch.end)) return "bedtime.end must be HH:MM";
  if ("mode" in patch && patch.mode !== "off" && patch.mode !== "dim") return "bedtime.mode must be off or dim";
  if (
    "dimLevel" in patch &&
    (typeof patch.dimLevel !== "number" ||
      !(patch.dimLevel >= BEDTIME_DIM_MIN && patch.dimLevel <= BEDTIME_DIM_MAX))
  ) {
    return `bedtime.dimLevel must be ${BEDTIME_DIM_MIN}..${BEDTIME_DIM_MAX}`;
  }
  if ("timeZone" in patch && !isValidTimeZone(patch.timeZone)) return "bedtime.timeZone is not a known time zone";
  return null;
}
