import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Users, CalendarDays, CalendarRange, DollarSign, AlertTriangle, Clock, UserPlus, CreditCard, Send, ArrowRight, BadgePercent } from "lucide-react";
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
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const { locale, t } = useI18n();
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
      const label = d.toLocaleString(locale, { month: "short" });
      const total = payments
        .filter((p) => {
          const pd = new Date(p.date);
          return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear() && p.status === "Paid";
        })
        .reduce((s, p) => s + p.amount, 0);
      out.push({ month: label, earnings: total });
    }
    return out;
  }, [locale, payments, thisMonth, thisYear]);

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
        title={t("dashboard.title")}
        description={t("dashboard.description")}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <QuickAction to="/clients" icon={UserPlus} label={t("dashboard.addNewClient")} hint={t("dashboard.registerMember")} />
        <QuickAction to="/offers" icon={BadgePercent} label={t("dashboard.createOffer")} hint={t("dashboard.launchCampaign")} />
        <QuickAction to="/payments" icon={CreditCard} label={t("dashboard.recordPayment")} hint={t("dashboard.logTransaction")} />
        <QuickAction to="/reminders" icon={Send} label={t("dashboard.sendReminders")} hint={`${expiringSoon} ${t("dashboard.dueSoon")}`} highlight={expiringSoon > 0} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label={t("dashboard.activeClients")} value={active} icon={Users} variant="brand" hint={t("dashboard.currentlySubscribed")} />
        <StatCard
          label={t("dashboard.earningsThisMonth")}
          value={formatCurrency(earningsThisMonth, currency)}
          icon={DollarSign}
          variant="brand"
          hint={now.toLocaleString(locale, { month: "long", year: "numeric" })}
        />
        <StatCard label={t("dashboard.unpaidClients")} value={unpaid} icon={AlertTriangle} variant="danger" hint={t("dashboard.needFollowUp")} />
        <StatCard label={t("dashboard.expiringSoon")} value={expiringSoon} icon={Clock} variant="warning" hint={t("dashboard.withinFiveDays")} />
      </div>

      <Card className="rounded-2xl border-0 p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">{t("dashboard.membershipPlans")}</h2>
            <p className="text-xs text-muted-foreground">{t("dashboard.planMixHint")}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-extrabold tracking-tight">{clients.length}</div>
            <div className="text-xs text-muted-foreground">{t("dashboard.totalMembers")}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <PlanStat icon={CalendarDays} label={`1 ${t("common.month")}`} value={monthly} />
          <PlanStat icon={CalendarRange} label={`3 ${t("common.months")}`} value={threeMonth} />
          <PlanStat icon={CalendarRange} label={`6 ${t("common.months")}`} value={sixMonth} />
          <PlanStat icon={CalendarRange} label={`12 ${t("common.months")}`} value={yearly} />
        </div>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
          <span><span className="font-semibold text-foreground">{activeOffers}</span> {t("dashboard.activeOffers").toLowerCase()}</span>
          <span><span className="font-semibold text-foreground">{offerClientRate}%</span> {t("dashboard.offerAdoption").toLowerCase()}</span>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="rounded-2xl border-0 p-5 shadow-soft xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">{t("dashboard.earningsTrend")}</h2>
              <p className="text-xs text-muted-foreground">{t("dashboard.lastSixMonths")}</p>
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
          <h3 className="text-sm font-semibold uppercase tracking-wider opacity-80">{t("dashboard.totalRevenue")}</h3>
          <div className="mt-2 text-4xl font-extrabold">
            {formatCurrency(payments.filter((p) => p.status === "Paid").reduce((s, p) => s + p.amount, 0), currency)}
          </div>
          <p className="mt-1 text-sm opacity-80">{t("dashboard.allTimeEarnings")}</p>
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2.5">
              <span className="text-sm">{t("dashboard.avgMonthlyRevenue")}</span>
              <span className="font-bold">
                {formatCurrency(monthsData.reduce((s, m) => s + m.earnings, 0) / Math.max(monthsData.length, 1), currency)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2.5">
              <span className="text-sm">{t("dashboard.totalMembers")}</span>
              <span className="font-bold">{clients.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2.5">
              <span className="text-sm">{t("dashboard.retentionRate")}</span>
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
            <h2 className="text-lg font-bold">{t("dashboard.offerAnalytics")}</h2>
            <p className="text-xs text-muted-foreground">{t("dashboard.offerAnalyticsDescription")}</p>
          </div>
          <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
            {formatCurrency(offerRevenue, currency)} {t("dashboard.trackedOfferRevenue")}
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.offer")}</TableHead>
                <TableHead>{t("common.subscribers")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("common.progress")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("common.health")}</TableHead>
                <TableHead className="text-right">{t("common.revenue")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offerStats.map(({ offer, subscribers, revenue, progress, health }) => (
                <TableRow key={offer.id}>
                  <TableCell>
                    <div className="font-semibold">{offer.name}</div>
                    <div className="text-xs text-muted-foreground">{offer.discountPercent}% {t("common.discount").toLowerCase()} - {t(`status.${offer.status}`, offer.status)}</div>
                  </TableCell>
                  <TableCell className="font-semibold">{subscribers}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-28 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(progress, 100)}%` }} />
                      </div>
                      <span className="text-xs font-semibold">{offer.targetSubscriptions ? `${progress}%` : t("dashboard.noTarget")}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className={health === "Going well" ? "font-semibold text-emerald-700" : health === "Needs push" ? "font-semibold text-amber-700" : "font-semibold text-rose-700"}>
                      {t(`health.${health}`)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(revenue, currency)}</TableCell>
                </TableRow>
              ))}
              {offerStats.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    {t("dashboard.noOfferData")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {bestOffer && (
          <div className="mt-4 rounded-xl bg-muted/60 px-4 py-3 text-sm">
            {t("dashboard.bestCampaign")}: <span className="font-bold">{bestOffer.offer.name}</span> {t("dashboard.with")} <span className="font-bold">{bestOffer.subscribers}</span> {t(bestOffer.subscribers === 1 ? "dashboard.subscriber" : "dashboard.subscribersPlural")}.
          </div>
        )}
      </Card>

      <Card className="rounded-2xl border-0 p-5 shadow-soft">
        <div className="mb-4">
          <h2 className="text-lg font-bold">{t("dashboard.recentPayments")}</h2>
          <p className="text-xs text-muted-foreground">{t("dashboard.latestTransactions")}</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.client")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("common.date")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("common.method")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead className="text-right">{t("common.amount")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((p) => {
                const client = clients.find((c) => c.id === p.clientId);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{client?.fullName ?? p.clientName ?? "—"}</TableCell>
                    <TableCell className="hidden sm:table-cell">{new Date(p.date).toLocaleDateString()}</TableCell>
                    <TableCell className="hidden md:table-cell">{t(`status.${p.method}`, p.method)}</TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(p.amount, currency)}
                    </TableCell>
                  </TableRow>
                );
              })}
              {recent.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">{t("payments.noPayments")}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

function PlanStat({ icon: Icon, label, value }: { icon: typeof UserPlus; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-xl font-extrabold leading-none tracking-tight">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{label}</div>
      </div>
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
