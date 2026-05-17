import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface ProgressResponse {
  vo2max: {
    months: string[];
    values: number[];
    deltaLast90d: number;
    fitnessAge: number | null;
  };
  races: Array<{
    distance: string;
    targetDisplay: string;
    prDisplay: string;
    prDate: string;
    featured?: boolean;
  }>;
  predictions: Array<{
    distance: string;
    distLabel: string;
    predictedDisplay: string;
    predictedSecs: number;
    prDisplay: string;
    prSecs: number | null;
    prDate: string;
    deltaPct: number | null;
    featured: boolean;
  }>;
  courses: Array<{
    name: string;
    timeDisplay: string;
    deltaDisplay: string;
    dateLocal: string;
    activityId: number;
  }>;
  badges: Array<{
    slug: string;
    label: string;
    sport: string;
    earned: boolean;
    earnedAt: string | null;
  }>;
  highlights: Array<{ kind: string; body: string; dateLocal: string }>;
}

export function useProgress() {
  return useQuery({
    queryKey: ["progress"],
    queryFn: () => api<ProgressResponse>("/progress"),
    staleTime: 5 * 60_000,
  });
}
