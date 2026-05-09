import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  CreditCard,
  Mail,
  BarChart3,
  Settings as SettingsIcon,
  Dumbbell,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/subscriptions", label: "Subscriptions", icon: CalendarClock },
  { to: "/payments", label: "Payments", icon: CreditCard },
  { to: "/reminders", label: "Reminders", icon: Mail },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand-strong shadow-glow">
          <Dumbbell className="h-5 w-5 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <div className="text-lg font-extrabold tracking-tight">
            <span className="text-gradient-brand">7up</span> Gym
          </div>
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Admin Suite
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {items.map((it) => {
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
              <Icon className={cn("h-4.5 w-4.5", active ? "text-white" : "text-primary")} />
              {it.label}
            </Link>
          );
        })}
      </nav>

      <div className="m-3 rounded-2xl bg-gradient-brand p-4 text-white shadow-soft">
        <div className="text-xs font-semibold uppercase tracking-wider opacity-90">Pro tip</div>
        <p className="mt-1 text-sm leading-snug">
          Send reminders 7 days before renewal to boost retention.
        </p>
      </div>
    </aside>
  );
}
