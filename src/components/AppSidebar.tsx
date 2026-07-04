import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  Package,
  CreditCard,
  BadgePercent,
  Wrench,
  Mail,
  BarChart3,
  Settings as SettingsIcon,
  UserCog,
  LogOut,
} from "lucide-react";
import { api, clearAuthToken } from "@/lib/api";
import { BusinessLogo } from "@/components/BusinessLogo";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Permission } from "@/lib/types";

const items = [
  { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard, permission: null },
  { to: "/clients", labelKey: "nav.clients", icon: Users, permission: "clients" },
  { to: "/subscriptions", labelKey: "nav.subscriptions", icon: CalendarClock, permission: "clients" },
  { to: "/packs", labelKey: "nav.packs", icon: Package, permission: "packs" },
  { to: "/offers", labelKey: "nav.offers", icon: BadgePercent, permission: "offers" },
  { to: "/equipment", labelKey: "nav.equipment", icon: Wrench, permission: "equipment" },
  { to: "/payments", labelKey: "nav.payments", icon: CreditCard, permission: "payments" },
  { to: "/reminders", labelKey: "nav.reminders", icon: Mail, permission: "clients" },
  { to: "/reports", labelKey: "nav.reports", icon: BarChart3, permission: "reports" },
  { to: "/staff", labelKey: "nav.staff", icon: UserCog, permission: "staff" },
  { to: "/settings", labelKey: "nav.settings", icon: SettingsIcon, permission: "settings" },
] satisfies { to: string; labelKey: string; icon: typeof LayoutDashboard; permission: Permission | null }[];

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useI18n();
  const { data: auth } = useAuth();
  const visibleItems = items.filter(
    (it) => !it.permission || auth?.user.isOwner || auth?.user.permissions.includes(it.permission),
  );

  return (
    <aside className="flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center gap-3 px-6 py-6">
        <BusinessLogo className="h-12 w-12 shrink-0" />
        <div>
          <div className="text-lg font-extrabold tracking-tight">
            <span className="text-gradient-brand">Seven Up</span> Gym
          </div>
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
            {t("app.adminSuite")}
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {visibleItems.map((it) => {
          const active = pathname === it.to;
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-gradient-brand text-white shadow-soft"
                  : "text-sidebar-foreground hover:bg-sidebar-accent",
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-white" : "text-primary")} />
              {t(it.labelKey)}
            </Link>
          );
        })}
      </nav>

      <div className="m-3 rounded-2xl bg-gradient-brand p-4 text-white shadow-soft">
        <div className="text-xs font-semibold uppercase tracking-wider opacity-90">{t("app.proTip")}</div>
        <p className="mt-1 text-sm leading-snug">
          {t("app.proTipText")}
        </p>
      </div>

      <div className="px-3 pb-4">
        <button
          onClick={async () => {
            await api.post("/api/auth/logout", {});
            clearAuthToken();
            window.location.href = "/login";
          }}
          className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-all hover:bg-rose-50 hover:text-rose-600"
        >
          <LogOut className="h-4 w-4 text-muted-foreground group-hover:text-rose-600" />
          {t("app.signOut")}
        </button>
      </div>
    </aside>
  );
}
