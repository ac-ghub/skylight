// Skylight phone app: Home · Sky · Look · Settings, plus pop-up sheets.

import { useEffect, useMemo, useState } from "react";
import { isBedtime } from "@shared/index.js";
import { useControl, type Ctl } from "./useControl.js";
import { overheadPlanes, AVATARS } from "./overhead.js";
import { Slider } from "./components.js";
import {
  DotsIcon, HomeIcon, LocationIcon, LookIcon, PlaneIcon, PowerIcon, SettingsIcon, SkyIcon, SparkleIcon,
} from "./icons.js";
import { SheetHost, type Sheet } from "./Sheets.js";
import { LookTab, SettingsTab, SkyTab } from "./Tabs.js";
import { clock, shortPlace } from "./util.js";
import { useReloadOnUpdate } from "../lib/useReloadOnUpdate.js";

export type Tab = "home" | "sky" | "look" | "settings";
export type OpenSheet = (s: Sheet) => void;

export function App() {
  const { ctl, state } = useControl();
  useReloadOnUpdate(state.version);
  const [tab, setTab] = useState<Tab>("home");
  const [sheet, setSheet] = useState<Sheet>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);

  if (!ctl) {
    return (
      <div className="loading">
        <div className={`dot ${state.connected ? "ok" : "bad"}`} />
        {state.connected ? "Loading…" : "Connecting to Skylight…"}
      </div>
    );
  }

  const go = (t: Tab) => {
    setSheet(null);
    setTab(t);
  };

  return (
    <div className="app">
      <main className="screen">
        {tab === "home" && <HomeTab ctl={ctl} openSheet={setSheet} />}
        {tab === "sky" && <SkyTab ctl={ctl} />}
        {tab === "look" && <LookTab ctl={ctl} />}
        {tab === "settings" && <SettingsTab ctl={ctl} openSheet={setSheet} />}
      </main>

      <nav className="tabbar" aria-label="Sections">
        <TabButton label="Home" active={tab === "home"} onClick={() => go("home")} icon={<HomeIcon />} />
        <TabButton label="Sky" active={tab === "sky"} onClick={() => go("sky")} icon={<SkyIcon />} />
        <TabButton label="Look" active={tab === "look"} onClick={() => go("look")} icon={<LookIcon />} />
        <TabButton label="Settings" active={tab === "settings"} onClick={() => go("settings")} icon={<SettingsIcon />} />
      </nav>

      {sheet && <SheetHost ctl={ctl} sheet={sheet} onClose={() => setSheet(null)} onGo={go} />}
    </div>
  );
}

function TabButton({ label, active, onClick, icon }: { label: string; active: boolean; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button className={`tab ${active ? "active" : ""}`} aria-current={active ? "page" : undefined} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function HomeTab({ ctl, openSheet }: { ctl: Ctl; openSheet: OpenSheet }) {
  const { cfg, state, set } = ctl;
  const planes = useMemo(() => overheadPlanes(state.aircraft, cfg), [state.aircraft, cfg]);
  const focused = cfg.focusHex ? state.aircraft.find((a) => a.hex === cfg.focusHex) : undefined;
  const focusName = focused ? (focused.flight ?? "").trim() || focused.hex.toUpperCase() : "";

  const now = new Date();
  const hour = now.getHours();
  const heading = hour >= 17 || hour < 5 ? "Tonight's skylight" : "Today's skylight";
  const dateLine = now.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });

  const live = state.connected && (state.status?.ok ?? true);
  const bedNow = isBedtime(cfg.bedtime, now);
  const bedTitle = bedNow ? "Bedtime" : "Sky on";
  const bedSub = !cfg.bedtime.enabled
    ? "All night"
    : bedNow
      ? `Back at ${clock(cfg.bedtime.end)}`
      : `Until ${clock(cfg.bedtime.start)}`;

  const maxRadius = Math.max(25, Math.ceil(cfg.radiusMiles));
  const km = (cfg.radiusMiles * 1.609).toFixed(1);

  return (
    <div className="home">
      <svg className="home-stars" aria-hidden="true" width="390" height="240" viewBox="0 0 390 240">
        <g fill="currentColor">
          <circle cx="58" cy="118" r="2.2" /><circle cx="96" cy="76" r="1.6" /><circle cx="322" cy="96" r="2" />
          <circle cx="350" cy="168" r="1.4" /><circle cx="34" cy="176" r="1.4" /><circle cx="300" cy="198" r="1.8" />
          <path d="M286 58l2 5.5 5.5 2-5.5 2-2 5.5-2-5.5-5.5-2 5.5-2z" />
          <path d="M78 150l1.4 4 4 1.4-4 1.4-1.4 4-1.4-4-4-1.4 4-1.4z" />
        </g>
      </svg>

      <div className="home-top">
        <div className="pill">
          <span className={`dot ${live ? "ok" : "bad"}`} />
          {cfg.planetariumMode ? "Stars only" : `${planes.length} overhead`}
        </div>
        <div className="home-top-actions">
          <button className="round-btn" aria-label="Quick controls" onClick={() => openSheet({ kind: "menu" })}>
            <DotsIcon />
          </button>
          <button className="round-btn" aria-label="Shut down Pi" onClick={() => openSheet({ kind: "power" })}>
            <PowerIcon />
          </button>
        </div>
      </div>

      <header className="home-head">
        <h1 className="display">{heading}</h1>
        <p>{dateLine}</p>
      </header>

      <div className="stack">
        {focused && (
          <div className="focus-banner">
            <PlaneIcon size={18} />
            <span>Showing {focusName} on your ceiling</span>
            <button onClick={() => set({ focusHex: "" })}>Stop</button>
          </div>
        )}

        {/* A brief "rate limited, retrying" from the free feed fixes itself; don't alarm anyone. */}
        {state.status && !state.status.ok && !/rate limit/i.test(state.status.message ?? "") && (
          <div className="warn-card">Can't get plane data right now{state.status.message ? `: ${state.status.message}` : ""}</div>
        )}

        <div className="chip-row">
          <button className="info-chip grow" onClick={() => openSheet({ kind: "bedtime" })}>
            <span className="info-chip-icon accent"><SparkleIcon /></span>
            <span className="info-chip-text"><b>{bedTitle}</b><small>{bedSub}</small></span>
          </button>
          <button className="info-chip" onClick={() => openSheet({ kind: "location" })}>
            <span className="info-chip-icon"><LocationIcon /></span>
            <span className="info-chip-text"><b>{shortPlace(cfg.locationName)}</b><small>Change place</small></span>
          </button>
        </div>

        <div className="card sky-size">
          <div className="sky-size-head">
            <label htmlFor="sky-radius-slider">How much sky</label>
            <span className="display-num">{cfg.radiusMiles} mi · {km} km</span>
          </div>
          <Slider id="sky-radius" value={cfg.radiusMiles} min={0.5} max={maxRadius} step={0.5}
            onChange={(v) => set({ radiusMiles: v })} />
          <div className="sky-size-ends"><span>Closer, fewer planes</span><span>Wider, more planes</span></div>
        </div>

        <div className="label-pill">
          <PlaneIcon size={15} />
          OVERHEAD NOW ({cfg.planetariumMode ? 0 : planes.length})
        </div>

        {cfg.planetariumMode ? (
          <div className="empty-card">Planes are hidden while Stars only is on. Turn it off from the ··· menu.</div>
        ) : planes.length === 0 ? (
          <div className="empty-card">No planes inside your circle right now. Slide “How much sky” wider to catch more.</div>
        ) : (
          planes.map((p, i) => {
            const av = AVATARS[i % AVATARS.length];
            return (
              <button key={p.hex} className={`plane-row ${p.hex === cfg.focusHex ? "focused" : ""}`}
                onClick={() => openSheet({ kind: "plane", hex: p.hex })}>
                <span className="avatar" style={{ background: av.bg, color: av.fg }}><PlaneIcon size={20} /></span>
                <span className="plane-row-text"><b>{p.title}</b><small>{p.sub}</small></span>
                <span className="plane-row-dist">{p.distance}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
