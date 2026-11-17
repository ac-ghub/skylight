// Sky · Look · Settings tabs. Every setting from the old single-page panel
// lives in one of these (or in a sheet), none dropped.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { ShowFields } from "@shared/index.js";
import {
  convertAltitude, convertAltitudeToFt, round,
} from "@shared/index.js";
import { CONSTELLATIONS } from "@shared/stars.js";
import { labelLines } from "../display/renderer.js";
import type { Ctl } from "./useControl.js";
import type { OpenSheet } from "./App.js";
import { clock, shortPlace } from "./util.js";
import { ColorRow, Row, Section, Segmented, Slider, TextInput, Toggle } from "./components.js";
import { ChevronIcon, PowerIcon, SatelliteIcon } from "./icons.js";

function TabHead({ title, sub }: { title: string; sub: string }) {
  return (
    <header className="tab-head">
      <h1 className="display">{title}</h1>
      <p>{sub}</p>
    </header>
  );
}

/** A section whose body opens on tap, for the long tail of settings. */
function Fold({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="section">
      <button className="fold-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>{title}</span>
        <span className={`fold-chev ${open ? "open" : ""}`}><ChevronIcon /></span>
      </button>
      {open && <div className="section-body">{children}</div>}
    </section>
  );
}

function fmtIn(ms: number): string {
  const m = Math.max(0, Math.round(ms / 60000));
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function skyTimeLabel(offsetMin: number): string {
  if (offsetMin === 0) return "Live";
  const d = new Date(Date.now() + offsetMin * 60000);
  return d.toLocaleString("en-AU", { weekday: "short", hour: "numeric", minute: "2-digit" });
}

// ---------------------------------------------------------------- Sky

export function SkyTab({ ctl }: { ctl: Ctl }) {
  const { cfg, set, nextPass } = ctl;
  const jumped = nextPass != null && cfg.skyTimeOffsetMin !== 0;
  return (
    <div className="tab-page">
      <TabHead title="Sky" sub="What shows behind the planes" />

      {nextPass && (
        <div className="iss-card">
          <SatelliteIcon size={26} />
          <div className="grow">
            <b>Next ISS pass · {new Date(nextPass).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}</b>
            <small>In {fmtIn(nextPass - Date.now())}</small>
          </div>
          <button onClick={() => set({ skyTimeOffsetMin: jumped ? 0 : Math.round((nextPass - Date.now()) / 60000) })}>
            {jumped ? "Back to live" : "Jump to it"}
          </button>
        </div>
      )}

      <Section title="Sky layers">
        <Row label="Stars" hint="Real stars at their true positions">
          <Toggle value={cfg.showStars} onChange={(v) => set({ showStars: v })} />
        </Row>
        {cfg.showStars && (
          <>
            <Row label="Star density" hint="more = fainter stars too" indent>
              <Slider id="starMagLimit" value={cfg.starMagLimit} min={1} max={4} step={0.1}
                onChange={(v) => set({ starMagLimit: v })} />
            </Row>
            <Row label="Star names" hint="higher = more names" indent>
              <Slider id="starLabelMagLimit" value={cfg.starLabelMagLimit} min={0} max={3} step={0.1}
                onChange={(v) => set({ starLabelMagLimit: v })} />
            </Row>
          </>
        )}
        <Row label="Moon" hint="Shape and position for tonight">
          <Toggle value={cfg.showMoon} onChange={(v) => set({ showMoon: v })} />
        </Row>
        <Row label="Sun" hint="Only shows during the day">
          <Toggle value={cfg.showSun} onChange={(v) => set({ showSun: v })} />
        </Row>
        <Row label="Planets" hint="Venus, Jupiter, Mars and more">
          <Toggle value={cfg.showPlanets} onChange={(v) => set({ showPlanets: v })} />
        </Row>
        <Row label="Satellites & ISS" hint="Moving dots, the ISS is labelled">
          <Toggle value={cfg.showSatellites} onChange={(v) => set({ showSatellites: v })} />
        </Row>
        {cfg.showSatellites && (
          <Row label="Name every satellite" indent>
            <Toggle value={cfg.satelliteLabels} onChange={(v) => set({ satelliteLabels: v })} />
          </Row>
        )}
        <Row label="Stars only" hint="Hide planes, planetarium mode">
          <Toggle value={cfg.planetariumMode} onChange={(v) => set({ planetariumMode: v })} />
        </Row>
      </Section>

      <Section title="Sky time">
        <Row label={skyTimeLabel(cfg.skyTimeOffsetMin)} hint="Scrub the stars forwards or back">
          <Slider id="skyTimeOffsetMin" value={cfg.skyTimeOffsetMin} min={-720} max={720} step={5} unit="min"
            onChange={(v) => set({ skyTimeOffsetMin: v })} />
        </Row>
        {cfg.skyTimeOffsetMin !== 0 && (
          <button className="row-btn" onClick={() => set({ skyTimeOffsetMin: 0 })}>Back to live</button>
        )}
      </Section>

      {cfg.showStars && (
        <Fold title="Constellations">
          {CONSTELLATIONS.map((c) => (
            <Row key={c.id} label={c.name}>
              <Toggle value={cfg.constellations[c.id] !== false}
                onChange={(v) => set({ constellations: { ...cfg.constellations, [c.id]: v } })} />
            </Row>
          ))}
        </Fold>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Look

const FIELD_LABELS: Record<keyof ShowFields, string> = {
  name: "Name",
  type: "Type",
  altitude: "Height",
  speed: "Speed",
  verticalRate: "Climb rate",
  destination: "From / to",
  registration: "Registration",
};

const UNIT_PRESETS = {
  metric: { speedUnit: "kmh", altitudeUnit: "m", distanceUnit: "km" },
  imperial: { speedUnit: "mph", altitudeUnit: "ft", distanceUnit: "mi" },
  aviation: { speedUnit: "kt", altitudeUnit: "ft", distanceUnit: "mi" },
} as const;
type UnitPreset = keyof typeof UNIT_PRESETS | "custom";

export function LookTab({ ctl }: { ctl: Ctl }) {
  const { cfg, set } = ctl;
  const setField = (k: keyof ShowFields, v: boolean) => set({ showFields: { ...cfg.showFields, [k]: v } });
  const preset: UnitPreset =
    (Object.keys(UNIT_PRESETS) as (keyof typeof UNIT_PRESETS)[]).find((k) => {
      const p = UNIT_PRESETS[k];
      return p.speedUnit === cfg.speedUnit && p.altitudeUnit === cfg.altitudeUnit && p.distanceUnit === cfg.distanceUnit;
    }) ?? "custom";

  const preview = labelLines(cfg, {
    hex: "7c6b2d", flight: "QF1", lat: 0, lon: 0, altBaro: 32000, altGeom: 32000, gs: 480, track: 300,
    baroRate: 1200, registration: "VH-OQA", typeCode: "A388", typeName: "Airbus A380", airline: "Qantas",
    origin: "SYD", destination: "LHR", originName: "Sydney", destName: "London",
  });

  return (
    <div className="tab-page">
      <TabHead title="Look" sub="How the ceiling is drawn" />

      <Section title="Style">
        <Row label="Theme">
          <Segmented value={cfg.theme}
            options={[{ value: "ambient", label: "Ambient" }, { value: "telemetry", label: "Telemetry" }, { value: "focus", label: "Focus" }]}
            onChange={(v) => set({ theme: v })} />
        </Row>
        <Row label="Brightness">
          <Slider id="brightness" value={cfg.brightness} min={0.1} max={1} step={0.05} onChange={(v) => set({ brightness: v })} />
        </Row>
        <Row label="Plane size">
          <Slider id="glyphSizePx" value={cfg.glyphSizePx} min={6} max={40} step={1} unit="px" onChange={(v) => set({ glyphSizePx: v })} />
        </Row>
        <Row label="Trail length">
          <Slider id="trailSeconds" value={cfg.trailSeconds} min={0} max={120} step={5} unit="s" onChange={(v) => set({ trailSeconds: v })} />
        </Row>
        <Row label="Colour by height" hint="Low planes warm, high planes cool">
          <Toggle value={cfg.altitudeColor} onChange={(v) => set({ altitudeColor: v })} />
        </Row>
      </Section>

      <Section title="Plane labels">
        <Row label="Which planes">
          <Segmented value={cfg.labelDensity}
            options={[{ value: "all", label: "All" }, { value: "nearestN", label: "Nearest N" }, { value: "nearestOnly", label: "Nearest" }]}
            onChange={(v) => set({ labelDensity: v })} />
        </Row>
        {cfg.labelDensity === "nearestN" && (
          <Row label="How many" indent>
            <Slider id="nearestN" value={cfg.nearestN} min={1} max={20} step={1} onChange={(v) => set({ nearestN: v })} />
          </Row>
        )}
        <div className="plane-preview">
          <div className="chips">
            {(Object.keys(FIELD_LABELS) as (keyof ShowFields)[]).map((k) => (
              <button key={k} className={`chip ${cfg.showFields[k] ? "on" : ""}`} aria-pressed={cfg.showFields[k]}
                onClick={() => setField(k, !cfg.showFields[k])}>
                {FIELD_LABELS[k]}
              </button>
            ))}
          </div>
          <Row label="Name shows">
            <Segmented value={cfg.nameDisplay}
              options={[{ value: "airline", label: "Airline" }, { value: "flight", label: "Flight no." }]}
              onChange={(v) => set({ nameDisplay: v })} />
          </Row>
          <Row label="Places show as">
            <Segmented value={cfg.locationDisplay}
              options={[{ value: "name", label: "Names" }, { value: "iata", label: "Codes" }]}
              onChange={(v) => set({ locationDisplay: v })} />
          </Row>
          <h3 className="plane-preview-title">Preview</h3>
          <div className="plane-preview-card">
            {preview.map((row, i) => {
              const parts = row?.text?.split(/\s{2,}/);
              if (!parts) return null;
              return (
                <div key={i} className={`plane-preview-card-row plane-preview-card-row-${row.kind}`}>
                  {parts.map((t) => <span key={t}>{t}</span>)}
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      <Section title="Units">
        <Row label="Units">
          <Segmented<UnitPreset> value={preset}
            options={[{ value: "metric", label: "Metric" }, { value: "imperial", label: "Imperial" }, { value: "aviation", label: "Aviation" }]}
            onChange={(v) => v !== "custom" && set({ ...UNIT_PRESETS[v] })} />
        </Row>
      </Section>

      <Fold title="Extras on the ceiling">
        <Row label="Range rings"><Toggle value={cfg.rangeRings} onChange={(v) => set({ rangeRings: v })} /></Row>
        <Row label="Compass"><Toggle value={cfg.compass} onChange={(v) => set({ compass: v })} /></Row>
        <Row label="Airport runways" hint={cfg.airport.fullName ?? cfg.airport.icao}>
          <Toggle value={cfg.showAirport} onChange={(v) => set({ showAirport: v })} />
        </Row>
        <Row label="Highlight emergencies"><Toggle value={cfg.highlightEmergency} onChange={(v) => set({ highlightEmergency: v })} /></Row>
        <Row label="On-screen status bar"><Toggle value={cfg.showHud} onChange={(v) => set({ showHud: v })} /></Row>
        <Row label="Arcs toward destination"><Toggle value={cfg.showDestArc} onChange={(v) => set({ showDestArc: v })} /></Row>
        <Row label="Local time & distance at destination"><Toggle value={cfg.showRouteDetail} onChange={(v) => set({ showRouteDetail: v })} /></Row>
      </Fold>

      <Fold title="Colours">
        <div className="palette">
          <ColorRow label="Background" value={cfg.palette.bg} onChange={(v) => set({ palette: { ...cfg.palette, bg: v } })} />
          <ColorRow label="Planes" value={cfg.palette.glyph} onChange={(v) => set({ palette: { ...cfg.palette, glyph: v } })} />
          <ColorRow label="Trails" value={cfg.palette.trail} onChange={(v) => set({ palette: { ...cfg.palette, trail: v } })} />
          <ColorRow label="Accent" value={cfg.palette.accent} onChange={(v) => set({ palette: { ...cfg.palette, accent: v } })} />
          <ColorRow label="Warning" value={cfg.palette.warn} onChange={(v) => set({ palette: { ...cfg.palette, warn: v } })} />
          <ColorRow label="Grid" value={cfg.palette.grid} onChange={(v) => set({ palette: { ...cfg.palette, grid: v } })} />
          <ColorRow label="Text" value={cfg.palette.text} onChange={(v) => set({ palette: { ...cfg.palette, text: v } })} />
        </div>
      </Fold>
    </div>
  );
}

// ---------------------------------------------------------------- Settings

export function SettingsTab({ ctl, openSheet }: { ctl: Ctl; openSheet: OpenSheet }) {
  const { cfg, set, state } = ctl;
  const b = cfg.bedtime;
  return (
    <div className="tab-page">
      <TabHead title="Settings" sub="Set once, then forget" />

      <Section title="Your sky">
        <button className="nav-row" onClick={() => openSheet({ kind: "location" })}>
          <span className="grow">Location</span>
          <span className="muted">{shortPlace(cfg.locationName)}</span>
          <ChevronIcon />
        </button>
        <button className="nav-row" onClick={() => openSheet({ kind: "bedtime" })}>
          <span className="grow">Bedtime</span>
          <span className="muted">{b.enabled ? `${clock(b.start)} – ${clock(b.end)}` : "Off"}</span>
          <ChevronIcon />
        </button>
      </Section>

      <Section title="Line up with the real sky">
        <Row label="Rotation" hint="Turn until planes move the same way as outside">
          <Slider id="rotationDeg" value={cfg.rotationDeg} min={0} max={355} step={5} unit="°" onChange={(v) => set({ rotationDeg: v })} />
        </Row>
        <Row label="Mirror" hint="Flip if planes move the wrong way">
          <Toggle value={cfg.mirrorX} onChange={(v) => set({ mirrorX: v })} />
        </Row>
        <Row label="Mirror vertically" hint="Rarely needed">
          <Toggle value={cfg.mirrorY} onChange={(v) => set({ mirrorY: v })} />
        </Row>
        <Row label="Label rotation" hint="Turns the text only, not the map">
          <Slider id="labelRotationDeg" value={cfg.labelRotationDeg} min={0} max={355} step={5} unit="°" onChange={(v) => set({ labelRotationDeg: v })} />
        </Row>
        <Row label="Projection" hint="Sky = realistic look-up motion">
          <Segmented value={cfg.projectionMode} options={[{ value: "sky", label: "Sky" }, { value: "map", label: "Map" }]}
            onChange={(v) => set({ projectionMode: v })} />
        </Row>
      </Section>

      <Fold title="Which planes to show">
        <Row label="Lowest height" hint="Hide planes below this">
          <Slider id="minAltitudeFt" value={convertAltitude(cfg.minAltitudeFt, cfg.altitudeUnit)} min={0}
            max={convertAltitude(10000, cfg.altitudeUnit)} step={convertAltitude(100, cfg.altitudeUnit)} unit={cfg.altitudeUnit}
            onChange={(v) => set({ minAltitudeFt: round(convertAltitudeToFt(v, cfg.altitudeUnit)) })} />
        </Row>
        <Row label="Highest height">
          <Slider id="maxAltitudeFt" value={convertAltitude(cfg.maxAltitudeFt, cfg.altitudeUnit)}
            min={convertAltitude(1000, cfg.altitudeUnit)} max={convertAltitude(60000, cfg.altitudeUnit)}
            step={convertAltitude(1000, cfg.altitudeUnit)} unit={cfg.altitudeUnit}
            onChange={(v) => set({ maxAltitudeFt: round(convertAltitudeToFt(v, cfg.altitudeUnit)) })} />
        </Row>
        <Row label="Hide planes on the ground">
          <Toggle value={cfg.hideOnGround} onChange={(v) => set({ hideOnGround: v })} />
        </Row>
      </Fold>

      <Fold title="Motion">
        <Row label="Smooth movement"><Toggle value={cfg.interpolate} onChange={(v) => set({ interpolate: v })} /></Row>
        <Row label="Smoothing" hint="0 snap · 1 slow">
          <Slider id="smoothing" value={cfg.smoothing} min={0} max={0.9} step={0.02} onChange={(v) => set({ smoothing: v })} />
        </Row>
        <Row label="Guess ahead for up to">
          <Slider id="maxExtrapolationSec" value={cfg.maxExtrapolationSec} min={0} max={15} step={1} unit="s" onChange={(v) => set({ maxExtrapolationSec: v })} />
        </Row>
        <Row label="Drop a plane after">
          <Slider id="staleSec" value={cfg.staleSec} min={5} max={60} step={1} unit="s" onChange={(v) => set({ staleSec: v })} />
        </Row>
        <Row label="Frame rate cap" hint="0 = no cap">
          <Slider id="maxFps" value={cfg.maxFps} min={0} max={120} step={5} unit="fps" onChange={(v) => set({ maxFps: v })} />
        </Row>
      </Fold>

      <Fold title="Airport runways">
        <Row label="Airport" hint={`${cfg.airport.icao}${cfg.airport.fullName ? ` · ${cfg.airport.fullName}` : ""}`}>
          <div className="loc-bar">
            <TextInput key={cfg.airport.icao} value="" placeholder="code, e.g. SYD" ariaLabel="Import airport runways" onCommit={ctl.importAirport} />
            <button type="button" className="loc-btn" disabled={ctl.apBusy} onClick={ctl.centerOnAirport}>Centre</button>
          </div>
        </Row>
        {ctl.apBusy && <Row label="" hint="Importing runways…"><span /></Row>}
        {ctl.apErr && <Row label="" hint={ctl.apErr}><span /></Row>}
      </Fold>

      <Fold title="Plane data source">
        <Row label="Status" hint={state.status?.message ?? (state.status?.ok ? "Working" : "—")}>
          <span className="muted">{state.status?.source === "radio" ? "Radio" : "Internet"}</span>
        </Row>
        <Row label="Radio URL" hint="dump1090 aircraft.json">
          <TextInput value={cfg.radioUrl} ariaLabel="Radio aircraft JSON URL" onCommit={(v) => v !== cfg.radioUrl && set({ radioUrl: v })} />
        </Row>
        <Row label="Internet URL" hint="aggregator · {lat}/{lon}/{r}">
          <TextInput value={cfg.apiUrl} ariaLabel="Aggregator API URL" onCommit={(v) => v !== cfg.apiUrl && set({ apiUrl: v })} />
        </Row>
      </Fold>

      <Section title="System">
        <Row label="Anonymous usage ping" hint="Once a day: a random id, version, feed type, Pi model. Never your location">
          <Toggle value={cfg.telemetry} onChange={(v) => set({ telemetry: v })} />
        </Row>
        <UpdateRow />
        <button className="nav-row danger" onClick={() => openSheet({ kind: "power" })}>
          <PowerIcon size={18} />
          <span className="grow">Shut down Pi</span>
        </button>
        <button className="nav-row muted-btn" onClick={() => {
          if (window.confirm("Reset every setting to its default? Your location and saved places will be cleared.")) ctl.resetAll();
        }}>
          <span className="grow">Reset all to defaults</span>
        </button>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------- Update now

interface UpdateInfo {
  version: string;
  running: boolean;
  last: string | null;
  unavailable: string | null;
}

function friendlyLast(last: string | null): string {
  if (!last) return "";
  if (last.startsWith("up to date")) return "already up to date";
  if (last.startsWith("updated to")) return last;
  if (last.startsWith("updating")) return "updating";
  if (last.startsWith("install/build failed")) return "last update failed, still on the previous version";
  if (last.startsWith("fetch failed")) return "couldn't reach GitHub last time";
  if (last.startsWith("local changes")) return "skipped: the Pi has local changes";
  return last;
}

/** "Update now": runs the Pi's nightly update on demand. The page reloads
 *  itself once the new version is live (useReloadOnUpdate). */
function UpdateRow() {
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startRef = useRef<{ last: string | null; at: number; sawRunning: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/system/update", { cache: "no-store" });
      if (!r.ok) return;
      const next = (await r.json()) as UpdateInfo;
      setInfo(next);
      const s = startRef.current;
      if (s) {
        if (next.running) s.sawRunning = true;
        const finished = !next.running && (s.sawRunning || next.last !== s.last || Date.now() - s.at > 20_000);
        if (finished) {
          startRef.current = null;
          setBusy(false);
        }
      }
    } catch {
      // The server restarts at the end of an update; keep polling.
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!busy && !info?.running) return;
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [busy, info?.running, load]);

  const start = async () => {
    setError(null);
    setBusy(true);
    startRef.current = { last: info?.last ?? null, at: Date.now(), sawRunning: false };
    try {
      const r = await fetch("/api/system/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "update" }),
      });
      const body = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(body.error ?? `failed (${r.status})`);
      void load();
    } catch (err) {
      startRef.current = null;
      setBusy(false);
      setError(err instanceof Error ? err.message : "couldn't reach the Pi");
    }
  };

  const running = busy || Boolean(info?.running);
  const hint = running
    ? "Updating… usually 5–10 minutes. The ceiling keeps running, and this page refreshes itself when it's done."
    : [
        info ? `Version ${info.version}` : "Checking version…",
        friendlyLast(info?.last ?? null),
        "also checks every night, 4–7 am",
      ].filter(Boolean).join(" · ");

  return (
    <>
      <Row label="Update Skylight" hint={hint}>
        <button className="pill-btn" disabled={running || Boolean(info?.unavailable)} onClick={() => void start()}>
          {running ? "Updating…" : "Update now"}
        </button>
      </Row>
      {(error || info?.unavailable) && (
        <p className="row-note">{error ?? info?.unavailable}</p>
      )}
    </>
  );
}
