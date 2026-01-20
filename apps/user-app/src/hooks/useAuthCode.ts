// React Query hooks for auth code generation and verification
// Migrates login.tsx from manual fetch/polling to React Query

import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, apiMutate } from "~/lib/api";

interface AuthCode {
  code: string;
  expiresAt: string;
}

interface VerifyResult {
  authenticated: boolean;
  user?: {
    id: string;
    telegramId: string;
    username: string | null;
    firstName: string;
    lastName: string | null;
  };
}

/**
 * Generate a new auth code for Telegram login.
 */
export function useGenerateAuthCode() {
  return useMutation({
    mutationFn: async () => {
      const response = await apiRequest<AuthCode>("/api/auth/code", {
        method: "POST",
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to generate code");
      }

      return response.data;
    },
  });
}

/**
 * Poll for auth code verification.
 * Automatically stops polling when authenticated or code expires.
 */
export function useVerifyAuthCode(
  code: string | null,
  expiresAt: Date | null,
  enabled: boolean
) {
  return useQuery({
    queryKey: ["auth-verify", code],
    queryFn: async () => {
      if (!code) throw new Error("No code provided");

      const response = await apiRequest<VerifyResult>("/api/auth/verify", {
        method: "POST",
        body: { code },
      });

      if (!response.success) {
        throw new Error(response.error || "Verification failed");
      }

      return response.data!;
    },
    enabled: enabled && !!code && (!expiresAt || new Date() < expiresAt),
    refetchInterval: (query) => {
      // Stop polling once authenticated
      if (query.state.data?.authenticated) {
        return false;
      }
      return 2000;
    },
    refetchIntervalInBackground: false,
    retry: false,
    // Don't keep stale data between codes
    gcTime: 0,
  });
}
