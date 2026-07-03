import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, setAuthToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { BusinessLogo } from "@/components/BusinessLogo";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/setup")({
  component: SetupPage,
});

function SetupPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({ gymName: "", email: "", password: "" });

  const setup = useMutation({
    mutationFn: () => api.post<{ token: string }>("/api/auth/setup", form),
    onSuccess: async ({ token }) => {
      setAuthToken(token);
      await qc.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success(t("setup.complete"));
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
          <BusinessLogo className="mx-auto h-20 w-20 rounded-2xl" />
          <h1 className="mt-4 text-2xl font-bold">{t("setup.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("setup.description")}
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
            <Label className="text-xs font-semibold text-muted-foreground">{t("settings.gymName")}</Label>
            <Input
              value={form.gymName}
              onChange={(e) => setForm({ ...form, gymName: e.target.value })}
              placeholder="Seven Gym"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">{t("common.email")}</Label>
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
            <Label className="text-xs font-semibold text-muted-foreground">{t("common.password")}</Label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              minLength={8}
              required
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">{t("setup.minPassword")}</p>
          </div>
          <Button
            type="submit"
            className="w-full bg-gradient-brand-strong text-white"
            disabled={setup.isPending}
          >
            {setup.isPending ? t("setup.creating") : t("setup.createAccount")}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t("setup.alreadyHaveAccount")}{" "}
          <a href="/login" className="text-primary hover:underline">
            {t("login.signIn")}
          </a>
        </p>
      </Card>
    </div>
  );
}
