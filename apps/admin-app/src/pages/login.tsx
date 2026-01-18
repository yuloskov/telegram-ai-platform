import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin, useCurrentAdmin } from "~/hooks/useAuth";
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, Spinner } from "~/components/ui";
import { useRouter } from "next/router";
import { useEffect } from "react";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { data: admin, isLoading: isLoadingAdmin } = useCurrentAdmin();
  const login = useLogin();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (admin) {
      router.push("/");
    }
  }, [admin, router]);

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    try {
      await login.mutateAsync(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  };

  if (isLoadingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (admin) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Admin Panel</CardTitle>
          <CardDescription>Sign in to access the admin dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium text-[var(--text-primary)]">
                Username
              </label>
              <Input
                id="username"
                type="text"
                placeholder="Enter username"
                error={!!errors.username}
                {...register("username")}
              />
              {errors.username && (
                <p className="text-sm text-[var(--status-error)]">{errors.username.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-[var(--text-primary)]">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                error={!!errors.password}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-[var(--status-error)]">{errors.password.message}</p>
              )}
            </div>

            {error && (
              <div className="p-3 rounded-[var(--radius-md)] bg-[#f8d7da] text-[#721c24] text-sm">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={login.isPending}>
              {login.isPending ? <Spinner size="sm" /> : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
