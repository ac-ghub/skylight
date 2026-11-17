// Pop-up sheets: plane details (Show on ceiling), bedtime, location,
// shut down, quick controls.

import { useEffect, useMemo, useState } from "react";
import { BEDTIME_DIM_MAX, BEDTIME_DIM_MIN, isBedtime } from "@shared/index.js";
import type { Ctl } from "./useControl.js";
import type { Tab } from "./App.js";
import { overheadPlanes, AVATARS } from "./overhead.js";
import { Row, Segmented, Slider, TextInput, TimeInput, Toggle } from "./components.js";
import { CheckCircleIcon, LocationIcon, PlaneIcon, PLANE_PATH } from "./icons.js";

export type Sheet =
  | null
  | { kind: "plane"; hex: string }
  | { kind: "bedtime" }
  | { kind: "location" }
  | { kind: "power" }
  | { kind: "menu" };

const TITLES: Record<NonNullable<Sheet>["kind"], string> = {
  plane: "Plane details",
  bedtime: "Bedtime",
  location: "Location",
  power: "Shut down",
  menu: "Quick controls",
};

export function SheetHost({ ctl, sheet, onClose, onGo }: {
  ctl: Ctl;
  sheet: NonNullable<Sheet>;
  onClose: () => void;
  onGo: (t: Tab) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="sheet-layer">
      <button className="sheet-backdrop" aria-label="Close" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={TITLES[sheet.kind]}>
        <div className="sheet-handle" />
        {sheet.kind === "plane" && <PlaneSheet ctl={ctl} hex={sheet.hex} onClose={onClose} />}
        {sheet.kind === "bedtime" && <BedtimeSheet ctl={ctl} onClose={onClose} />}
        {sheet.kind === "location" && <LocationSheet ctl={ctl} />}
        {sheet.kind === "power" && <PowerSheet onClose={onClose} />}
        {sheet.kind === "menu" && <MenuSheet ctl={ctl} onGo={onGo} />}
      </div>
    </div>
  );
}

function PlaneSheet({ ctl, hex, onClose }: { ctl: Ctl; hex: string; onClose: () => void }) {
  const { cfg, state, set } = ctl;
  // Look the plane up without the radius limit, so the card survives it
  // drifting just outside the circle.
  const all = useMemo(
    () => overheadPlanes(state.aircraft, { ...cfg, radiusMiles: 1e6, minAltitudeFt: -1e6, maxAltitudeFt: 1e6, hideOnGround: false }, 999),
    [state.aircraft, cfg],
  );
  const p = all.find((x) => x.hex === hex);
  const idx = Math.max(0, overheadPlanes(state.aircraft, cfg).findIndex((x) => x.hex === hex));
  const av = AVATARS[idx % AVATARS.length];
  const focused = cfg.focusHex === hex;

  if (!p) {
    return (
      <>
        <h2 className="display sheet-title">Out of range</h2>
        <p className="sheet-lead">This plane has flown out of Skylight's view.</p>
        {focused && <button className="btn primary" onClick={() => set({ focusHex: "" })}>Stop highlighting</button>}
        <button className="btn ghost" onClick={onClose}>Close</button>
      </>
    );
  }

  // Rough ceiling view: your circle, with each plane placed by its offset
  // from the centre, turned and mirrored like the projector.
  const R = 105;
  const radiusM = cfg.radiusMiles * 1609.34;
  const rot = (cfg.rotationDeg * Math.PI) / 180;
  const inCircle = overheadPlanes(state.aircraft, cfg, 20);
  const dots = inCircle.map((q) => {
    let x = q.east;
    const y = q.north;
    if (cfg.mirrorX) x = -x;
    const rx = x * Math.cos(rot) - y * Math.sin(rot);
    const ry = x * Math.sin(rot) + y * Math.cos(rot);
    const s = (R - 12) / radiusM;
    const heading = (cfg.mirrorX ? -q.track : q.track) + cfg.rotationDeg;
    return { hex: q.hex, flight: q.flight, left: R + rx * s, top: R - ry * s, heading, focused: q.hex === cfg.focusHex };
  });

  return (
    <>
      <div className="plane-head">
        <span className="avatar big" style={{ background: av.bg, color: av.fg }}><PlaneIcon size={24} /></span>
        <div>
          <h2 className="display sheet-title tight">{p.flight}</h2>
          <div className="muted">{[p.airline, p.type].filter(Boolean).join(" · ") || "Aircraft"}</div>
        </div>
      </div>

      <div className="route">
        {p.hasRoute ? (
          <>
            <div><div className="display route-code">{p.from || "—"}</div><small>{p.fromName}</small></div>
            <svg aria-hidden="true" width="60" height="16" viewBox="0 0 60 16"><path d="M2 8h50" stroke="#4A4660" strokeWidth="2" strokeDasharray="3 4" /><path d="M50 3l7 5-7 5z" fill="#6F6A86" /></svg>
            <div className="right"><div className="display route-code">{p.to || "—"}</div><small>{p.toName}</small></div>
          </>
        ) : (
          <small>Route not known for this flight</small>
        )}
      </div>

      <div className="stats">
        <div><small>Height</small><b>{p.height}</b></div>
        <div><small>Speed</small><b>{p.speed}</b></div>
        <div><small>From you</small><b>{p.distance}</b></div>
      </div>

      <div className="label-caps">ON YOUR CEILING</div>
      <div className="ceiling" style={{ width: R * 2, height: R * 2 }}>
        <div className="ceiling-ring" />
        {dots.map((d) => (
          <div key={d.hex} className={`ceiling-plane ${d.focused ? "focused" : ""}`} style={{ left: d.left, top: d.top }}>
            {d.focused && <span className="pulse" />}
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 100 100" fill="currentColor"
              style={{ transform: `translate(-50%,-50%) rotate(${d.heading}deg)` }}><path d={PLANE_PATH} /></svg>
            {(d.focused || d.hex === hex) && <span className="ceiling-label">{d.flight}</span>}
          </div>
        ))}
      </div>
      <p className="ceiling-note">
        {focused ? `${p.flight} has a glowing ring and its info card on your ceiling` : "Rough view of your ceiling. Tap below to highlight this plane on the projector."}
      </p>

      {focused ? (
        <button className="btn ghost" onClick={() => set({ focusHex: "" })}>Stop highlighting</button>
      ) : (
        <button className="btn primary" onClick={() => { set({ focusHex: hex }); onClose(); }}>Show on ceiling</button>
      )}
    </>
  );
}

function BedtimeSheet({ ctl, onClose }: { ctl: Ctl; onClose: () => void }) {
  const { cfg, setBedtime } = ctl;
  const b = cfg.bedtime;
  const now = isBedtime(b, new Date());
  return (
    <>
      <h2 className="display sheet-title">Bedtime</h2>
      <p className="sheet-lead">The sky fades out at night and comes back by itself{b.enabled && now ? " · it's bedtime now" : ""}</p>
      <div className="card flush">
        <Row label="Bedtime schedule"><Toggle value={b.enabled} onChange={(v) => setBedtime({ enabled: v })} /></Row>
        <Row label="Lights out at"><TimeInput ariaLabel="Lights out at" value={b.start} onChange={(v) => setBedtime({ start: v })} /></Row>
        <Row label="Sky back on at"><TimeInput ariaLabel="Sky back on at" value={b.end} onChange={(v) => setBedtime({ end: v })} /></Row>
        <Row label="At bedtime" hint="fades gently over a minute">
          <Segmented value={b.mode} options={[{ value: "off", label: "Turn off" }, { value: "dim", label: "Dim" }]}
            onChange={(v) => setBedtime({ mode: v })} />
        </Row>
        {b.mode === "dim" && (
          <Row label="Dim level">
            <Slider id="bedtimeDim" value={b.dimLevel} min={BEDTIME_DIM_MIN} max={BEDTIME_DIM_MAX} step={0.05}
              onChange={(v) => setBedtime({ dimLevel: v })} />
          </Row>
        )}
      </div>
      <button className="btn primary" onClick={onClose}>Done</button>
    </>
  );
}

function LocationSheet({ ctl }: { ctl: Ctl }) {
  const { cfg, state } = ctl;
  return (
    <>
      <h2 className="display sheet-title">Location</h2>
      <p className="sheet-lead">Now: {cfg.locationName || "Unnamed spot"}</p>
      <TextInput key={cfg.locationName} value="" placeholder="Suburb, postcode or airport" ariaLabel="Search for a place"
        onCommit={ctl.changeLocation} />
      <div className="btn-row">
        <button className="chip-btn" disabled={ctl.geoBusy} onClick={ctl.useCurrentLocation}>
          <LocationIcon /> Use my current location
        </button>
        {state.aircraft.length > 0 && (
          <button className="chip-btn" onClick={ctl.centerOnTraffic}>Centre on traffic</button>
        )}
      </div>
      {ctl.geoBusy && <p className="muted small">Looking it up…</p>}
      {ctl.geoErr && <p className="error small">{ctl.geoErr}</p>}

      <div className="label-caps">SAVED PLACES</div>
      <div className="card flush">
        {cfg.locationProfiles.length === 0 && <p className="muted small pad">No saved places yet.</p>}
        {cfg.locationProfiles.map((pr) => (
          <div key={pr.id} className="place-row">
            <button className="place-pick" onClick={() => ctl.switchToProfile(pr)}>
              <b>{pr.name}</b>
              <small>{pr.radiusMiles} mi circle</small>
            </button>
            {ctl.atCurrent(pr) && <span className="accent-text"><CheckCircleIcon /></span>}
            <button className="place-del" aria-label={`Delete ${pr.name}`} onClick={() => ctl.removeProfile(pr.id)}>×</button>
          </div>
        ))}
      </div>
      <button className="btn ghost" onClick={ctl.saveCurrentProfile}>Save this place</button>
    </>
  );
}

function PowerSheet({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<"ask" | "busy" | "done">("ask");
  const [error, setError] = useState<string | null>(null);

  const shutdown = async () => {
    setPhase("busy");
    setError(null);
    try {
      const r = await fetch("/api/system/shutdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "shutdown" }),
      });
      const body = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(body.error ?? `failed (${r.status})`);
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "couldn't reach the Pi");
      setPhase("ask");
    }
  };

  if (phase === "done") {
    return (
      <>
        <h2 className="display sheet-title">Shutting down…</h2>
        <p className="sheet-lead">It's safe to unplug once the green light on the Pi stops flickering, in about 20 seconds. To turn it on again, unplug the power and plug it back in.</p>
        <button className="btn ghost" onClick={onClose}>Close</button>
      </>
    );
  }
  return (
    <>
      <h2 className="display sheet-title">Shut down the Pi?</h2>
      <p className="sheet-lead">The ceiling will go dark. To turn it back on later, unplug the Pi's power and plug it back in.</p>
      {error && <p className="error small">{error}</p>}
      <button className="btn danger" disabled={phase === "busy"} onClick={() => void shutdown()}>
        {phase === "busy" ? "Shutting down…" : "Shut down"}
      </button>
      <button className="btn ghost" onClick={onClose}>Cancel</button>
    </>
  );
}

function MenuSheet({ ctl, onGo }: { ctl: Ctl; onGo: (t: Tab) => void }) {
  const { cfg, set } = ctl;
  return (
    <>
      <h2 className="display sheet-title">Quick controls</h2>
      <div className="card flush">
        <Row label="Stars only" hint="Hide planes for a calm sky">
          <Toggle value={cfg.planetariumMode} onChange={(v) => set({ planetariumMode: v })} />
        </Row>
        <Row label="Brightness">
          <Slider id="menu-brightness" value={cfg.brightness} min={0.1} max={1} step={0.05}
            onChange={(v) => set({ brightness: v })} />
        </Row>
      </div>
      <button className="btn ghost" onClick={() => onGo("settings")}>All settings</button>
    </>
  );
}
