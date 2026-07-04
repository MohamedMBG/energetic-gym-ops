import { cn } from "@/lib/utils";
import { translateStatus, useI18n } from "@/lib/i18n";

type Status =
  | "Active"
  | "Expiring soon"
  | "Expired"
  | "Unpaid"
  | "Paid"
  | "Late"
  | "Monthly"
  | "Annual"
  | "Paused"
  | "Ended"
  | "Archived"
  | "Operational"
  | "Maintenance"
  | "Out of service";

const styles: Record<Status, string> = {
  Active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  "Expiring soon": "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  Expired: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  Unpaid: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  Paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Late: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  Monthly: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
  Annual: "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-400",
  Paused: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  Ended: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-400",
  Archived: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-400",
  Operational: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Maintenance: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  "Out of service": "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
};

export function StatusBadge({ status }: { status: Status | string }) {
  const { locale } = useI18n();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        styles[status as Status] ?? "bg-slate-100 text-slate-700",
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {translateStatus(status, locale)}
    </span>
  );
}
