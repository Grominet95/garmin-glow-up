import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface LoadResponse {
  rangeDays: number;
  series: Array<{ date: string; ctl: number; atl: number; tss: number; tsb: number }>;
  weekly: Array<{
    weekStart: string;
    bySport: Record<string, number>;
    totalTss: number;
    distanceKm: number;
  }>;
  current: {
    ctl: number;
    atl: number;
    tsb: number;
    rampPctWoW: number;
    monotony: number;
    strain: number;
  };
  recommendations: Array<{ kind: string; body: string }>;
}

export function useLoad(range = "120d") {
  return useQuery({
    queryKey: ["load", range],
    queryFn: () => api<LoadResponse>(`/load?range=${range}`),
    staleTime: 5 * 60_000,
  });
}
