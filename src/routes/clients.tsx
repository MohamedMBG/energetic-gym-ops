import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { assuranceStatus, clientStatus, computeAssuranceEndDate, computeEndDate, formatCurrency } from "@/lib/storage";
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from "@/hooks/use-clients";
import { useCreatePayment } from "@/hooks/use-payments";
import { useSettings } from "@/hooks/use-settings";
import { useOffers } from "@/hooks/use-offers";
import { usePacks } from "@/hooks/use-packs";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import type { Client } from "@/lib/types";

export const Route = createFileRoute("/clients")({
  component: ClientsPage,
});

const schema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(100),
  phone: z.string().trim().min(5, "Phone is required").max(30),
  email: z.string().trim().email("Invalid email").max(120),
  gender: z.enum(["Male", "Female"]),
  joinDate: z.string().min(1),
  trainingAccess: z.enum(["Martial Arts", "Gym & Bodybuilding", "Both"]),
  subscriptionType: z.string().trim().min(2),
  subscriptionPlanId: z.string().nullable().default(null),
  subscriptionDurationMonths: z.coerce.number().int().min(1).max(36),
  subscriptionStart: z.string().min(1),
  assuranceFee: z.coerce.number().min(0),
  assuranceStart: z.string().nullable().default(null),
  assurancePaymentStatus: z.enum(["Paid", "Unpaid"]),
  offerId: z.string().nullable().default(null),
  paymentStatus: z.enum(["Paid", "Unpaid", "Late"]),
  amountPaid: z.coerce.number().min(0),
  paymentMethod: z.enum(["Cash", "Card", "Bank transfer"]).default("Cash"),
  notes: z.string().max(500).optional().default(""),
});

type FormState = Omit<Client, "id" | "subscriptionEnd" | "lastPaymentDate" | "assuranceEnd"> & {
  paymentMethod: "Cash" | "Card" | "Bank transfer";
};

const empty = (): FormState => ({
  fullName: "",
  phone: "",
  email: "",
  gender: "Male",
  joinDate: new Date().toISOString().slice(0, 10),
  trainingAccess: "Gym & Bodybuilding",
  subscriptionType: "Monthly",
  subscriptionPlanId: null,
  subscriptionDurationMonths: 1,
  subscriptionStart: new Date().toISOString().slice(0, 10),
  assuranceFee: 200,
  assuranceStart: new Date().toISOString().slice(0, 10),
  assurancePaymentStatus: "Paid",
  offerId: null,
  paymentStatus: "Paid",
  amountPaid: 0,
  paymentMethod: "Cash",
  notes: "",
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

function inferTrainingAccess(packName: string): Client["trainingAccess"] | null {
  const name = packName.toLowerCase();
  if (name.includes("both") || name.includes("full access")) return "Both";
  if (name.includes("martial")) return "Martial Arts";
  if (name.includes("bodybuilding") || name.includes("gym")) return "Gym & Bodybuilding";
  return null;
}

function ClientsPage() {
  const { t } = useI18n();
  const { data: settings } = useSettings();
  const { data: offers = [] } = useOffers();
  const { data: packs = [] } = usePacks();
  const { data: clients = [], isLoading } = useClients();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const createPayment = useCreatePayment();

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<FormState>(empty());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const currency = settings?.currency ?? "MAD";
  const isPending = createClient.isPending || updateClient.isPending;
  const advancedError = !!(errors.subscriptionDurationMonths || errors.assuranceFee);
  const activePacks = packs.filter((pack) => pack.status === "Active");
  const typeOptions = Array.from(new Set(clients.map((c) => c.subscriptionType))).filter(Boolean);

  const filtered = clients.filter((c) => {
    const q = query.toLowerCase();
    const matchesQ = !q || c.fullName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone.includes(q);
    const matchesType = typeFilter === "all" || c.subscriptionType === typeFilter;
    const status = clientStatus(c);
    const matchesStatus = statusFilter === "all" || status === statusFilter;
    return matchesQ && matchesType && matchesStatus;
  });

  function openAdd() {
    const defaultPack = activePacks[0];
    setEditing(null);
    setForm({
      ...empty(),
      subscriptionType: defaultPack?.name ?? "Monthly",
      subscriptionPlanId: defaultPack?.id ?? null,
      subscriptionDurationMonths: defaultPack?.durationMonths ?? 1,
      trainingAccess: defaultPack ? inferTrainingAccess(defaultPack.name) ?? "Gym & Bodybuilding" : "Gym & Bodybuilding",
      amountPaid: defaultPack?.price ?? settings?.monthlyPrice ?? 0,
    });
    setErrors({});
    setDialogOpen(true);
  }

  function openEdit(c: Client) {
    setEditing(c);
    setForm({
      fullName: c.fullName,
      phone: c.phone,
      email: c.email,
      gender: c.gender,
      joinDate: c.joinDate,
      trainingAccess: c.trainingAccess ?? "Gym & Bodybuilding",
      subscriptionType: c.subscriptionType,
      subscriptionPlanId: c.subscriptionPlanId ?? null,
      subscriptionDurationMonths: c.subscriptionDurationMonths ?? (c.subscriptionType === "Annual" ? 12 : 1),
      subscriptionStart: c.subscriptionStart,
      assuranceFee: c.assuranceFee ?? 200,
      assuranceStart: c.assuranceStart ?? c.subscriptionStart,
      assurancePaymentStatus: c.assurancePaymentStatus ?? "Paid",
      offerId: c.offerId ?? null,
      paymentStatus: c.paymentStatus,
      amountPaid: c.amountPaid,
      paymentMethod: "Cash",
      notes: c.notes,
    });
    setErrors({});
    setDialogOpen(true);
  }

  function submit() {
    const result = schema.safeParse(form);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((i) => { errs[i.path.join(".")] = i.message; });
      setErrors(errs);
      return;
    }
    const data = result.data;
    const subscriptionEnd = computeEndDate(data.subscriptionStart, data.subscriptionDurationMonths);
    const assuranceEnd = data.assuranceStart ? computeAssuranceEndDate(data.assuranceStart) : null;
    const lastPaymentDate = data.paymentStatus === "Paid" ? data.subscriptionStart : null;

    if (editing) {
      updateClient.mutate(
        { id: editing.id, data: { ...data, notes: data.notes ?? "", subscriptionEnd, assuranceEnd, lastPaymentDate } },
        {
          onSuccess: () => { toast.success(t("clients.updated")); setDialogOpen(false); },
          onError: (err) => toast.error(err.message),
        },
      );
    } else {
      createClient.mutate(
        { ...data, notes: data.notes ?? "", subscriptionEnd, assuranceEnd, lastPaymentDate },
        {
          onSuccess: (createdClient) => {
            if (data.paymentStatus === "Paid") {
              createPayment.mutate({
                clientId: createdClient.id,
                amount: data.amountPaid + (data.assurancePaymentStatus === "Paid" ? data.assuranceFee : 0),
                date: data.subscriptionStart,
                periodStart: data.subscriptionStart,
                periodEnd: subscriptionEnd,
                method: data.paymentMethod,
                status: "Paid",
              });
            }
            toast.success(t("clients.added"));
            setDialogOpen(false);
          },
          onError: (err) => toast.error(err.message),
        },
      );
    }
  }

  function confirmDelete() {
    if (!deleteId) return;
    deleteClient.mutate(deleteId, {
      onSuccess: () => { toast.success(t("clients.removed")); setDeleteId(null); },
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("clients.title")}
        description={t("clients.description")}
        actions={
          <Button onClick={openAdd} className="bg-gradient-brand-strong text-white shadow-soft hover:opacity-90">
            <Plus className="mr-2 h-4 w-4" /> {t("clients.add")}
          </Button>
        }
      />

      <Card className="rounded-2xl border-0 p-4 shadow-soft md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("clients.searchPlaceholder")} className="h-10 rounded-xl pl-9" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-10 w-full rounded-xl md:w-44"><SelectValue placeholder={t("common.plan")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("clients.allTypes")}</SelectItem>
              {typeOptions.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 w-full rounded-xl md:w-44"><SelectValue placeholder={t("common.status")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("clients.allStatuses")}</SelectItem>
              <SelectItem value="Active">{t("status.Active")}</SelectItem>
              <SelectItem value="Expiring soon">{t("status.Expiring soon")}</SelectItem>
              <SelectItem value="Expired">{t("status.Expired")}</SelectItem>
              <SelectItem value="Unpaid">{t("status.Unpaid")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.client")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("clients.contact")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("common.plan")}</TableHead>
                <TableHead className="hidden xl:table-cell">{t("common.access")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("clients.endDate")}</TableHead>
                <TableHead className="hidden xl:table-cell">{t("common.assurance")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead>{t("common.payment")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">{t("common.loading")}</TableCell>
                </TableRow>
              )}
              {filtered.map((c) => {
                const status = clientStatus(c);
                const assStatus = assuranceStatus({
                  assuranceEnd: c.assuranceEnd ?? null,
                  assurancePaymentStatus: c.assurancePaymentStatus ?? "Unpaid",
                });
                return (
                  <TableRow key={c.id} className={cn("transition-colors hover:bg-muted/50", subscriptionFlagClass(status), assuranceFlagClass(assStatus))}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-brand text-xs font-bold text-white">
                          {c.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                        </div>
                        <div>
                          <div className="font-semibold">{c.fullName}</div>
                          <div className="text-xs text-muted-foreground">{t(c.gender === "Female" ? "clients.female" : "clients.male")} - {t("clients.joinDate")} {new Date(c.joinDate).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="text-sm">{c.email}</div>
                      <div className="text-xs text-muted-foreground">{c.phone}</div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell"><StatusBadge status={c.subscriptionType} /></TableCell>
                    <TableCell className="hidden xl:table-cell"><StatusBadge status={c.trainingAccess ?? "Gym & Bodybuilding"} /></TableCell>
                    <TableCell className="hidden md:table-cell">{new Date(c.subscriptionEnd).toLocaleDateString()}</TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <div className="flex flex-col gap-1">
                        <StatusBadge status={assStatus} />
                        <span className="text-xs text-muted-foreground">
                          {formatCurrency(c.assuranceFee ?? 200, currency)} {t("common.yearly")}
                          {c.assuranceEnd ? ` - ${t("common.ends")} ${new Date(c.assuranceEnd).toLocaleDateString()}` : ""}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge status={status} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={c.paymentStatus} />
                        <span className="text-xs text-muted-foreground">{formatCurrency(c.amountPaid, currency)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">{t("clients.noClients")}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t("clients.editTitle") : t("clients.addTitle")}</DialogTitle>
            <DialogDescription>
              {editing ? t("clients.editDescription") : t("clients.addDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("clients.fullName")} error={errors.fullName}>
              <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </Field>
            <Field label={t("clients.phone")} error={errors.phone}>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label={t("clients.email")} error={errors.email}>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label={t("clients.subscriptionPack")}>
              <Select
                value={form.subscriptionPlanId ?? "custom"}
                onValueChange={(v) => {
                  const pack = activePacks.find((p) => p.id === v);
                  setForm({
                    ...form,
                    subscriptionPlanId: pack?.id ?? null,
                    subscriptionType: pack?.name ?? form.subscriptionType,
                    subscriptionDurationMonths: pack?.durationMonths ?? form.subscriptionDurationMonths,
                    trainingAccess: pack ? inferTrainingAccess(pack.name) ?? form.trainingAccess : form.trainingAccess,
                    amountPaid: pack?.price ?? form.amountPaid,
                  });
                }}
              >
                <SelectTrigger><SelectValue placeholder={t("clients.selectPack")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">{t("clients.customPack")}</SelectItem>
                  {activePacks.map((pack) => (
                    <SelectItem key={pack.id} value={pack.id}>
                      {pack.name} - {pack.durationMonths} {pack.durationMonths === 1 ? t("common.month") : t("common.months")} - {formatCurrency(pack.price, currency)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("clients.subscriptionStart")}>
              <Input type="date" value={form.subscriptionStart} onChange={(e) => setForm({ ...form, subscriptionStart: e.target.value })} />
            </Field>
            <Field label={t("clients.paymentStatus")}>
              <Select value={form.paymentStatus} onValueChange={(v) => setForm({ ...form, paymentStatus: v as "Paid" | "Unpaid" | "Late" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Paid">{t("status.Paid")}</SelectItem>
                  <SelectItem value="Unpaid">{t("status.Unpaid")}</SelectItem>
                  <SelectItem value="Late">{t("status.Late")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={`${t("clients.amountPaid")} (${currency})`} error={errors.amountPaid}>
              <Input type="number" min={0} value={form.amountPaid} onChange={(e) => setForm({ ...form, amountPaid: Number(e.target.value) })} />
            </Field>
            {!editing && form.paymentStatus === "Paid" && (
              <Field label={t("clients.paymentMethod")}>
                <Select value={form.paymentMethod} onValueChange={(v) => setForm({ ...form, paymentMethod: v as FormState["paymentMethod"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">{t("status.Cash")}</SelectItem>
                    <SelectItem value="Card">{t("status.Card")}</SelectItem>
                    <SelectItem value="Bank transfer">{t("status.Bank transfer")}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
          </div>

          <details open={advancedError || undefined} className="mt-4 rounded-xl border border-border">
            <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-muted-foreground">
              {t("common.moreOptions")}
            </summary>
            <div className="grid grid-cols-1 gap-4 border-t border-border p-4 sm:grid-cols-2">
              <Field label={t("clients.gender")}>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v as "Male" | "Female" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">{t("clients.male")}</SelectItem>
                    <SelectItem value="Female">{t("clients.female")}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t("clients.joinDate")}>
                <Input type="date" value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} />
              </Field>
              <Field label={t("clients.floorAccess")}>
                <Select value={form.trainingAccess} onValueChange={(v) => setForm({ ...form, trainingAccess: v as Client["trainingAccess"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Martial Arts">{t("clients.firstFloor")}</SelectItem>
                    <SelectItem value="Gym & Bodybuilding">{t("clients.secondFloor")}</SelectItem>
                    <SelectItem value="Both">{t("clients.bothFloors")}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t("clients.packName")}>
                <Input value={form.subscriptionType} onChange={(e) => setForm({ ...form, subscriptionType: e.target.value, subscriptionPlanId: null })} />
              </Field>
              <Field label={t("clients.durationMonths")} error={errors.subscriptionDurationMonths}>
                <Input type="number" min={1} max={36} value={form.subscriptionDurationMonths} onChange={(e) => setForm({ ...form, subscriptionDurationMonths: Number(e.target.value), subscriptionPlanId: null })} />
              </Field>
              <Field label={t("clients.endDateAuto")}>
                <Input value={computeEndDate(form.subscriptionStart, form.subscriptionDurationMonths)} readOnly className="bg-muted" />
              </Field>
              <Field label={t("clients.offer")}>
                <Select value={form.offerId ?? "none"} onValueChange={(v) => setForm({ ...form, offerId: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder={t("common.noOffer")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("common.noOffer")}</SelectItem>
                    {offers.map((offer) => (
                      <SelectItem key={offer.id} value={offer.id}>
                        {offer.name} ({offer.discountPercent}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={`${t("clients.assuranceFee")} (${currency})`} error={errors.assuranceFee}>
                <Input type="number" min={0} value={form.assuranceFee} onChange={(e) => setForm({ ...form, assuranceFee: Number(e.target.value) })} />
              </Field>
              <Field label={t("clients.assurancePayment")}>
                <Select value={form.assurancePaymentStatus} onValueChange={(v) => setForm({ ...form, assurancePaymentStatus: v as "Paid" | "Unpaid" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Paid">{t("status.Paid")}</SelectItem>
                    <SelectItem value="Unpaid">{t("status.Unpaid")}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t("clients.assuranceStart")}>
                <Input type="date" value={form.assuranceStart ?? ""} onChange={(e) => setForm({ ...form, assuranceStart: e.target.value || null })} />
              </Field>
              <Field label={t("clients.assuranceEndAuto")}>
                <Input value={form.assuranceStart ? computeAssuranceEndDate(form.assuranceStart) : ""} readOnly className="bg-muted" />
              </Field>
              <div className="sm:col-span-2">
                <Field label={t("clients.notes")}>
                  <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </Field>
              </div>
            </div>
          </details>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={submit} disabled={isPending} className="bg-gradient-brand-strong text-white">
              {isPending ? t("common.saving") : editing ? t("common.saveChanges") : t("clients.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("clients.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("clients.deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleteClient.isPending} className="bg-rose-600 text-white hover:bg-rose-700">
              {deleteClient.isPending ? t("common.deleting") : t("common.delete")}
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
