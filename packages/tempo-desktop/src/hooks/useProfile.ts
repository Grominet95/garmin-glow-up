import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface ProfileData {
  displayName: string | null;
  fullName: string | null;
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: () => api<ProfileData>("/settings/profile"),
    staleTime: 300_000,
    retry: false,
  });
}
