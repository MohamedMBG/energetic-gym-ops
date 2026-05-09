import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { clientStatus, getClients } from "@/lib/storage";

export const Route = createFileRoute("/subscriptions")({
  component: SubscriptionsPage,
});

function SubscriptionsPage() {
  const clients = useMemo(() => getClients(), []);

  const groups = useMemo(() => {
    const out: Record<string, typeof clients> = {
      Active: [], "Expiring soon": [], Expired: [], Unpaid: [],
    };
    clients.forEach((c) => {
      const s = clientStatus(c);
      out[s].push(c);
    });
    return out;
  }, [clients]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription tracking"
        description="Monitor every member's subscription lifecycle and renewal status."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(["Active", "Expiring soon", "Expired", "Unpaid"] as const).map((label) => (
          <Card key={label} className="rounded-2xl border-0 p-4 shadow-soft">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
            <div className="mt-2 text-3xl font-extrabold">{groups[label].length}</div>
            <div className="mt-2"><StatusBadge status={label} /></div>
          </Card>
        ))}
      </div>

      <Card className="rounded-2xl border-0 p-5 shadow-soft">
        <h2 className="mb-4 text-lg font-bold">All subscriptions</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Days left</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((c) => {
                const days = Math.ceil((new Date(c.subscriptionEnd).getTime() - Date.now()) / 86400000);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.fullName}</TableCell>
                    <TableCell><StatusBadge status={c.subscriptionType} /></TableCell>
                    <TableCell>{new Date(c.subscriptionStart).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(c.subscriptionEnd).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <span className={days < 0 ? "text-rose-600 font-semibold" : days <= 7 ? "text-amber-700 font-semibold" : ""}>
                        {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}
                      </span>
                    </TableCell>
                    <TableCell><StatusBadge status={clientStatus(c)} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
