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
        toast.success(editing ? "Pack updated" : "Pack created");
        setDialogOpen(false);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  function confirmDelete() {
    if (!deleteId) return;
    deletePack.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Pack deleted");
        setDeleteId(null);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription packs"
        description="Manage monthly, 3-month, 6-month, yearly and custom gym packs."
        actions={
          <Button onClick={openAdd} className="bg-gradient-brand-strong text-white shadow-soft hover:opacity-90">
            <Plus className="mr-2 h-4 w-4" /> Add pack
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Active packs" value={activePacks} icon={Package} variant="brand" />
        <StatCard label="Default packs" value={defaultPacks} icon={Package} hint="Includes Summer, First Year, Youngers" />
        <StatCard label="Most used" value={mostUsed?.name ?? "None"} icon={Package} variant="warning" hint={`${mostUsed ? usageByPack.get(mostUsed.id) ?? 0 : 0} member${(mostUsed ? usageByPack.get(mostUsed.id) ?? 0 : 0) === 1 ? "" : "s"}`} />
      </div>

      <Card className="rounded-2xl border-0 p-5 shadow-soft">
        <h2 className="mb-4 text-lg font-bold">All packs</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pack</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Members</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Loading...</TableCell>
                </TableRow>
              )}
              {packs.map((pack) => (
                <TableRow key={pack.id}>
                  <TableCell>
                    <div className="font-semibold">{pack.name}</div>
                    <div className="max-w-md truncate text-xs text-muted-foreground">
                      {pack.description || "No description"}{pack.isDefault ? " · default" : ""}
                    </div>
                  </TableCell>
                  <TableCell>{pack.durationMonths} month{pack.durationMonths === 1 ? "" : "s"}</TableCell>
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
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No packs yet</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit pack" : "Add pack"}</DialogTitle>
            <DialogDescription>Set the duration and price members will use when subscribing.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Pack name" error={errors.name}>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value as PackStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Duration in months" error={errors.durationMonths}>
              <Input type="number" min={1} max={36} value={form.durationMonths} onChange={(e) => setForm({ ...form, durationMonths: Number(e.target.value) })} />
            </Field>
            <Field label={`Price (${currency})`} error={errors.price}>
              <Input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description">
                <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={createPack.isPending || updatePack.isPending} className="bg-gradient-brand-strong text-white">
              {createPack.isPending || updatePack.isPending ? "Saving..." : editing ? "Save changes" : "Add pack"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this pack?</AlertDialogTitle>
            <AlertDialogDescription>
              Existing members keep their current subscription details, but they will no longer be linked to this pack.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deletePack.isPending} className="bg-rose-600 text-white hover:bg-rose-700">
              {deletePack.isPending ? "Deleting..." : "Delete"}
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
