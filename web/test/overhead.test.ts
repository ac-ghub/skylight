import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, mergeConfig, type Aircraft } from "@shared/index.js";
import { overheadPlanes } from "../src/control/overhead.js";

const cfg = mergeConfig(DEFAULT_CONFIG, {
  centerLat: -33.775, centerLon: 151.218, radiusMiles: 5,
  altitudeUnit: "m", distanceUnit: "km", speedUnit: "kmh",
  minAltitudeFt: 0, maxAltitudeFt: 60000, hideOnGround: true,
});
// ~0.009° latitude ≈ 1 km
const ac = (hex: string, dLatKm: number, extra: Partial<Aircraft> = {}): Aircraft => ({
  hex, lat: -33.775 + dLatKm * 0.009, lon: 151.218, altBaro: 10000, ...extra,
});

describe("overheadPlanes", () => {
  it("lists planes inside the circle, nearest first", () => {
    const out = overheadPlanes([ac("far", 6), ac("near", 1), ac("mid", 3)], cfg);
    expect(out.map((p) => p.hex)).toEqual(["near", "mid", "far"]);
  });

  it("leaves out planes beyond the radius, on the ground, or without a position", () => {
    const out = overheadPlanes([
      ac("outside", 20), ac("ground", 1, { onGround: true }), { hex: "nopos" }, ac("ok", 2),
    ], cfg);
    expect(out.map((p) => p.hex)).toEqual(["ok"]);
  });

  it("words the row with route, airline, height and trend in the chosen units", () => {
    const [p] = overheadPlanes([ac("qf1", 1, {
      flight: "QF1  ", airline: "Qantas", originName: "Sydney", destName: "London", baroRate: 1500, gs: 480,
    })], cfg);
    expect(p.title).toBe("QF1 · Sydney → London");
    expect(p.sub).toMatch(/^Qantas · 3,048 m · climbing$/);
    expect(p.distance).toMatch(/km$/);
  });

  it("respects the height filters", () => {
    const strict = { ...cfg, minAltitudeFt: 20000 };
    expect(overheadPlanes([ac("low", 1, { altBaro: 5000 })], strict)).toHaveLength(0);
  });
});
