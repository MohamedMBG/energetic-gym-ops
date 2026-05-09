import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { clientStatus } from "@/lib/storage";
import { useClients, useDeleteClient } from "@/hooks/use-clients";

export const Route = createFileRoute("/subscriptions")({
  component: SubscriptionsPage,
});

function SubscriptionsPage() {
  const { data: clients = [], isLoading } = useClients();
  const deleteClient = useDeleteClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  function confirmDelete() {
    if (!deleteId) return;
    deleteClient.mutate(deleteId, {
      onSuccess: () => { toast.success("Subscription deleted"); setDeleteId(null); },
      onError: (err) => toast.error(err.message),
    });
  }

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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Loading…</TableCell>
                </TableRow>
              )}
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
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)}>
                        <Trash2 className="h-4 w-4 text-rose-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the client and their subscription. Their payment records are also deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteClient.isPending}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              {deleteClient.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
