import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface CalendarCell {
  dateLocal: string;
  sport: string;
  intensity: string;
  distanceKm: number;
}

export interface MonthBucket {
  month: string;
  totalKm: number;
  bySport: Record<string, number>;
}

export interface StreakInfo {
  activeDays: number;
  startDate: string;
  adherencePct: number;
}

export interface CalendarRecentItem {
  id: number;
  dateLocal: string;
  sport: string;
  label: string;
  hr: number;
  metricDisplay: string;
  distanceKm: number;
  durationS: number;
}

export interface CalendarResponse {
  rangeStart: string;
  rangeEnd: string;
  cells: CalendarCell[];
  totals: { sessions: number; distanceKm: number; durationS: number; kcal: number };
  monthly: MonthBucket[];
  streak: StreakInfo;
  recent: CalendarRecentItem[];
}

export function useCalendar() {
  return useQuery({
    queryKey: ["calendar"],
    queryFn: () => api<CalendarResponse>("/calendar"),
    staleTime: 5 * 60_000,
  });
}
