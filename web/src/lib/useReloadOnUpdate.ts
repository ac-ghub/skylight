import { useEffect, useRef } from "react";

/**
 * Reload the page once after Skylight is updated ("Update now" or the nightly
 * 4–7 am update). An update restarts the server onto a new build; the page's
 * live connection reconnects and the server announces its version. If that
 * differs from the version this page loaded with, reload to pick up the new
 * build. No timers: nothing happens until the server actually restarts.
 */
export function useReloadOnUpdate(version: string | null): void {
  const first = useRef<string | null>(null);
  useEffect(() => {
    if (!version || version === "unknown") return;
    if (first.current === null) {
      first.current = version;
      return;
    }
    if (version !== first.current) window.location.reload();
  }, [version]);
}
