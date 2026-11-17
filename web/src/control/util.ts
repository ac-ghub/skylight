/** "23:00" → "11:00 pm" */
export function clock(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

/** First part of a geocoder name: "Killarney Heights, Sydney, NSW" → "Killarney Heights". */
export function shortPlace(name: string): string {
  return (name || "Your location").split(",")[0].trim() || "Your location";
}
