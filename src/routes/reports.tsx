import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { formatCurrency } from "@/lib/storage";
import { useClients } from "@/hooks/use-clients";
import { usePayments } from "@/hooks/use-payments";
import { useSettings } from "@/hooks/use-settings";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const { data: settings } = useSettings();
  const { data: clients = [] } = useClients();
  const { data: payments = [] } = usePayments();

  const currency = settings?.currency ?? "MAD";
  const total = payments.filter((p) => p.status === "Paid").reduce((s, p) => s + p.amount, 0);

  const monthly = useMemo(() => {
    const now = new Date();
    const arr: { month: string; earnings: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const t = payments
        .filter((p) => p.status === "Paid" && new Date(p.date).getMonth() === d.getMonth() && new Date(p.date).getFullYear() === d.getFullYear())
        .reduce((s, p) => s + p.amount, 0);
      arr.push({ month: d.toLocaleString("en", { month: "short" }), earnings: t });
    }
    return arr;
  }, [payments]);

  const byType = [
    { name: "Monthly", value: payments.filter((p) => p.status === "Paid" && clients.find((c) => c.id === p.clientId)?.subscriptionType === "Monthly").reduce((s, p) => s + p.amount, 0) },
    { name: "Annual", value: payments.filter((p) => p.status === "Paid" && clients.find((c) => c.id === p.clientId)?.subscriptionType === "Annual").reduce((s, p) => s + p.amount, 0) },
  ];

  const paidVsUnpaid = [
    { name: "Paid", value: clients.filter((c) => c.paymentStatus === "Paid").length },
    { name: "Late", value: clients.filter((c) => c.paymentStatus === "Late").length },
    { name: "Unpaid", value: clients.filter((c) => c.paymentStatus === "Unpaid").length },
  ];

  const COLORS = ["oklch(0.72 0.19 52)", "oklch(0.86 0.17 88)", "oklch(0.62 0.22 27)"];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Earnings analytics and member breakdowns."
        actions={
          <Button variant="outline" onClick={() => toast.success("Report exported (mock)")}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="rounded-2xl border-0 bg-gradient-brand-strong p-5 text-white shadow-glow">
          <div className="text-xs font-semibold uppercase tracking-wider opacity-80">Total earnings</div>
          <div className="mt-2 text-3xl font-extrabold">{formatCurrency(total, currency)}</div>
        </Card>
        <Card className="rounded-2xl border-0 p-5 shadow-soft">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">From monthly plans</div>
          <div className="mt-2 text-3xl font-extrabold">{formatCurrency(byType[0].value, currency)}</div>
        </Card>
        <Card className="rounded-2xl border-0 p-5 shadow-soft">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">From annual plans</div>
          <div className="mt-2 text-3xl font-extrabold">{formatCurrency(byType[1].value, currency)}</div>
        </Card>
      </div>

      <Card className="rounded-2xl border-0 p-5 shadow-soft">
        <h2 className="mb-4 text-lg font-bold">Earnings by month</h2>
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.93 0.01 80)" />
              <XAxis dataKey="month" stroke="oklch(0.5 0.03 60)" fontSize={12} />
              <YAxis stroke="oklch(0.5 0.03 60)" fontSize={12} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.93 0.01 80)" }}
                formatter={(v: number) => formatCurrency(v, currency)}
              />
              <Bar dataKey="earnings" fill="oklch(0.78 0.18 60)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl border-0 p-5 shadow-soft">
          <h2 className="mb-4 text-lg font-bold">Earnings by subscription type</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={byType} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={4}>
                  {byType.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="rounded-2xl border-0 p-5 shadow-soft">
          <h2 className="mb-4 text-lg font-bold">Paid vs Unpaid clients</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={paidVsUnpaid} dataKey="value" nameKey="name" outerRadius={100}>
                  {paidVsUnpaid.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
