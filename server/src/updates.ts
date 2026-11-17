// "Update now" from the control panel: runs the same skylight-update.service
// the nightly timer runs (fetch → build → restart), so nobody has to wait for
// 4–7 am. Also reports the running version so pages can reload themselves
// once a new build is live.

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const UNIT = "skylight-update.service";
const SYSTEMCTL = "/usr/bin/systemctl";
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function run(cmd: string, args: string[]): Promise<{ ok: boolean; out: string }> {
  return new Promise((done) => {
    execFile(cmd, args, { timeout: 10_000 }, (err, stdout, stderr) =>
      done({ ok: !err, out: String(stdout || stderr || "").trim() }),
    );
  });
}

/** The running build's version (git short hash), read once at startup so it
 *  only changes when the server restarts onto a new build. */
export async function readVersion(): Promise<string> {
  const r = await run("git", ["-C", REPO, "rev-parse", "--short", "HEAD"]);
  return r.ok && r.out ? r.out : "unknown";
}

/** Why "Update now" can't run here, or null when it can. */
export async function updateUnavailable(): Promise<string | null> {
  if (process.platform !== "linux") return "Updating only works on the Raspberry Pi.";
  if (existsSync("/.dockerenv")) return "Updating isn't available when Skylight runs in Docker.";
  if (!existsSync(`/etc/systemd/system/${UNIT}`)) return "This Skylight wasn't installed with self-updates.";
  const check = await run("sudo", ["-n", "-l", SYSTEMCTL, "start", "--no-block", UNIT]);
  if (!check.ok) return "This Pi needs a password to update, so the button can't do it.";
  return null;
}

/** Start the update in the background (it restarts this server when done). */
export async function startUpdate(): Promise<{ ok: boolean; error?: string }> {
  const r = await run("sudo", ["-n", SYSTEMCTL, "start", "--no-block", UNIT]);
  return r.ok ? { ok: true } : { ok: false, error: r.out || "couldn't start the update" };
}

export interface UpdateStatus {
  running: boolean;
  /** Last line the update job logged, e.g. "up to date (1607e59)". */
  last: string | null;
}

export async function updateStatus(): Promise<UpdateStatus> {
  if (process.platform !== "linux") return { running: false, last: null };
  const active = await run(SYSTEMCTL, ["is-active", UNIT]);
  const running = active.out === "activating" || active.out === "active";
  const log = await run("journalctl", ["-u", UNIT, "-n", "30", "--no-pager", "-o", "cat"]);
  const lines = log.ok
    ? log.out.split("\n").map((l) => l.trim()).filter((l) => /^(up to date|updating|updated to|install\/build failed|fetch failed|local changes)/.test(l))
    : [];
  return { running, last: lines.length ? lines[lines.length - 1] : null };
}
