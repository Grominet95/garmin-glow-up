import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface AuthStatus {
  authenticated: boolean;
}

export function useAuthStatus() {
  return useQuery({
    queryKey: ["auth-status"],
    queryFn: () => api<AuthStatus>("/auth/status"),
    staleTime: 0,
  });
}

export function useInvalidateAuthStatus() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["auth-status"] });
}
