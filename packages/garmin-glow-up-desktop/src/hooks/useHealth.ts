import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export type HealthWindow = "24h" | "7d" | "30d" | "90d" | "1y";

export interface SleepSegment {
  stage: number; // 0=awake 1=light 2=rem 3=deep
  offsetMin: number;
}

export interface HealthResponse {
  window: HealthWindow;
  series: {
    dates: string[];
    hrv: (number | null)[];
    rhr: (number | null)[];
    stress: (number | null)[];
    bodyBattery: (number | null)[];
    bodyBatteryCharged: (number | null)[];
    spo2: (number | null)[];
    sleepHours: (number | null)[];
    bodyBatteryIntraday: [number, number][] | null;
  };
  lastNight: {
    durationS: number;
    score: number;
    scoreLabel: string;
    bedTimeLocal: string;
    wakeTimeLocal: string;
    blocks5min: number[];
    segments: SleepSegment[];
    totals: { awakeS: number; lightS: number; remS: number; deepS: number };
    hrvDelta: number | null;
  } | null;
  stressToday: { restS: number; lowS: number; medS: number; highS: number } | null;
  tonightForecast: { likelyDurationS: number; recovery: string; notes: string } | null;
  bedtimeVarianceMin: number | null;
}

export function useHealth(window: HealthWindow = "30d") {
  return useQuery({
    queryKey: ["health", window],
    queryFn: () => api<HealthResponse>(`/health?window=${window}`),
    staleTime: 5 * 60_000,
  });
}
