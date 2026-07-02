import { cn } from "@/lib/utils";

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
  Active: "bg-emerald-100 text-emerald-700",
  "Expiring soon": "bg-amber-100 text-amber-800",
  Expired: "bg-rose-100 text-rose-700",
  Unpaid: "bg-rose-100 text-rose-700",
  Paid: "bg-emerald-100 text-emerald-700",
  Late: "bg-amber-100 text-amber-800",
  Monthly: "bg-orange-100 text-orange-700",
  Annual: "bg-yellow-100 text-yellow-800",
  Paused: "bg-amber-100 text-amber-800",
  Ended: "bg-slate-100 text-slate-700",
  Archived: "bg-slate-100 text-slate-700",
  Operational: "bg-emerald-100 text-emerald-700",
  Maintenance: "bg-amber-100 text-amber-800",
  "Out of service": "bg-rose-100 text-rose-700",
};

export function StatusBadge({ status }: { status: Status | string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        styles[status as Status] ?? "bg-slate-100 text-slate-700",
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}
