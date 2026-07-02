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
import { assuranceStatus, clientStatus } from "@/lib/storage";
import { useClients, useDeleteClient } from "@/hooks/use-clients";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/subscriptions")({
  component: SubscriptionsPage,
});

function subscriptionFlagClass(status: ReturnType<typeof clientStatus>) {
  if (status === "Expired" || status === "Unpaid") return "border-l-4 border-l-rose-500 bg-rose-50/70";
  if (status === "Expiring soon") return "border-l-4 border-l-amber-400 bg-amber-50/70";
  return "border-l-4 border-l-emerald-500 bg-emerald-50/60";
}

function assuranceFlagClass(status: ReturnType<typeof assuranceStatus>) {
  if (status === "Expired" || status === "Unpaid" || status === "Expiring soon") return "border-l-4 border-l-rose-500 bg-rose-50/70";
  return "";
}

function SubscriptionsPage() {
  const { t } = useI18n();
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
      onSuccess: () => { toast.success(t("subscriptions.deleted")); setDeleteId(null); },
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("subscriptions.title")}
        description={t("subscriptions.description")}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(["Active", "Expiring soon", "Expired", "Unpaid"] as const).map((label) => (
          <Card key={label} className="rounded-2xl border-0 p-4 shadow-soft">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t(`status.${label}`)}</div>
            <div className="mt-2 text-3xl font-extrabold">{groups[label].length}</div>
            <div className="mt-2"><StatusBadge status={label} /></div>
          </Card>
        ))}
      </div>

      <Card className="rounded-2xl border-0 p-5 shadow-soft">
        <h2 className="mb-4 text-lg font-bold">{t("subscriptions.all")}</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.client")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("common.plan")}</TableHead>
                <TableHead className="hidden xl:table-cell">{t("common.access")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("common.start")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("common.end")}</TableHead>
                <TableHead>{t("subscriptions.daysLeft")}</TableHead>
                <TableHead className="hidden xl:table-cell">{t("common.assurance")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">{t("common.loading")}</TableCell>
                </TableRow>
              )}
              {clients.map((c) => {
                const days = Math.ceil((new Date(c.subscriptionEnd).getTime() - Date.now()) / 86400000);
                const status = clientStatus(c);
                const assStatus = assuranceStatus({
                  assuranceEnd: c.assuranceEnd ?? null,
                  assurancePaymentStatus: c.assurancePaymentStatus ?? "Unpaid",
                });
                return (
                  <TableRow key={c.id} className={cn("transition-colors hover:bg-muted/50", subscriptionFlagClass(status), assuranceFlagClass(assStatus))}>
                    <TableCell className="font-medium">{c.fullName}</TableCell>
                    <TableCell className="hidden sm:table-cell"><StatusBadge status={c.subscriptionType} /></TableCell>
                    <TableCell className="hidden xl:table-cell"><StatusBadge status={c.trainingAccess ?? "Gym & Bodybuilding"} /></TableCell>
                    <TableCell className="hidden lg:table-cell">{new Date(c.subscriptionStart).toLocaleDateString()}</TableCell>
                    <TableCell className="hidden md:table-cell">{new Date(c.subscriptionEnd).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <span className={days < 0 ? "text-rose-600 font-semibold" : days <= 5 ? "text-amber-700 font-semibold" : "text-emerald-700 font-semibold"}>
                        {t(days < 0 ? "subscriptions.overdue" : "subscriptions.days").replace("{days}", String(days < 0 ? Math.abs(days) : days))}
                      </span>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <div className="flex flex-col gap-1">
                        <StatusBadge status={assStatus} />
                        <span className="text-xs text-muted-foreground">
                          {c.assuranceEnd ? new Date(c.assuranceEnd).toLocaleDateString() : t("subscriptions.noAssuranceDate")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge status={status} /></TableCell>
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
            <AlertDialogTitle>{t("subscriptions.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("subscriptions.deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteClient.isPending}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              {deleteClient.isPending ? t("common.deleting") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
