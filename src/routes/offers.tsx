import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useClients } from "@/hooks/use-clients";
import { useCreateOffer, useDeleteOffer, useOffers, useUpdateOffer } from "@/hooks/use-offers";
import { usePayments } from "@/hooks/use-payments";
import { useSettings } from "@/hooks/use-settings";
import { useI18n } from "@/lib/i18n";
import { formatCurrency } from "@/lib/storage";
import type { Offer, OfferStatus } from "@/lib/types";

export const Route = createFileRoute("/offers")({
  component: OffersPage,
});

const schema = z.object({
  name: z.string().trim().min(2, "Offer name is required").max(100),
  description: z.string().trim().max(500).default(""),
  discountPercent: z.coerce.number().min(0).max(100),
  startDate: z.string().min(1),
  endDate: z.string().nullable().default(null),
  targetSubscriptions: z.coerce.number().int().min(0),
  status: z.enum(["Active", "Paused", "Ended"]),
});

type FormState = Omit<Offer, "id">;

const empty = (): FormState => ({
  name: "",
  description: "",
  discountPercent: 0,
  startDate: new Date().toISOString().slice(0, 10),
  endDate: null,
  targetSubscriptions: 10,
  status: "Active",
});

function OffersPage() {
  const { t } = useI18n();
  const { data: offers = [], isLoading } = useOffers();
  const { data: clients = [] } = useClients();
  const { data: payments = [] } = usePayments();
  const { data: settings } = useSettings();
  const createOffer = useCreateOffer();
  const updateOffer = useUpdateOffer();
  const deleteOffer = useDeleteOffer();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Offer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const currency = settings?.currency ?? "MAD";
  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

  const stats = useMemo(() => {
    return offers.map((offer) => {
      const offerClients = clients.filter((c) => c.offerId === offer.id);
      const revenue = payments
        .filter((p) => clientMap.get(p.clientId)?.offerId === offer.id && p.status === "Paid")
        .reduce((sum, p) => sum + p.amount, 0);
      const progress = offer.targetSubscriptions > 0
        ? Math.round((offerClients.length / offer.targetSubscriptions) * 100)
        : 0;
      const health = offer.targetSubscriptions === 0 || offerClients.length >= offer.targetSubscriptions
        ? "Going well"
        : progress >= 50
          ? "Needs push"
          : "Under target";

      return { offer, subscribers: offerClients.length, revenue, progress, health };
    });
  }, [clientMap, clients, offers, payments]);

  const activeOffers = offers.filter((offer) => offer.status === "Active").length;
  const offerSubscribers = clients.filter((client) => client.offerId).length;
  const offerRevenue = stats.reduce((sum, row) => sum + row.revenue, 0);
  const bestOffer = [...stats].sort((a, b) => b.subscribers - a.subscribers)[0];

  function openAdd() {
    setEditing(null);
    setForm(empty());
    setErrors({});
    setDialogOpen(true);
  }

  function openEdit(offer: Offer) {
    setEditing(offer);
    setForm({
      name: offer.name,
      description: offer.description,
      discountPercent: offer.discountPercent,
      startDate: offer.startDate,
      endDate: offer.endDate,
      targetSubscriptions: offer.targetSubscriptions,
      status: offer.status,
    });
    setErrors({});
    setDialogOpen(true);
  }

  function submit() {
    const result = schema.safeParse(form);
    if (!result.success) {
      const next: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        next[issue.path.join(".")] = issue.message;
      });
      setErrors(next);
      return;
    }

    const data = { ...result.data, endDate: result.data.endDate || null };
    const mutation = editing
      ? updateOffer.mutate.bind(updateOffer, { id: editing.id, data })
      : createOffer.mutate.bind(createOffer, data);

    mutation({
      onSuccess: () => {
        toast.success(editing ? t("offers.updated") : t("offers.created"));
        setDialogOpen(false);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  function confirmDelete() {
    if (!deleteId) return;
    deleteOffer.mutate(deleteId, {
      onSuccess: () => {
        toast.success(t("offers.deleted"));
        setDeleteId(null);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("offers.title")}
        description={t("offers.description")}
        actions={
          <Button onClick={openAdd} className="bg-gradient-brand-strong text-white shadow-soft hover:opacity-90">
            <Plus className="mr-2 h-4 w-4" /> {t("offers.add")}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("offers.activeOffers")} value={activeOffers} icon={Plus} variant="brand" hint={t("offers.currentlyRunning")} />
        <StatCard label={t("offers.offerSubscribers")} value={offerSubscribers} icon={Plus} hint={t("offers.clientsAssigned")} />
        <StatCard label={t("offers.offerRevenue")} value={formatCurrency(offerRevenue, currency)} icon={Plus} variant="brand" hint={t("offers.paidRevenue")} />
        <StatCard label={t("offers.bestOffer")} value={bestOffer?.offer.name ?? t("common.none")} icon={Plus} variant="warning" hint={`${bestOffer?.subscribers ?? 0} ${t((bestOffer?.subscribers ?? 0) === 1 ? "dashboard.subscriber" : "dashboard.subscribersPlural")}`} />
      </div>

      <Card className="rounded-2xl border-0 p-5 shadow-soft">
        <h2 className="mb-4 text-lg font-bold">{t("offers.performance")}</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.offer")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead>{t("common.discount")}</TableHead>
                <TableHead>{t("common.subscribers")}</TableHead>
                <TableHead>{t("common.revenue")}</TableHead>
                <TableHead>{t("common.health")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">{t("common.loading")}</TableCell>
                </TableRow>
              )}
              {stats.map(({ offer, subscribers, revenue, progress, health }) => (
                <TableRow key={offer.id}>
                  <TableCell>
                    <div className="font-semibold">{offer.name}</div>
                    <div className="max-w-md truncate text-xs text-muted-foreground">{offer.description || t("common.noDescription")}</div>
                  </TableCell>
                  <TableCell><StatusBadge status={offer.status} /></TableCell>
                  <TableCell>{offer.discountPercent}%</TableCell>
                  <TableCell>
                    <div className="font-semibold">{subscribers} / {offer.targetSubscriptions || "-"}</div>
                    <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(progress, 100)}%` }} />
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">{formatCurrency(revenue, currency)}</TableCell>
                  <TableCell>
                    <span className={health === "Going well" ? "font-semibold text-emerald-700" : health === "Needs push" ? "font-semibold text-amber-700" : "font-semibold text-rose-700"}>
                      {t(`health.${health}`)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(offer)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(offer.id)}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && offers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">{t("offers.noOffers")}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? t("offers.editTitle") : t("offers.createTitle")}</DialogTitle>
            <DialogDescription>{t("offers.dialogDescription")}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("offers.name")} error={errors.name}>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label={t("common.status")}>
              <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value as OfferStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">{t("status.Active")}</SelectItem>
                  <SelectItem value="Paused">{t("status.Paused")}</SelectItem>
                  <SelectItem value="Ended">{t("status.Ended")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("offers.discountPercent")} error={errors.discountPercent}>
              <Input type="number" min={0} max={100} value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: Number(e.target.value) })} />
            </Field>
            <Field label={t("offers.targetSubscriptions")} error={errors.targetSubscriptions}>
              <Input type="number" min={0} value={form.targetSubscriptions} onChange={(e) => setForm({ ...form, targetSubscriptions: Number(e.target.value) })} />
            </Field>
            <Field label={t("offers.startDate")} error={errors.startDate}>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </Field>
            <Field label={t("offers.endDate")}>
              <Input type="date" value={form.endDate ?? ""} onChange={(e) => setForm({ ...form, endDate: e.target.value || null })} />
            </Field>
            <div className="sm:col-span-2">
              <Field label={t("common.description")}>
                <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={submit} disabled={createOffer.isPending || updateOffer.isPending} className="bg-gradient-brand-strong text-white">
              {createOffer.isPending || updateOffer.isPending ? t("common.saving") : editing ? t("common.saveChanges") : t("offers.createTitle")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("offers.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("offers.deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleteOffer.isPending} className="bg-rose-600 text-white hover:bg-rose-700">
              {deleteOffer.isPending ? t("common.deleting") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      {children}
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
