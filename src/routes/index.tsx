import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Users, CalendarDays, CalendarRange, DollarSign, AlertTriangle, Clock, UserPlus, CreditCard, Send, ArrowRight } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { clientStatus, formatCurrency, getClients, getPayments, getSettings } from "@/lib/storage";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const clients = useMemo(() => getClients(), []);
  const payments = useMemo(() => getPayments(), []);
  const settings = useMemo(() => getSettings(), []);

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const active = clients.filter((c) => clientStatus(c) !== "Expired").length;
  const monthly = clients.filter((c) => c.subscriptionType === "Monthly").length;
  const annual = clients.filter((c) => c.subscriptionType === "Annual").length;
  const earningsThisMonth = payments
    .filter((p) => {
      const d = new Date(p.date);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear && p.status === "Paid";
    })
    .reduce((s, p) => s + p.amount, 0);
  const unpaid = clients.filter((c) => c.paymentStatus !== "Paid").length;
  const expiringSoon = clients.filter((c) => clientStatus(c) === "Expiring soon").length;

  // Last 6 months earnings
  const monthsData = useMemo(() => {
    const out: { month: string; earnings: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(thisYear, thisMonth - i, 1);
      const label = d.toLocaleString("en", { month: "short" });
      const total = payments
        .filter((p) => {
          const pd = new Date(p.date);
          return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear() && p.status === "Paid";
        })
        .reduce((s, p) => s + p.amount, 0);
      out.push({ month: label, earnings: total });
    }
    return out;
  }, [payments, thisMonth, thisYear]);

  const recent = [...payments]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back 👋`}
        description="Here's what's happening at your gym today."
      />

      {/* Quick actions — 1-click flows */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <QuickAction to="/clients" icon={UserPlus} label="Add new client" hint="Register a member" />
        <QuickAction to="/payments" icon={CreditCard} label="Record payment" hint="Log a transaction" />
        <QuickAction to="/reminders" icon={Send} label="Send reminders" hint={`${expiringSoon} due soon`} highlight={expiringSoon > 0} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Active clients" value={active} icon={Users} variant="brand" hint="Currently subscribed" />
        <StatCard label="Monthly subs" value={monthly} icon={CalendarDays} hint="Active monthly plans" />
        <StatCard label="Annual subs" value={annual} icon={CalendarRange} hint="Active annual plans" />
        <StatCard
          label="Earnings this month"
          value={formatCurrency(earningsThisMonth, settings.currency)}
          icon={DollarSign}
          variant="brand"
          hint={now.toLocaleString("en", { month: "long", year: "numeric" })}
        />
        <StatCard label="Unpaid clients" value={unpaid} icon={AlertTriangle} variant="danger" hint="Need follow-up" />
        <StatCard label="Expiring soon" value={expiringSoon} icon={Clock} variant="warning" hint="Within 7 days" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="rounded-2xl border-0 p-5 shadow-soft xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Earnings trend</h2>
              <p className="text-xs text-muted-foreground">Last 6 months</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <AreaChart data={monthsData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.78 0.18 60)" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="oklch(0.86 0.17 88)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.93 0.01 80)" />
                <XAxis dataKey="month" stroke="oklch(0.5 0.03 60)" fontSize={12} />
                <YAxis stroke="oklch(0.5 0.03 60)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid oklch(0.93 0.01 80)",
                    boxShadow: "0 8px 24px -12px rgba(0,0,0,0.15)",
                  }}
                  formatter={(v: number) => formatCurrency(v, settings.currency)}
                />
                <Area
                  type="monotone"
                  dataKey="earnings"
                  stroke="oklch(0.7 0.2 45)"
                  strokeWidth={3}
                  fill="url(#fillGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="rounded-2xl border-0 bg-gradient-brand-strong p-6 text-white shadow-glow">
          <h3 className="text-sm font-semibold uppercase tracking-wider opacity-80">Total revenue</h3>
          <div className="mt-2 text-4xl font-extrabold">
            {formatCurrency(payments.filter((p) => p.status === "Paid").reduce((s, p) => s + p.amount, 0), settings.currency)}
          </div>
          <p className="mt-1 text-sm opacity-80">All-time earnings collected</p>

          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2.5">
              <span className="text-sm">Avg. monthly revenue</span>
              <span className="font-bold">
                {formatCurrency(monthsData.reduce((s, m) => s + m.earnings, 0) / Math.max(monthsData.length, 1), settings.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2.5">
              <span className="text-sm">Total members</span>
              <span className="font-bold">{clients.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2.5">
              <span className="text-sm">Retention rate</span>
              <span className="font-bold">
                {clients.length ? Math.round((active / clients.length) * 100) : 0}%
              </span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="rounded-2xl border-0 p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Recent payments</h2>
            <p className="text-xs text-muted-foreground">Latest transactions across your gym</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.clientName}</TableCell>
                  <TableCell>{new Date(p.date).toLocaleDateString()}</TableCell>
                  <TableCell>{p.method}</TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {formatCurrency(p.amount, settings.currency)}
                  </TableCell>
                </TableRow>
              ))}
              {recent.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No payments yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
