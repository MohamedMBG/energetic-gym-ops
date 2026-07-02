import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Package, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useClients } from "@/hooks/use-clients";
import { useCreatePack, useDeletePack, usePacks, useUpdatePack } from "@/hooks/use-packs";
import { useSettings } from "@/hooks/use-settings";
import { useI18n } from "@/lib/i18n";
import { formatCurrency } from "@/lib/storage";
import type { PackStatus, SubscriptionPack } from "@/lib/types";

export const Route = createFileRoute("/packs")({
  component: PacksPage,
});

const schema = z.object({
  name: z.string().trim().min(2, "Pack name is required").max(100),
  durationMonths: z.coerce.number().int().min(1).max(36),
  price: z.coerce.number().min(0),
  description: z.string().trim().max(500).default(""),
  status: z.enum(["Active", "Archived"]),
});

type FormState = Omit<SubscriptionPack, "id" | "isDefault">;

const empty = (): FormState => ({
  name: "",
  durationMonths: 1,
  price: 0,
  description: "",
  status: "Active",
});

function PacksPage() {
  const { t } = useI18n();
  const { data: settings } = useSettings();
  const { data: packs = [], isLoading } = usePacks();
  const { data: clients = [] } = useClients();
  const createPack = useCreatePack();
  const updatePack = useUpdatePack();
  const deletePack = useDeletePack();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionPack | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const currency = settings?.currency ?? "MAD";
  const usageByPack = useMemo(() => {
    const map = new Map<string, number>();
    clients.forEach((client) => {
      if (!client.subscriptionPlanId) return;
      map.set(client.subscriptionPlanId, (map.get(client.subscriptionPlanId) ?? 0) + 1);
    });
    return map;
  }, [clients]);

  const activePacks = packs.filter((pack) => pack.status === "Active").length;
  const defaultPacks = packs.filter((pack) => pack.isDefault).length;
  const mostUsed = [...packs].sort((a, b) => (usageByPack.get(b.id) ?? 0) - (usageByPack.get(a.id) ?? 0))[0];

  function openAdd() {
    setEditing(null);
    setForm(empty());
    setErrors({});
    setDialogOpen(true);
  }

  function openEdit(pack: SubscriptionPack) {
    setEditing(pack);
    setForm({
      name: pack.name,
      durationMonths: pack.durationMonths,
      price: pack.price,
      description: pack.description,
      status: pack.status,
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

    const mutation = editing
      ? updatePack.mutate.bind(updatePack, { id: editing.id, data: result.data })
      : createPack.mutate.bind(createPack, result.data);

    mutation({
      onSuccess: () => {
        toast.success(editing ? t("packs.updated") : t("packs.created"));
        setDialogOpen(false);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  function confirmDelete() {
    if (!deleteId) return;
    deletePack.mutate(deleteId, {
      onSuccess: () => {
        toast.success(t("packs.deleted"));
        setDeleteId(null);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("packs.title")}
        description={t("packs.description")}
        actions={
          <Button onClick={openAdd} className="bg-gradient-brand-strong text-white shadow-soft hover:opacity-90">
            <Plus className="mr-2 h-4 w-4" /> {t("packs.add")}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t("packs.activePacks")} value={activePacks} icon={Package} variant="brand" />
        <StatCard label={t("packs.defaultPacks")} value={defaultPacks} icon={Package} hint={t("packs.defaultHint")} />
        <StatCard label={t("packs.mostUsed")} value={mostUsed?.name ?? t("common.none")} icon={Package} variant="warning" hint={`${mostUsed ? usageByPack.get(mostUsed.id) ?? 0 : 0} ${t("common.members").toLowerCase()}`} />
      </div>

      <Card className="rounded-2xl border-0 p-5 shadow-soft">
        <h2 className="mb-4 text-lg font-bold">{t("packs.all")}</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("packs.pack")}</TableHead>
                <TableHead>{t("packs.duration")}</TableHead>
                <TableHead>{t("common.price")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead>{t("common.members")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">{t("common.loading")}</TableCell>
                </TableRow>
              )}
              {packs.map((pack) => (
                <TableRow key={pack.id}>
                  <TableCell>
                    <div className="font-semibold">{pack.name}</div>
                    <div className="max-w-md truncate text-xs text-muted-foreground">
                      {pack.description || t("common.noDescription")}{pack.isDefault ? ` - ${t("common.default")}` : ""}
                    </div>
                  </TableCell>
                  <TableCell>{pack.durationMonths} {pack.durationMonths === 1 ? t("common.month") : t("common.months")}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(pack.price, currency)}</TableCell>
                  <TableCell><StatusBadge status={pack.status} /></TableCell>
                  <TableCell>{usageByPack.get(pack.id) ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(pack)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(pack.id)}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && packs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">{t("packs.noPacks")}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? t("packs.editTitle") : t("packs.addTitle")}</DialogTitle>
            <DialogDescription>{t("packs.dialogDescription")}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("packs.name")} error={errors.name}>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label={t("common.status")}>
              <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value as PackStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">{t("status.Active")}</SelectItem>
                  <SelectItem value="Archived">{t("status.Archived")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("packs.durationMonths")} error={errors.durationMonths}>
              <Input type="number" min={1} max={36} value={form.durationMonths} onChange={(e) => setForm({ ...form, durationMonths: Number(e.target.value) })} />
            </Field>
            <Field label={`${t("common.price")} (${currency})`} error={errors.price}>
              <Input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
            </Field>
            <div className="sm:col-span-2">
              <Field label={t("common.description")}>
                <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={submit} disabled={createPack.isPending || updatePack.isPending} className="bg-gradient-brand-strong text-white">
              {createPack.isPending || updatePack.isPending ? t("common.saving") : editing ? t("common.saveChanges") : t("packs.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("packs.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("packs.deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deletePack.isPending} className="bg-rose-600 text-white hover:bg-rose-700">
              {deletePack.isPending ? t("common.deleting") : t("common.delete")}
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
