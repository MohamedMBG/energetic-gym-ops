import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/setup")({
  component: SetupPage,
});

function SetupPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({ gymName: "", email: "", password: "" });

  const setup = useMutation({
    mutationFn: () => api.post("/api/auth/setup", form),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success("Setup complete. Welcome!");
      navigate({ to: "/" });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm rounded-2xl border-0 p-8 shadow-soft">
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-brand text-xl font-extrabold text-white">
            7
          </div>
          <h1 className="mt-4 text-2xl font-bold">Set up your gym</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your owner account to get started.
          </p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setup.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Gym name</Label>
            <Input
              value={form.gymName}
              onChange={(e) => setForm({ ...form, gymName: e.target.value })}
              placeholder="7up Gym"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="owner@gym.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Password</Label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              minLength={8}
              required
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">At least 8 characters</p>
          </div>
          <Button
            type="submit"
            className="w-full bg-gradient-brand-strong text-white"
            disabled={setup.isPending}
          >
            {setup.isPending ? "Creating…" : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <a href="/login" className="text-primary hover:underline">
            Sign in
          </a>
        </p>
      </Card>
    </div>
  );
}
