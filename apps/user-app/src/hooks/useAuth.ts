import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  telegramId: string;
  username: string | null;
  displayName: string | null;
  language: string;
  isActive: boolean;
  createdAt: string;
}

interface AuthStore {
  isAuthenticated: boolean;
  user: User | null;
  setAuth: (user: User | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      setAuth: (user) => set({ isAuthenticated: !!user, user }),
      clearAuth: () => set({ isAuthenticated: false, user: null }),
    }),
    {
      name: "auth-storage",
    }
  )
);

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setAuth, clearAuth, isAuthenticated, user } = useAuthStore();

  const { isLoading, refetch } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        clearAuth();
        return null;
      }
      const data = await res.json();
      if (data.success && data.data) {
        setAuth(data.data);
        return data.data;
      }
      clearAuth();
      return null;
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/auth/logout", { method: "POST" });
    },
    onSuccess: () => {
      clearAuth();
      queryClient.clear();
      router.push("/login");
    },
  });

  return {
    isAuthenticated,
    isLoading,
    user,
    logout: logoutMutation.mutate,
    refetch,
  };
}

export function useRequireAuth() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  if (!isLoading && !isAuthenticated) {
    router.push("/login");
  }

  return { isAuthenticated, isLoading };
}
