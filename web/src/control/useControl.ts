// Everything the control panel's tabs and sheets share: the live connection,
// the current config, and the actions that change it.

import { useEffect, useMemo, useState } from "react";
import type { Airport, Bedtime, Config, LocationProfile } from "@shared/index.js";
import { formatLatLon } from "@shared/format.js";
import { geoAvailability, geoErrorMessage } from "../lib/geolocation.js";
import { useStream } from "../lib/useStream.js";
import type { StreamState } from "../lib/connection.js";
import { nextISSPass, type Tle } from "../display/celestial.js";

function phoneTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  } catch {
    return "";
  }
}

export interface Ctl {
  cfg: Config;
  state: StreamState;
  set: (patch: Partial<Config>) => void;
  setBedtime: (patch: Partial<Bedtime>) => void;
  resetAll: () => void;
  nextPass: number | null;
  // location
  geoBusy: boolean;
  geoErr: string | null;
  changeLocation: (q: string) => Promise<void>;
  useCurrentLocation: () => void;
  atCurrent: (p: { lat: number; lon: number }) => boolean;
  switchToProfile: (p: LocationProfile) => void;
  saveCurrentProfile: () => void;
  removeProfile: (id: string) => void;
  centerOnTraffic: () => void;
  // runways
  apBusy: boolean;
  apErr: string | null;
  importAirport: (code: string) => Promise<void>;
  centerOnAirport: () => void;
}

export function useControl(): { ctl: Ctl | null; state: StreamState } {
  const { state, conn } = useStream("control");
  const cfg = state.config;

  const [geoBusy, setGeoBusy] = useState(false);
  const [geoErr, setGeoErr] = useState<string | null>(null);
  const [apBusy, setApBusy] = useState(false);
  const [apErr, setApErr] = useState<string | null>(null);

  const [tles, setTles] = useState<Tle[]>([]);
  useEffect(() => {
    let on = true;
    fetch("/api/tle")
      .then((r) => (r.ok ? r.json() : []))
      .then((t) => on && setTles(t as Tle[]))
      .catch(() => {});
    return () => {
      on = false;
    };
  }, []);
  const nextPass = useMemo(
    () => (tles.length && cfg ? nextISSPass(Date.now(), cfg.centerLat, cfg.centerLon, tles) : null),
    [tles, cfg?.centerLat, cfg?.centerLon],
  );

  if (!cfg) return { ctl: null, state };

  const set = (patch: Partial<Config>) => conn.patchConfig(patch);

  const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const atCurrent = (p: { lat: number; lon: number }) =>
    Math.abs(p.lat - cfg.centerLat) < 1e-4 && Math.abs(p.lon - cfg.centerLon) < 1e-4;

  const ctl: Ctl = {
    cfg,
    state,
    set,
    // Every bedtime edit also records this phone's time zone, so the schedule
    // follows the clock you're setting it by.
    setBedtime: (patch) => set({ bedtime: { ...cfg.bedtime, ...patch, timeZone: phoneTimeZone() } }),
    // Reset everything, but never switch the usage ping back on by surprise.
    resetAll: () => {
      const keepPing = cfg.telemetry;
      conn.resetConfig();
      conn.patchConfig({ telemetry: keepPing });
    },
    nextPass,

    geoBusy,
    geoErr,
    changeLocation: async (q) => {
      if (!q.trim()) return;
      setGeoBusy(true);
      setGeoErr(null);
      try {
        const r = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
        if (!r.ok) {
          setGeoErr(r.status === 404 ? `No match for “${q}”` : "Lookup failed");
          return;
        }
        const hit = (await r.json()) as { lat: number; lon: number; name: string };
        set({ centerLat: hit.lat, centerLon: hit.lon, locationName: hit.name });
      } catch {
        setGeoErr("Lookup failed");
      } finally {
        setGeoBusy(false);
      }
    },
    useCurrentLocation: () => {
      const availability = geoAvailability({
        hasGeolocation: Boolean(navigator.geolocation),
        isSecureContext: window.isSecureContext,
        hostname: window.location.hostname,
      });
      if (!availability.ok) {
        setGeoErr(availability.message);
        return;
      }
      setGeoBusy(true);
      setGeoErr(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          set({ centerLat: pos.coords.latitude, centerLon: pos.coords.longitude, locationName: "Current location" });
          setGeoBusy(false);
        },
        (err) => {
          setGeoBusy(false);
          const insecure = !geoAvailability({
            hasGeolocation: true,
            isSecureContext: window.isSecureContext,
            hostname: window.location.hostname,
          }).ok;
          setGeoErr(geoErrorMessage(err.code, insecure));
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60_000 },
      );
    },
    atCurrent,
    switchToProfile: (p) =>
      set({
        centerLat: p.lat,
        centerLon: p.lon,
        radiusMiles: p.radiusMiles,
        locationName: p.name,
        // Restore the runway overlay saved with the profile (#62).
        ...(p.airport ? { airport: p.airport, showAirport: p.showAirport ?? true } : {}),
      }),
    saveCurrentProfile: () => {
      const name = cfg.locationName?.trim() || formatLatLon(cfg.centerLat, cfg.centerLon);
      const profile: LocationProfile = {
        id: genId(),
        name,
        lat: cfg.centerLat,
        lon: cfg.centerLon,
        radiusMiles: cfg.radiusMiles,
        airport: cfg.airport,
        showAirport: cfg.showAirport,
      };
      const rest = cfg.locationProfiles.filter((p) => !atCurrent(p));
      set({ locationProfiles: [...rest, profile] });
    },
    removeProfile: (id) => set({ locationProfiles: cfg.locationProfiles.filter((p) => p.id !== id) }),
    centerOnTraffic: () => {
      const ac = state.aircraft.filter((a) => a.lat != null && a.lon != null);
      if (!ac.length) return;
      const lat = ac.reduce((s, a) => s + (a.lat as number), 0) / ac.length;
      const lon = ac.reduce((s, a) => s + (a.lon as number), 0) / ac.length;
      set({ centerLat: lat, centerLon: lon, locationName: "Traffic center" });
    },

    apBusy,
    apErr,
    importAirport: async (code) => {
      if (!code.trim()) return;
      setApBusy(true);
      setApErr(null);
      try {
        const r = await fetch(`/api/airport?code=${encodeURIComponent(code.trim())}`);
        const body = (await r.json()) as Airport & { error?: string };
        if (!r.ok) {
          setApErr(body.error ?? "Lookup failed");
          return;
        }
        set({ airport: body, showAirport: true });
      } catch {
        setApErr("Lookup failed");
      } finally {
        setApBusy(false);
      }
    },
    centerOnAirport: () =>
      set({
        centerLat: cfg.airport.lat,
        centerLon: cfg.airport.lon,
        locationName: cfg.airport.fullName ?? cfg.airport.icao,
      }),
  };
  return { ctl, state };
}
