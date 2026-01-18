import { create } from "zustand";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/router";

interface AdminUser {
  username: string;
  type: string;
}

interface AuthState {
  isAuthenticated: boolean;
  setAuthenticated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  setAuthenticated: (value) => set({ isAuthenticated: value }),
}));

async function fetchCurrentAdmin(): Promise<AdminUser | null> {
  const res = await fetch("/api/auth/me");
  if (!res.ok) {
    return null;
  }
  const data = await res.json();
  return data.data;
}

async function loginAdmin(credentials: { username: string; password: string }) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Login failed");
  }
  return data;
}

async function logoutAdmin() {
  const res = await fetch("/api/auth/logout", { method: "POST" });
  if (!res.ok) {
    throw new Error("Logout failed");
  }
  return true;
}

export function useCurrentAdmin() {
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);

  return useQuery({
    queryKey: ["admin", "current"],
    queryFn: async () => {
      const admin = await fetchCurrentAdmin();
      setAuthenticated(!!admin);
      return admin;
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);

  return useMutation({
    mutationFn: loginAdmin,
    onSuccess: () => {
      setAuthenticated(true);
      queryClient.invalidateQueries({ queryKey: ["admin", "current"] });
      router.push("/");
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);

  return useMutation({
    mutationFn: logoutAdmin,
    onSuccess: () => {
      setAuthenticated(false);
      queryClient.clear();
      router.push("/login");
    },
  });
}
