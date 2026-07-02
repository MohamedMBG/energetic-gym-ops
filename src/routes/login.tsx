import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = useMutation({
    mutationFn: () => api.post("/api/auth/login", { email, password }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["auth", "me"] });
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
          <h1 className="mt-4 text-2xl font-bold">{t("login.signIn")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("login.subtitle")}</p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            login.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">{t("common.email")}</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@gym.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">{t("common.password")}</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-gradient-brand-strong text-white"
            disabled={login.isPending}
          >
            {login.isPending ? t("login.signingIn") : t("login.signIn")}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t("login.firstTime")}{" "}
          <a href="/setup" className="text-primary hover:underline">
            {t("login.setupGym")}
          </a>
        </p>
      </Card>
    </div>
  );
}
