import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, Dumbbell, Pencil, Plus, Trash2, Wrench } from "lucide-react";
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
import { useCreateEquipment, useDeleteEquipment, useEquipment, useUpdateEquipment } from "@/hooks/use-equipment";
import { useSettings } from "@/hooks/use-settings";
import { useI18n } from "@/lib/i18n";
import { formatCurrency } from "@/lib/storage";
import type { Equipment, EquipmentStatus } from "@/lib/types";

export const Route = createFileRoute("/equipment")({
  component: EquipmentPage,
});

const schema = z.object({
  name: z.string().trim().min(2, "Equipment name is required").max(120),
  category: z.string().trim().min(2, "Category is required").max(80),
  status: z.enum(["Operational", "Maintenance", "Out of service"]),
  lastMaintenanceDate: z.string().nullable().default(null),
  nextMaintenanceDate: z.string().nullable().default(null),
  repairCost: z.coerce.number().min(0),
  supplierName: z.string().trim().max(120).default(""),
  supplierPhone: z.string().trim().max(40).default(""),
  notes: z.string().trim().max(500).default(""),
});

type FormState = Omit<Equipment, "id">;

const empty = (): FormState => ({
  name: "",
  category: "Machine",
  status: "Operational",
  lastMaintenanceDate: null,
  nextMaintenanceDate: null,
  repairCost: 0,
  supplierName: "",
  supplierPhone: "",
  notes: "",
});

function EquipmentPage() {
  const { t } = useI18n();
  const { data: equipment = [], isLoading } = useEquipment();
  const { data: settings } = useSettings();
  const createEquipment = useCreateEquipment();
  const updateEquipment = useUpdateEquipment();
  const deleteEquipment = useDeleteEquipment();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const currency = settings?.currency ?? "MAD";
  const today = new Date().toISOString().slice(0, 10);

  const stats = useMemo(() => {
    const outOfService = equipment.filter((item) => item.status === "Out of service").length;
    const inMaintenance = equipment.filter((item) => item.status === "Maintenance").length;
    const dueSoon = equipment.filter((item) => {
      if (!item.nextMaintenanceDate) return false;
      const days = Math.ceil((new Date(item.nextMaintenanceDate).getTime() - Date.now()) / 86_400_000);
      return days <= 14;
    }).length;
    const repairCost = equipment.reduce((sum, item) => sum + item.repairCost, 0);

    return { outOfService, inMaintenance, dueSoon, repairCost };
  }, [equipment]);

  function openAdd() {
    setEditing(null);
    setForm(empty());
    setErrors({});
    setDialogOpen(true);
  }

  function openEdit(item: Equipment) {
    setEditing(item);
    setForm({
      name: item.name,
      category: item.category,
      status: item.status,
      lastMaintenanceDate: item.lastMaintenanceDate,
      nextMaintenanceDate: item.nextMaintenanceDate,
      repairCost: item.repairCost,
      supplierName: item.supplierName,
      supplierPhone: item.supplierPhone,
      notes: item.notes,
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

    const data = {
      ...result.data,
      lastMaintenanceDate: result.data.lastMaintenanceDate || null,
      nextMaintenanceDate: result.data.nextMaintenanceDate || null,
    };
    const mutation = editing
      ? updateEquipment.mutate.bind(updateEquipment, { id: editing.id, data })
      : createEquipment.mutate.bind(createEquipment, data);

    mutation({
      onSuccess: () => {
        toast.success(editing ? t("equipment.updated") : t("equipment.added"));
        setDialogOpen(false);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  function confirmDelete() {
    if (!deleteId) return;
    deleteEquipment.mutate(deleteId, {
      onSuccess: () => {
        toast.success(t("equipment.deleted"));
        setDeleteId(null);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("equipment.title")}
        description={t("equipment.description")}
        actions={
          <Button onClick={openAdd} className="bg-gradient-brand-strong text-white shadow-soft hover:opacity-90">
            <Plus className="mr-2 h-4 w-4" /> {t("equipment.add")}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("equipment.total")} value={equipment.length} icon={Dumbbell} variant="brand" />
        <StatCard label={t("equipment.dueSoon")} value={stats.dueSoon} icon={Wrench} hint={t("equipment.nextMaintenance14")} />
        <StatCard label={t("equipment.outOfService")} value={stats.outOfService} icon={AlertTriangle} variant="warning" />
        <StatCard label={t("equipment.repairCosts")} value={formatCurrency(stats.repairCost, currency)} icon={Wrench} hint={t("equipment.totalTrackedExpenses")} />
      </div>

      <Card className="rounded-2xl border-0 p-5 shadow-soft">
        <h2 className="mb-4 text-lg font-bold">{t("equipment.list")}</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("equipment.item")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead>{t("equipment.lastMaintenance")}</TableHead>
                <TableHead>{t("equipment.nextMaintenance")}</TableHead>
                <TableHead>{t("equipment.repairCost")}</TableHead>
                <TableHead>{t("equipment.supplier")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">{t("common.loading")}</TableCell>
                </TableRow>
              )}
              {equipment.map((item) => {
                const overdue = item.nextMaintenanceDate && item.nextMaintenanceDate < today;
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-semibold">{item.name}</div>
                      <div className="max-w-xs truncate text-xs text-muted-foreground">
                        {item.category}{item.notes ? ` · ${item.notes}` : ""}
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge status={item.status} /></TableCell>
                    <TableCell>{item.lastMaintenanceDate || "-"}</TableCell>
                    <TableCell>
                      <span className={overdue ? "font-semibold text-rose-700" : ""}>
                        {item.nextMaintenanceDate || "-"}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold">{formatCurrency(item.repairCost, currency)}</TableCell>
                    <TableCell>
                      <div>{item.supplierName || "-"}</div>
                      {item.supplierPhone && <div className="text-xs text-muted-foreground">{item.supplierPhone}</div>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(item.id)}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!isLoading && equipment.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">{t("equipment.noEquipment")}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? t("equipment.editTitle") : t("equipment.addTitle")}</DialogTitle>
            <DialogDescription>{t("equipment.dialogDescription")}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("equipment.name")} error={errors.name}>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label={t("equipment.category")} error={errors.category}>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder={t("equipment.categoryPlaceholder")} />
            </Field>
            <Field label={t("common.status")}>
              <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value as EquipmentStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Operational">{t("status.Operational")}</SelectItem>
                  <SelectItem value="Maintenance">{t("status.Maintenance")}</SelectItem>
                  <SelectItem value="Out of service">{t("status.Out of service")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={`${t("equipment.repairCost")} (${currency})`} error={errors.repairCost}>
              <Input type="number" min={0} value={form.repairCost} onChange={(e) => setForm({ ...form, repairCost: Number(e.target.value) })} />
            </Field>
            <Field label={t("equipment.lastMaintenance")}>
              <Input type="date" value={form.lastMaintenanceDate ?? ""} onChange={(e) => setForm({ ...form, lastMaintenanceDate: e.target.value || null })} />
            </Field>
            <Field label={t("equipment.nextMaintenance")}>
              <Input type="date" value={form.nextMaintenanceDate ?? ""} onChange={(e) => setForm({ ...form, nextMaintenanceDate: e.target.value || null })} />
            </Field>
            <Field label={t("equipment.supplierName")}>
              <Input value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} />
            </Field>
            <Field label={t("equipment.supplierPhone")}>
              <Input value={form.supplierPhone} onChange={(e) => setForm({ ...form, supplierPhone: e.target.value })} />
            </Field>
            <div className="sm:col-span-2">
              <Field label={t("clients.notes")}>
                <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={submit} disabled={createEquipment.isPending || updateEquipment.isPending} className="bg-gradient-brand-strong text-white">
              {createEquipment.isPending || updateEquipment.isPending ? t("common.saving") : editing ? t("common.saveChanges") : t("equipment.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("equipment.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("equipment.deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleteEquipment.isPending} className="bg-rose-600 text-white hover:bg-rose-700">
              {deleteEquipment.isPending ? t("common.deleting") : t("common.delete")}
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
