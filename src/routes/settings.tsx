import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Settings } from "@/lib/types";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

const schema = z.object({
  gymName: z.string().trim().min(2, "Gym name is required").max(60),
  monthlyPrice: z.coerce.number().min(0),
  annualPrice: z.coerce.number().min(0),
  reminderDays: z.coerce.number().min(0).max(60),
  currency: z.string().trim().min(2).max(8),
});

const EMPTY_SETTINGS: Settings = {
  gymName: "",
  monthlyPrice: 0,
  annualPrice: 0,
  reminderDays: 7,
  currency: "USD",
};

function SettingsPage() {
  const { t } = useI18n();
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const [form, setForm] = useState<Settings>(EMPTY_SETTINGS);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // sync form when settings loads
  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  function save() {
    const r = schema.safeParse(form);
    if (!r.success) {
      const errs: Record<string, string> = {};
      r.error.issues.forEach((i) => { errs[i.path.join(".")] = i.message; });
      setErrors(errs);
      return;
    }
    updateSettings.mutate(r.data, {
      onSuccess: () => { toast.success(t("settings.saved")); setErrors({}); },
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("settings.title")} description={t("settings.description")} />

      <Card className="rounded-2xl border-0 p-6 shadow-soft">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("settings.gymName")} error={errors.gymName}>
            <Input value={form.gymName} onChange={(e) => setForm({ ...form, gymName: e.target.value })} />
          </Field>
          <Field label={t("settings.currency")} error={errors.currency}>
            <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
          </Field>
          <Field label={t("settings.monthlyPrice")} error={errors.monthlyPrice}>
            <Input type="number" min={0} value={form.monthlyPrice} onChange={(e) => setForm({ ...form, monthlyPrice: Number(e.target.value) })} />
          </Field>
          <Field label={t("settings.annualPrice")} error={errors.annualPrice}>
            <Input type="number" min={0} value={form.annualPrice} onChange={(e) => setForm({ ...form, annualPrice: Number(e.target.value) })} />
          </Field>
          <Field label={t("settings.reminderDays")} error={errors.reminderDays}>
            <Input type="number" min={0} max={60} value={form.reminderDays} onChange={(e) => setForm({ ...form, reminderDays: Number(e.target.value) })} />
          </Field>
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={save} disabled={updateSettings.isPending} className="bg-gradient-brand-strong text-white">
            {updateSettings.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </Card>

      <Card className="rounded-2xl border-0 p-6 shadow-soft">
        <h2 className="text-lg font-bold">Danger zone</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign out of your account.
        </p>
        <Button
          variant="outline"
          className="mt-4 border-rose-300 text-rose-600 hover:bg-rose-50"
          onClick={async () => {
            await api.post("/api/auth/logout", {});
            window.location.href = "/login";
          }}
        >
          Sign out
        </Button>
      </Card>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      {children}
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
