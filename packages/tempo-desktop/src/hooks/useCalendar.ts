import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface CalendarResponse {
  yearStart: string;
  cells: Array<{ dateLocal: string; sport: string; intensity: string; distanceKm: number }>;
  totals: { sessions: number; distanceKm: number; durationS: number; kcal: number };
  recent: Array<{
    dateLocal: string;
    sport: string;
    label: string;
    hr: number;
    paceDisplay: string;
  }>;
}

export function useCalendar(year?: number) {
  const y = year ?? new Date().getFullYear();
  return useQuery({
    queryKey: ["calendar", y],
    queryFn: () => api<CalendarResponse>(`/calendar?year=${y}`),
    staleTime: 5 * 60_000,
  });
}
