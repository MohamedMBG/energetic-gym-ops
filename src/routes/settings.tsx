import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSettings, resetAllData, saveSettings } from "@/lib/storage";

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

function SettingsPage() {
  const [form, setForm] = useState(() => getSettings());
  const [errors, setErrors] = useState<Record<string, string>>({});

  function save() {
    const r = schema.safeParse(form);
    if (!r.success) {
      const errs: Record<string, string> = {};
      r.error.issues.forEach((i) => { errs[i.path.join(".")] = i.message; });
      setErrors(errs);
      return;
    }
    saveSettings(r.data);
    setErrors({});
    toast.success("Settings saved");
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Configure your gym's preferences." />

      <Card className="rounded-2xl border-0 p-6 shadow-soft">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Gym name" error={errors.gymName}>
            <Input value={form.gymName} onChange={(e) => setForm({ ...form, gymName: e.target.value })} />
          </Field>
          <Field label="Currency" error={errors.currency}>
            <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
          </Field>
          <Field label="Monthly subscription price" error={errors.monthlyPrice}>
            <Input type="number" min={0} value={form.monthlyPrice} onChange={(e) => setForm({ ...form, monthlyPrice: Number(e.target.value) })} />
          </Field>
          <Field label="Annual subscription price" error={errors.annualPrice}>
            <Input type="number" min={0} value={form.annualPrice} onChange={(e) => setForm({ ...form, annualPrice: Number(e.target.value) })} />
          </Field>
          <Field label="Reminder days before due date" error={errors.reminderDays}>
            <Input type="number" min={0} max={60} value={form.reminderDays} onChange={(e) => setForm({ ...form, reminderDays: Number(e.target.value) })} />
          </Field>
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={save} className="bg-gradient-brand-strong text-white">Save changes</Button>
        </div>
      </Card>

      <Card className="rounded-2xl border-0 p-6 shadow-soft">
        <h2 className="text-lg font-bold">Danger zone</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Reset all clients, payments, reminders and settings. This cannot be undone.
        </p>
        <Button
          variant="outline"
          className="mt-4 border-rose-300 text-rose-600 hover:bg-rose-50"
          onClick={() => {
            resetAllData();
            toast.success("All data reset. Reload to see fresh seed data.");
            setTimeout(() => window.location.reload(), 800);
          }}
        >
          Reset all data
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
