import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Users, CalendarDays, CalendarRange, DollarSign, AlertTriangle, Clock, UserPlus, CreditCard, Send, ArrowRight, BadgePercent, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { clientStatus, formatCurrency } from "@/lib/storage";
import { useClients } from "@/hooks/use-clients";
import { usePayments } from "@/hooks/use-payments";
import { useSettings } from "@/hooks/use-settings";
import { useOffers } from "@/hooks/use-offers";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const { data: clients = [] } = useClients();
  const { data: payments = [] } = usePayments();
  const { data: settings } = useSettings();
  const { data: offers = [] } = useOffers();
  const currency = settings?.currency ?? "MAD";

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const active = clients.filter((c) => clientStatus(c) !== "Expired").length;
  const monthly = clients.filter((c) => (c.subscriptionDurationMonths ?? 1) === 1).length;
  const threeMonth = clients.filter((c) => c.subscriptionDurationMonths === 3).length;
  const sixMonth = clients.filter((c) => c.subscriptionDurationMonths === 6).length;
  const yearly = clients.filter((c) => c.subscriptionDurationMonths === 12).length;
  const earningsThisMonth = payments
    .filter((p) => {
      const d = new Date(p.date);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear && p.status === "Paid";
    })
    .reduce((s, p) => s + p.amount, 0);
  const unpaid = clients.filter((c) => c.paymentStatus !== "Paid").length;
  const expiringSoon = clients.filter((c) => clientStatus(c) === "Expiring soon").length;
  const activeOffers = offers.filter((o) => o.status === "Active").length;
  const offerClients = clients.filter((c) => c.offerId);
  const offerClientRate = clients.length ? Math.round((offerClients.length / clients.length) * 100) : 0;

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

  const offerStats = useMemo(() => {
    return offers
      .map((offer) => {
        const subscribers = clients.filter((c) => c.offerId === offer.id);
        const revenue = payments
          .filter((p) => subscribers.some((c) => c.id === p.clientId) && p.status === "Paid")
          .reduce((sum, payment) => sum + payment.amount, 0);
        const progress = offer.targetSubscriptions > 0
          ? Math.round((subscribers.length / offer.targetSubscriptions) * 100)
          : 0;
        const health = offer.targetSubscriptions === 0 || subscribers.length >= offer.targetSubscriptions
          ? "Going well"
          : progress >= 50
            ? "Needs push"
            : "Under target";

        return { offer, subscribers: subscribers.length, revenue, progress, health };
      })
      .sort((a, b) => b.subscribers - a.subscribers || b.revenue - a.revenue)
      .slice(0, 5);
  }, [clients, offers, payments]);

  const offerRevenue = offerStats.reduce((sum, row) => sum + row.revenue, 0);
  const bestOffer = offerStats[0];

  const recent = [...payments]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Welcome back 👋"
        description="Here's what's happening at your gym today."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <QuickAction to="/clients" icon={UserPlus} label="Add new client" hint="Register a member" />
        <QuickAction to="/offers" icon={BadgePercent} label="Create offer" hint="Launch a campaign" />
        <QuickAction to="/payments" icon={CreditCard} label="Record payment" hint="Log a transaction" />
        <QuickAction to="/reminders" icon={Send} label="Send reminders" hint={`${expiringSoon} due soon`} highlight={expiringSoon > 0} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active clients" value={active} icon={Users} variant="brand" hint="Currently subscribed" />
        <StatCard label="Monthly subs" value={monthly} icon={CalendarDays} hint="1-month packs" />
        <StatCard label="3-month packs" value={threeMonth} icon={CalendarRange} hint="Quarterly commitments" />
        <StatCard label="6-month packs" value={sixMonth} icon={CalendarRange} hint="Medium-term commitments" />
        <StatCard label="Yearly packs" value={yearly} icon={CalendarRange} hint="12-month subscriptions" />
        <StatCard
          label="Earnings this month"
          value={formatCurrency(earningsThisMonth, currency)}
          icon={DollarSign}
          variant="brand"
          hint={now.toLocaleString("en", { month: "long", year: "numeric" })}
        />
        <StatCard label="Unpaid clients" value={unpaid} icon={AlertTriangle} variant="danger" hint="Need follow-up" />
        <StatCard label="Expiring soon" value={expiringSoon} icon={Clock} variant="warning" hint="Within 5 days" />
        <StatCard label="Active offers" value={activeOffers} icon={BadgePercent} variant="brand" hint={`${offerClients.length} offer subscribers`} />
        <StatCard label="Offer adoption" value={`${offerClientRate}%`} icon={TrendingUp} variant="warning" hint="Members from campaigns" />
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
                  contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.93 0.01 80)", boxShadow: "0 8px 24px -12px rgba(0,0,0,0.15)" }}
                  formatter={(v: number) => formatCurrency(v, currency)}
                />
                <Area type="monotone" dataKey="earnings" stroke="oklch(0.7 0.2 45)" strokeWidth={3} fill="url(#fillGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="rounded-2xl border-0 bg-gradient-brand-strong p-6 text-white shadow-glow">
          <h3 className="text-sm font-semibold uppercase tracking-wider opacity-80">Total revenue</h3>
          <div className="mt-2 text-4xl font-extrabold">
            {formatCurrency(payments.filter((p) => p.status === "Paid").reduce((s, p) => s + p.amount, 0), currency)}
          </div>
          <p className="mt-1 text-sm opacity-80">All-time earnings collected</p>
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2.5">
              <span className="text-sm">Avg. monthly revenue</span>
              <span className="font-bold">
                {formatCurrency(monthsData.reduce((s, m) => s + m.earnings, 0) / Math.max(monthsData.length, 1), currency)}
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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Offer business analytics</h2>
            <p className="text-xs text-muted-foreground">Which campaigns are bringing subscribers and revenue.</p>
          </div>
          <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
            {formatCurrency(offerRevenue, currency)} tracked offer revenue
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Offer</TableHead>
                <TableHead>Subscribers</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Health</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offerStats.map(({ offer, subscribers, revenue, progress, health }) => (
                <TableRow key={offer.id}>
                  <TableCell>
                    <div className="font-semibold">{offer.name}</div>
                    <div className="text-xs text-muted-foreground">{offer.discountPercent}% discount · {offer.status}</div>
                  </TableCell>
                  <TableCell className="font-semibold">{subscribers}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-28 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(progress, 100)}%` }} />
                      </div>
                      <span className="text-xs font-semibold">{offer.targetSubscriptions ? `${progress}%` : "No target"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={health === "Going well" ? "font-semibold text-emerald-700" : health === "Needs push" ? "font-semibold text-amber-700" : "font-semibold text-rose-700"}>
                      {health}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(revenue, currency)}</TableCell>
                </TableRow>
              ))}
              {offerStats.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No offer data yet. Create an offer and assign clients to it.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {bestOffer && (
          <div className="mt-4 rounded-xl bg-muted/60 px-4 py-3 text-sm">
            Best campaign: <span className="font-bold">{bestOffer.offer.name}</span> with <span className="font-bold">{bestOffer.subscribers}</span> subscriber{bestOffer.subscribers === 1 ? "" : "s"}.
          </div>
        )}
      </Card>

      <Card className="rounded-2xl border-0 p-5 shadow-soft">
        <div className="mb-4">
          <h2 className="text-lg font-bold">Recent payments</h2>
          <p className="text-xs text-muted-foreground">Latest transactions across your gym</p>
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
              {recent.map((p) => {
                const client = clients.find((c) => c.id === p.clientId);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{client?.fullName ?? p.clientName ?? "—"}</TableCell>
                    <TableCell>{new Date(p.date).toLocaleDateString()}</TableCell>
                    <TableCell>{p.method}</TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(p.amount, currency)}
                    </TableCell>
                  </TableRow>
                );
              })}
              {recent.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No payments yet</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label, hint, highlight }: { to: string; icon: typeof UserPlus; label: string; hint: string; highlight?: boolean }) {
  return (
    <Link
      to={to}
      className={`group flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-glow ${highlight ? "ring-2 ring-primary/40" : ""}`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand text-white">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="font-bold">{label}</div>
          <div className="text-xs text-muted-foreground">{hint}</div>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
    </Link>
  );
}
