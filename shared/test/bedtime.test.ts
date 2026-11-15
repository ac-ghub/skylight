import { describe, expect, it } from "vitest";
import {
  DEFAULT_BEDTIME,
  DEFAULT_CONFIG,
  bedtimeError,
  bedtimeLevel,
  isBedtime,
  mergeConfig,
  minutesOfDay,
  type Bedtime,
} from "@shared/index.js";

const SYD = "Australia/Sydney";
// 2026-11-15 is daylight time in Sydney (UTC+11).
const sydney = (hhmm: string) => new Date(`2026-11-15T${hhmm}:00+11:00`);
const bed = (p: Partial<Bedtime>): Bedtime => ({ ...DEFAULT_BEDTIME, enabled: true, timeZone: SYD, ...p });

describe("bedtime schedule", () => {
  it("is off by default", () => {
    expect(DEFAULT_CONFIG.bedtime.enabled).toBe(false);
    expect(bedtimeLevel(DEFAULT_CONFIG.bedtime, sydney("23:30"))).toBe(1);
  });

  it("reads the clock in the chosen time zone", () => {
    expect(minutesOfDay(sydney("23:05"), SYD)).toBe(23 * 60 + 5);
    expect(minutesOfDay(new Date("2026-11-15T12:05:00Z"), SYD)).toBe(23 * 60 + 5);
  });

  it("handles an overnight window (23:00 → 07:00)", () => {
    const b = bed({ start: "23:00", end: "07:00" });
    expect(isBedtime(b, sydney("22:59"))).toBe(false);
    expect(isBedtime(b, sydney("23:00"))).toBe(true);
    expect(isBedtime(b, sydney("02:30"))).toBe(true);
    expect(isBedtime(b, sydney("06:59"))).toBe(true);
    expect(isBedtime(b, sydney("07:00"))).toBe(false);
    expect(isBedtime(b, sydney("12:00"))).toBe(false);
  });

  it("handles a same-day window (01:00 → 17:30)", () => {
    const b = bed({ start: "01:00", end: "17:30" });
    expect(isBedtime(b, sydney("00:59"))).toBe(false);
    expect(isBedtime(b, sydney("09:00"))).toBe(true);
    expect(isBedtime(b, sydney("17:30"))).toBe(false);
  });

  it("never runs when start equals end, or when disabled", () => {
    expect(isBedtime(bed({ start: "22:00", end: "22:00" }), sydney("22:00"))).toBe(false);
    expect(isBedtime(bed({ enabled: false }), sydney("23:30"))).toBe(false);
  });

  it("goes black for 'off' and keeps the dim level for 'dim'", () => {
    expect(bedtimeLevel(bed({ mode: "off" }), sydney("23:30"))).toBe(0);
    expect(bedtimeLevel(bed({ mode: "dim", dimLevel: 0.25 }), sydney("23:30"))).toBe(0.25);
    expect(bedtimeLevel(bed({ mode: "dim", dimLevel: 0.25 }), sydney("20:00"))).toBe(1);
  });

  it("rejects bad edits", () => {
    expect(bedtimeError({ start: "25:00" })).toMatch(/start/);
    expect(bedtimeError({ end: "7:00" })).toMatch(/end/);
    expect(bedtimeError({ mode: "sleep" as never })).toMatch(/mode/);
    expect(bedtimeError({ dimLevel: 2 })).toMatch(/dimLevel/);
    expect(bedtimeError({ timeZone: "Mars/Olympus" })).toMatch(/timeZone/);
    expect(bedtimeError({ enabled: true, start: "23:00", end: "07:00", timeZone: SYD })).toBeNull();
  });

  it("keeps the other bedtime fields when only one is changed", () => {
    const base = mergeConfig(DEFAULT_CONFIG, { bedtime: bed({ start: "22:15" }) });
    const next = mergeConfig(base, { bedtime: { end: "06:30" } as Bedtime });
    expect(next.bedtime.start).toBe("22:15");
    expect(next.bedtime.end).toBe("06:30");
    expect(next.bedtime.enabled).toBe(true);
  });
});
