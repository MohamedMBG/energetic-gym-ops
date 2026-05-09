import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  variant?: "brand" | "white" | "warning" | "danger";
}

export function StatCard({ label, value, icon: Icon, hint, variant = "white" }: StatCardProps) {
  const isBrand = variant === "brand";
  return (
    <Card
      className={cn(
        "relative overflow-hidden rounded-2xl border-0 p-5 shadow-soft transition-transform hover:-translate-y-0.5",
        isBrand
          ? "bg-gradient-brand-strong text-white"
          : variant === "warning"
            ? "bg-gradient-to-br from-amber-50 to-yellow-100 text-foreground"
            : variant === "danger"
              ? "bg-gradient-to-br from-rose-50 to-orange-100 text-foreground"
              : "bg-card text-foreground",
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <div
            className={cn(
              "text-xs font-semibold uppercase tracking-wider",
              isBrand ? "text-white/80" : "text-muted-foreground",
            )}
          >
            {label}
          </div>
          <div className="mt-2 text-3xl font-extrabold tracking-tight">{value}</div>
          {hint && (
            <div
              className={cn(
                "mt-1 text-xs",
                isBrand ? "text-white/80" : "text-muted-foreground",
              )}
            >
              {hint}
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl",
            isBrand ? "bg-white/20" : "bg-gradient-brand text-white",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {isBrand && (
        <div className="pointer-events-none absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
      )}
    </Card>
  );
}
