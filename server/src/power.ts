// "Shut down Pi" from the control panel, so the Pi can be powered off safely
// without a keyboard. Uses passwordless sudo (the Raspberry Pi OS default for
// the first user, which the installer already relies on). Turn the button off
// with SKYLIGHT_ALLOW_SHUTDOWN=0 in the service environment.

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";

const POWEROFF = ["/usr/bin/systemctl", "poweroff"];

function run(cmd: string, args: string[]): Promise<{ ok: boolean; stderr: string }> {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: 10_000 }, (err, _stdout, stderr) =>
      resolve({ ok: !err, stderr: String(stderr ?? "").trim() }),
    );
  });
}

/** Why shutdown can't run here, or null when it can. */
export async function shutdownUnavailable(): Promise<string | null> {
  if (process.env.SKYLIGHT_ALLOW_SHUTDOWN === "0") {
    return "Shut down is turned off on this Skylight.";
  }
  if (process.platform !== "linux") return "Shut down only works on the Raspberry Pi.";
  if (existsSync("/.dockerenv")) return "Shut down isn't available when Skylight runs in Docker.";
  // -l: ask sudo whether we may run it, without running it or prompting.
  const check = await run("sudo", ["-n", "-l", ...POWEROFF]);
  if (!check.ok) return "This Pi needs a password to shut down, so the button can't do it.";
  return null;
}

/** Power off shortly after the HTTP reply has gone out. */
export function scheduleShutdown(log: (msg: string) => void): void {
  log("[power] shutdown requested from the control panel");
  setTimeout(() => {
    void run("sudo", ["-n", ...POWEROFF]).then((r) => {
      if (!r.ok) log(`[power] shutdown failed: ${r.stderr || "unknown error"}`);
    });
  }, 1500);
}
