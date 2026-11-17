// Solid icon set for the control panel (filled where the shape allows;
// power and chevrons stay as strokes because they only read as outlines).

type P = { size?: number; className?: string };

export const PLANE_PATH =
  "M50 8 C54 8 56 14 56 22 L56 40 L88 56 L88 64 L56 56 L56 76 L66 84 L66 90 L50 86 L34 90 L34 84 L44 76 L44 56 L12 64 L12 56 L44 40 L44 22 C44 14 46 8 50 8 Z";

/** Top-down plane silhouette. `heading` in degrees (0 = nose up). */
export function PlaneIcon({ size = 20, heading = 45, className }: P & { heading?: number }) {
  return (
    <svg aria-hidden="true" className={className} width={size} height={size} viewBox="0 0 100 100"
      fill="currentColor" style={{ transform: `rotate(${heading}deg)` }}>
      <path d={PLANE_PATH} />
    </svg>
  );
}

export function HomeIcon({ size = 22 }: P) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.3 2.6a1 1 0 0 1 1.4 0l8.6 7.4c.4.3.7.8.7 1.3V20a1.5 1.5 0 0 1-1.5 1.5H15v-6a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v6H3.5A1.5 1.5 0 0 1 2 20v-8.7c0-.5.3-1 .7-1.3z" />
    </svg>
  );
}

export function SkyIcon({ size = 22 }: P) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M10.5 2l1.9 5.4c.2.5.6.9 1.1 1.1L19 10.5l-5.5 1.9c-.5.2-.9.6-1.1 1.1L10.5 19l-1.9-5.5c-.2-.5-.6-.9-1.1-1.1L2 10.5l5.5-2c.5-.2.9-.6 1.1-1.1z" />
      <path d="M19 15.5l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9z" />
    </svg>
  );
}

export function SparkleIcon({ size = 18 }: P) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.2 6.2c.2.6.7 1.1 1.3 1.3L22 12l-6.5 2.5c-.6.2-1.1.7-1.3 1.3L12 22l-2.2-6.2c-.2-.6-.7-1.1-1.3-1.3L2 12l6.5-2.5c.6-.2 1.1-.7 1.3-1.3z" />
    </svg>
  );
}

export function LookIcon({ size = 22 }: P) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd">
      <path d="M12 2a10 10 0 0 0 0 20c1.4 0 2.3-1.2 1.9-2.4l-.3-.9c-.4-1.2.5-2.4 1.7-2.4H18a4 4 0 0 0 4-4C22 6.5 17.5 2 12 2zM7 13a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3-4.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
    </svg>
  );
}

export function SettingsIcon({ size = 22 }: P) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="5" width="18" height="2.4" rx="1.2" />
      <rect x="3" y="10.8" width="18" height="2.4" rx="1.2" />
      <rect x="3" y="16.6" width="18" height="2.4" rx="1.2" />
      <circle cx="15" cy="6.2" r="2.8" />
      <circle cx="8.5" cy="12" r="2.8" />
      <circle cx="16.5" cy="17.8" r="2.8" />
    </svg>
  );
}

export function MoonIcon({ size = 18 }: P) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

export function LocationIcon({ size = 16 }: P) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 11 22 2l-9 19-2-8z" />
    </svg>
  );
}

export function DotsIcon({ size = 20 }: P) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}

export function PowerIcon({ size = 20 }: P) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.4" strokeLinecap="round">
      <path d="M12 2.5v9M18.4 6.6a9 9 0 1 1-12.8 0" />
    </svg>
  );
}

export function ChevronIcon({ size = 16 }: P) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function SatelliteIcon({ size = 24 }: P) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <rect x="9" y="9" width="6" height="6" rx="1.2" />
      <rect x="1.5" y="10" width="6" height="4" rx="1" />
      <rect x="16.5" y="10" width="6" height="4" rx="1" />
    </svg>
  );
}

export function CheckCircleIcon({ size = 20 }: P) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1.2 14.2-4-4 1.4-1.4 2.6 2.6 5.4-5.4 1.4 1.4z" />
    </svg>
  );
}
