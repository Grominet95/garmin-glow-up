export type Units = "metric" | "imperial";

export function fmtPace(sPerKm: number, units: Units = "metric"): string {
  if (units === "imperial") {
    const sPerMile = sPerKm * 1.60934;
    const m = Math.floor(sPerMile / 60);
    const s = Math.round(sPerMile % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  const m = Math.floor(sPerKm / 60);
  const s = Math.round(sPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function fmtPaceUnit(units: Units = "metric"): string {
  return units === "imperial" ? "/mi" : "/km";
}

export function fmtDistance(metres: number, units: Units = "metric"): string {
  if (units === "imperial") {
    return `${(metres / 1609.34).toFixed(2)} mi`;
  }
  return `${(metres / 1000).toFixed(2)} km`;
}

export function fmtElevation(metres: number, units: Units = "metric"): string {
  if (units === "imperial") {
    return `${Math.round(metres * 3.28084)} ft`;
  }
  return `${Math.round(metres)} m`;
}

export function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function fmtDurationHuman(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function fmtHr(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}
