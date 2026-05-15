import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export type HealthWindow = "7d" | "30d" | "90d" | "1y";

export interface HealthResponse {
  window: HealthWindow;
  series: {
    dates: string[];
    hrv: (number | null)[];
    rhr: (number | null)[];
    stress: (number | null)[];
    bodyBattery: (number | null)[];
    spo2: (number | null)[];
    sleepHours: (number | null)[];
  };
  lastNight: {
    durationS: number;
    score: number;
    scoreLabel: string;
    bedTimeLocal: string;
    wakeTimeLocal: string;
    blocks5min: number[];
    totals: { awakeS: number; lightS: number; remS: number; deepS: number };
    hrvDelta: number | null;
  } | null;
  tonightForecast: { likelyDurationS: number; recovery: string; notes: string } | null;
}

export function useHealth(window: HealthWindow = "30d") {
  return useQuery({
    queryKey: ["health", window],
    queryFn: () => api<HealthResponse>(`/health?window=${window}`),
    staleTime: 5 * 60_000,
  });
}
