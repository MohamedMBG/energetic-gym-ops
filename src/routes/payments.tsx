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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { DollarSign, TrendingUp, Calendar } from "lucide-react";
import {
  computeEndDate, formatCurrency, getClients, getPayments, getSettings,
  saveClients, savePayments, uid,
} from "@/lib/storage";
import type { Payment } from "@/lib/types";

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
  const settings = useMemo(() => getSettings(), []);
  const [clients, setClients] = useState(() => getClients());
  const [payments, setPayments] = useState<Payment[]>(() => getPayments());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    clientId: "",
    amount: settings.monthlyPrice,
    date: new Date().toISOString().slice(0, 10),
    method: "Card" as "Cash" | "Card" | "Bank transfer",
    status: "Paid" as "Paid" | "Unpaid",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const now = new Date();
  const monthlyEarnings = payments
    .filter((p) => p.status === "Paid" && new Date(p.date).getMonth() === now.getMonth() && new Date(p.date).getFullYear() === now.getFullYear())
    .reduce((s, p) => s + p.amount, 0);
  const annualEarnings = payments
    .filter((p) => p.status === "Paid" && new Date(p.date).getFullYear() === now.getFullYear())
    .reduce((s, p) => s + p.amount, 0);
  const totalPayments = payments.length;

  function submit() {
    const r = paymentSchema.safeParse(form);
    if (!r.success) {
      const errs: Record<string, string> = {};
      r.error.issues.forEach((i) => { errs[i.path.join(".")] = i.message; });
      setErrors(errs);
      return;
    }
    const client = clients.find((c) => c.id === form.clientId);
    if (!client) return;
    const payment: Payment = {
      id: uid(),
      clientId: client.id,
      clientName: client.fullName,
      amount: form.amount,
      date: form.date,
      periodStart: form.date,
      periodEnd: computeEndDate(form.date, client.subscriptionType),
      method: form.method,
      status: form.status,
    };
    const nextPayments = [payment, ...payments];
    setPayments(nextPayments);
    savePayments(nextPayments);

    if (form.status === "Paid") {
      const updated = clients.map((c) =>
        c.id === client.id
          ? {
              ...c,
              paymentStatus: "Paid" as const,
              lastPaymentDate: form.date,
              amountPaid: form.amount,
              subscriptionStart: form.date,
              subscriptionEnd: computeEndDate(form.date, c.subscriptionType),
            }
          : c,
      );
      setClients(updated);
      saveClients(updated);
    }
    toast.success("Payment recorded");
    setOpen(false);
    setErrors({});
  }

  const sorted = [...payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Record transactions and review your earnings."
        actions={
          <Button onClick={() => setOpen(true)} className="bg-gradient-brand-strong text-white shadow-soft">
            <Plus className="mr-2 h-4 w-4" /> Add payment
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="This month" value={formatCurrency(monthlyEarnings, settings.currency)} icon={Calendar} variant="brand" />
        <StatCard label="This year" value={formatCurrency(annualEarnings, settings.currency)} icon={TrendingUp} variant="warning" />
        <StatCard label="Total payments" value={totalPayments} icon={DollarSign} />
      </div>

      <Card className="rounded-2xl border-0 p-5 shadow-soft">
        <h2 className="mb-4 text-lg font-bold">Payment history</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.clientName}</TableCell>
                  <TableCell>{new Date(p.date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(p.periodStart).toLocaleDateString()} → {new Date(p.periodEnd).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{p.method}</TableCell>
                  <TableCell><StatusBadge status={p.status} /></TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(p.amount, settings.currency)}</TableCell>
                </TableRow>
              ))}
              {sorted.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No payments yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Record payment</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Client</Label>
              <Select value={form.clientId} onValueChange={(v) => {
                const c = clients.find((x) => x.id === v);
                setForm({ ...form, clientId: v, amount: c?.subscriptionType === "Annual" ? settings.annualPrice : settings.monthlyPrice });
              }}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.fullName} — {c.subscriptionType}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.clientId && <p className="text-xs text-rose-600">{errors.clientId}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Amount ({settings.currency})</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
              {errors.amount && <p className="text-xs text-rose-600">{errors.amount}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Method</Label>
              <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v as typeof form.method })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="Bank transfer">Bank transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as typeof form.status })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} className="bg-gradient-brand-strong text-white">Save payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
