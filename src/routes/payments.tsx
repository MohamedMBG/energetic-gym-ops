import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, TrendingUp, Calendar } from "lucide-react";
import { computeEndDate, formatCurrency } from "@/lib/storage";
import { useClients } from "@/hooks/use-clients";
import { usePayments, useCreatePayment } from "@/hooks/use-payments";
import { useSettings } from "@/hooks/use-settings";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/payments")({
  component: PaymentsPage,
});

const paymentSchema = z.object({
  clientId: z.string().min(1, "Select a client"),
  amount: z.coerce.number().min(1, "Amount must be greater than 0"),
  date: z.string().min(1),
  method: z.enum(["Cash", "Card", "Bank transfer"]),
  status: z.enum(["Paid", "Unpaid"]),
});

function PaymentsPage() {
  const { t } = useI18n();
  const { data: settings } = useSettings();
  const { data: clients = [] } = useClients();
  const { data: payments = [], isLoading } = usePayments();
  const createPayment = useCreatePayment();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    clientId: "",
    amount: settings?.monthlyPrice ?? 45,
    date: new Date().toISOString().slice(0, 10),
    method: "Card" as "Cash" | "Card" | "Bank transfer",
    status: "Paid" as "Paid" | "Unpaid",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const currency = settings?.currency ?? "MAD";

  // derive client names from clients list — backend payments don't include clientName
  const clientMap = useMemo(
    () => new Map(clients.map((c) => [c.id, c])),
    [clients],
  );

  const now = new Date();
  const monthlyEarnings = payments
    .filter((p) => p.status === "Paid" && new Date(p.date).getMonth() === now.getMonth() && new Date(p.date).getFullYear() === now.getFullYear())
    .reduce((s, p) => s + p.amount, 0);
  const annualEarnings = payments
    .filter((p) => p.status === "Paid" && new Date(p.date).getFullYear() === now.getFullYear())
    .reduce((s, p) => s + p.amount, 0);

  function submit() {
    const r = paymentSchema.safeParse(form);
    if (!r.success) {
      const errs: Record<string, string> = {};
      r.error.issues.forEach((i) => { errs[i.path.join(".")] = i.message; });
      setErrors(errs);
      return;
    }
    const client = clientMap.get(r.data.clientId);
    if (!client) return;

    createPayment.mutate(
      {
        clientId: client.id,
        amount: r.data.amount,
        date: r.data.date,
        periodStart: r.data.date,
        periodEnd: computeEndDate(r.data.date, client.subscriptionDurationMonths ?? (client.subscriptionType === "Annual" ? 12 : 1)),
        method: r.data.method,
        status: r.data.status,
      },
      {
        onSuccess: () => {
          toast.success(t("payments.saved"));
          setOpen(false);
          setErrors({});
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  const sorted = [...payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("payments.title")}
        description={t("payments.description")}
        actions={
          <Button onClick={() => setOpen(true)} className="bg-gradient-brand-strong text-white shadow-soft">
            <Plus className="mr-2 h-4 w-4" /> {t("payments.add")}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t("payments.thisMonth")} value={formatCurrency(monthlyEarnings, currency)} icon={Calendar} variant="brand" />
        <StatCard label={t("payments.thisYear")} value={formatCurrency(annualEarnings, currency)} icon={TrendingUp} />
        <StatCard label={t("payments.totalPayments")} value={payments.length} icon={DollarSign} />
      </div>

      <Card className="rounded-2xl border-0 p-5 shadow-soft">
        <h2 className="mb-4 text-lg font-bold">{t("payments.history")}</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.client")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("common.date")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("payments.period")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("common.method")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead className="text-right">{t("common.amount")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">{t("common.loading")}</TableCell>
                </TableRow>
              )}
              {sorted.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {clientMap.get(p.clientId)?.fullName ?? p.clientName ?? "—"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{new Date(p.date).toLocaleDateString()}</TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                    {new Date(p.periodStart).toLocaleDateString()} → {new Date(p.periodEnd).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{p.method}</TableCell>
                  <TableCell><StatusBadge status={p.status} /></TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(p.amount, currency)}</TableCell>
                </TableRow>
              ))}
              {!isLoading && sorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">{t("payments.noPayments")}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t("payments.record")}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t("common.client")}</Label>
              <Select
                value={form.clientId}
                onValueChange={(v) => {
                  const c = clientMap.get(v);
                  setForm({ ...form, clientId: v, amount: c?.amountPaid || (c?.subscriptionType === "Annual" ? (settings?.annualPrice ?? 480) : (settings?.monthlyPrice ?? 45)) });
                }}
              >
                <SelectTrigger><SelectValue placeholder={t("payments.selectClient")} /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.fullName} — {c.subscriptionType}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.clientId && <p className="text-xs text-rose-600">{errors.clientId}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t("common.amount")} ({currency})</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
              {errors.amount && <p className="text-xs text-rose-600">{errors.amount}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t("common.date")}</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t("common.method")}</Label>
              <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v as typeof form.method })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">{t("status.Cash")}</SelectItem>
                  <SelectItem value="Card">{t("status.Card")}</SelectItem>
                  <SelectItem value="Bank transfer">{t("status.Bank transfer")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t("common.status")}</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as typeof form.status })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Paid">{t("status.Paid")}</SelectItem>
                  <SelectItem value="Unpaid">{t("status.Unpaid")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={submit} disabled={createPayment.isPending} className="bg-gradient-brand-strong text-white">
              {createPayment.isPending ? t("common.saving") : t("payments.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
