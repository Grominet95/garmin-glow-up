import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface DashboardResponse {
  state: "ready" | "empty";
  todayLocal: string;
  syncStatus: { lastSync: string | null; running: boolean; nextRun: string | null };
  status: { headline: string; subhead: string; body: string; tone: string; tsb: number };
  vibe: { word: string; sub: string } | null;
  form28d: { days: string[]; ctl: number[]; atl: number[]; tsb: number[] };
  bodyBattery: { current: number; label: string; from: number; drainsToByNoon: number } | null;
  sleep: {
    durationS: number;
    bedTimeLocal: string;
    wakeTimeLocal: string;
    stages: { deep: number; rem: number; light: number; awake: number };
    hrvDelta: number | null;
    score: number;
  } | null;
  lastSession: {
    id: number;
    sport: string;
    title: string;
    startTimeLocal: string;
    endTimeLocal: string;
    distanceKm: number;
    avgPaceDisplay: string;
    avgPaceUnit: string;
    avgHr: number;
    tss: number;
    aerobicTE: number;
    chips: string[];
    routePolyline: string | null;
  } | null;
  plannedToday: null;
  week: Array<{
    dayLabel: string;
    dateLocal: string;
    sport: string | null;
    isToday: boolean;
    label: string;
    distanceKm: number;
    tss: number;
  }>;
  weekTotals: { volumeKm: number; tss: number; sessions: number; rampPct: number };
}

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<DashboardResponse>("/dashboard"),
    refetchInterval: 60_000,
  });
}
