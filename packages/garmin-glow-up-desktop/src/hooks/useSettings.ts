import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface SettingsData {
  units: "metric" | "imperial";
  syncIntervalHours: number;
  athlete: {
    maxHr: number;
    restingHr: number;
    ftp: number | null;
  };
}

export interface SettingsPatch {
  units?: "metric" | "imperial";
  syncIntervalHours?: number;
  athlete?: {
    maxHr?: number;
    restingHr?: number;
    ftp?: number | null;
  };
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => api<SettingsData>("/settings"),
    staleTime: 60_000,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: SettingsPatch) =>
      api<SettingsData>("/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }),
    onSuccess: (data) => {
      qc.setQueryData(["settings"], data);
    },
  });
}
