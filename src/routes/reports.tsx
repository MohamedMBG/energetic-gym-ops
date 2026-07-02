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
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const { locale, t } = useI18n();
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
      arr.push({ month: d.toLocaleString(locale, { month: "short" }), earnings: t });
    }
    return arr;
  }, [locale, payments]);

  const byType = useMemo(() => {
    const totals = new Map<string, number>();
    payments
      .filter((p) => p.status === "Paid")
      .forEach((payment) => {
        const type = clients.find((c) => c.id === payment.clientId)?.subscriptionType ?? t("common.unknown");
        totals.set(type, (totals.get(type) ?? 0) + payment.amount);
      });
    return [...totals.entries()].map(([name, value]) => ({ name, value }));
  }, [clients, payments, t]);

  const paidVsUnpaid = [
    { name: t("status.Paid"), value: clients.filter((c) => c.paymentStatus === "Paid").length },
    { name: t("status.Late"), value: clients.filter((c) => c.paymentStatus === "Late").length },
    { name: t("status.Unpaid"), value: clients.filter((c) => c.paymentStatus === "Unpaid").length },
  ];

  const COLORS = ["oklch(0.72 0.19 52)", "oklch(0.86 0.17 88)", "oklch(0.62 0.22 27)"];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("reports.title")}
        description={t("reports.description")}
        actions={
          <Button variant="outline" onClick={() => toast.success(t("reports.exported"))}>
            <Download className="mr-2 h-4 w-4" /> {t("reports.export")}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="rounded-2xl border-0 bg-gradient-brand-strong p-5 text-white shadow-glow">
          <div className="text-xs font-semibold uppercase tracking-wider opacity-80">{t("reports.totalEarnings")}</div>
          <div className="mt-2 text-3xl font-extrabold">{formatCurrency(total, currency)}</div>
        </Card>
        <Card className="rounded-2xl border-0 p-5 shadow-soft">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("reports.bestSellingPack")}</div>
          <div className="mt-2 text-3xl font-extrabold">{[...byType].sort((a, b) => b.value - a.value)[0]?.name ?? t("common.none")}</div>
        </Card>
        <Card className="rounded-2xl border-0 p-5 shadow-soft">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("reports.packTypesSold")}</div>
          <div className="mt-2 text-3xl font-extrabold">{byType.length}</div>
        </Card>
      </div>

      <Card className="rounded-2xl border-0 p-5 shadow-soft">
        <h2 className="mb-4 text-lg font-bold">{t("reports.earningsByMonth")}</h2>
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
          <h2 className="mb-4 text-lg font-bold">{t("reports.earningsByPack")}</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={byType} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={4}>
                  {byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="rounded-2xl border-0 p-5 shadow-soft">
          <h2 className="mb-4 text-lg font-bold">{t("reports.paidVsUnpaid")}</h2>
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
