import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface ActivityDetailResponse {
  id: number;
  sport: string;
  subSport: string | null;
  title: string;
  subtitle: string;
  accent: string;
  hero: Array<{ label: string; value: string; unit: string; tone?: string | null }>;
  map: {
    routeName: string;
    routeCoords: string;
    polyline: string;
    fastestCallout: string;
    bbox: number[];
  } | null;
  streams: {
    n: number;
    timeS: number[];
    hr: (number | null)[];
    pace: (number | null)[];
    cadence: (number | null)[];
    elevation: (number | null)[];
    power?: (number | null)[];
  };
  splits: Array<{
    k: string;
    distanceM: number;
    pace: number;
    paceDisplay: string;
    hr: number;
    cad: number;
    elevDelta: number;
    zone: number;
  }>;
  zones: Array<{ z: number; label: string; pct: number; min: number; max: number }>;
  hrSummary: { avg: number; max: number; hrrPct: number };
  dynamics: {
    verticalOscCm: number;
    groundContactMs: number;
    strideLengthM: number;
    verticalRatioPct: number;
    leftPct: number | null;
    rightPct: number | null;
  } | null;
  trainingEffect: {
    headline: string;
    sub: string;
    aerobic: number;
    aeroLabel: string;
    anaerobic: number;
    anLabel: string;
    epoc: number;
    load: number;
    intensity: number | null;
    recoveryHours: number;
  };
  missing: string[];
}

export function useActivity(id: number) {
  return useQuery({
    queryKey: ["activity", id],
    queryFn: () => api<ActivityDetailResponse>(`/activities/${id}`),
    staleTime: 5 * 60_000,
  });
}
