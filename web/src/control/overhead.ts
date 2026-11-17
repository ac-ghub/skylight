// "Overhead now": the planes inside your sky circle, nearest first, worded
// for the phone's home screen.

import type { Aircraft, Config } from "@shared/index.js";
import {
  convertDistance,
  formatAltitude,
  formatSpeed,
  llToMeters,
  metersToMiles,
  rangeMeters,
} from "@shared/index.js";

export interface OverheadPlane {
  hex: string;
  ac: Aircraft;
  flight: string;
  title: string;
  sub: string;
  airline: string;
  type: string;
  from: string;
  fromName: string;
  to: string;
  toName: string;
  hasRoute: boolean;
  height: string;
  speed: string;
  distance: string;
  distanceMi: number;
  trend: "climbing" | "descending" | "level" | "on the ground";
  /** Position relative to the centre, metres (east, north). */
  east: number;
  north: number;
  track: number;
}

function trendOf(ac: Aircraft): OverheadPlane["trend"] {
  if (ac.onGround) return "on the ground";
  const r = ac.baroRate ?? 0;
  if (r > 300) return "climbing";
  if (r < -300) return "descending";
  return "level";
}

export function overheadPlanes(aircraft: Aircraft[], cfg: Config, limit = 8): OverheadPlane[] {
  const out: OverheadPlane[] = [];
  for (const ac of aircraft) {
    if (ac.lat == null || ac.lon == null) continue;
    if (cfg.hideOnGround && ac.onGround) continue;
    const altFt = ac.altBaro ?? ac.altGeom ?? null;
    if (altFt != null && !ac.onGround && (altFt < cfg.minAltitudeFt || altFt > cfg.maxAltitudeFt)) continue;
    const m = llToMeters(ac.lat, ac.lon, cfg.centerLat, cfg.centerLon);
    const mi = metersToMiles(rangeMeters(m));
    if (mi > cfg.radiusMiles) continue;

    const flight = (ac.flight ?? "").trim() || (ac.registration ?? "").trim() || ac.hex.toUpperCase();
    const fromName = ac.originName ?? ac.origin ?? "";
    const toName = ac.destName ?? ac.destination ?? "";
    const hasRoute = Boolean(fromName && toName);
    const trend = trendOf(ac);
    const height = ac.onGround ? "ground" : altFt != null ? formatAltitude(altFt, cfg.altitudeUnit) : "height unknown";
    const who = ac.airline ?? ac.typeName ?? ac.typeCode ?? "Unknown aircraft";

    out.push({
      hex: ac.hex,
      ac,
      flight,
      title: hasRoute ? `${flight} · ${fromName} → ${toName}` : flight,
      sub: `${who} · ${height}${trend === "level" || trend === "on the ground" ? "" : ` · ${trend}`}`,
      airline: ac.airline ?? "",
      type: ac.typeName ?? ac.typeCode ?? "",
      from: ac.origin ?? "",
      fromName,
      to: ac.destination ?? "",
      toName,
      hasRoute,
      height,
      speed: ac.gs != null ? formatSpeed(ac.gs, cfg.speedUnit) : "—",
      distance: `${convertDistance(mi, cfg.distanceUnit).toFixed(1)} ${cfg.distanceUnit}`,
      distanceMi: mi,
      trend,
      east: m.east,
      north: m.north,
      track: ac.track ?? 0,
    });
  }
  out.sort((a, b) => a.distanceMi - b.distanceMi);
  return out.slice(0, limit);
}

/** Soft avatar colours, cycled down the list. */
export const AVATARS = [
  { bg: "#24213A", fg: "#CFC6FF" },
  { bg: "#3A2620", fg: "#FFB79C" },
  { bg: "#16302A", fg: "#8FE0C2" },
  { bg: "#1D2A3D", fg: "#9CC9F5" },
];
