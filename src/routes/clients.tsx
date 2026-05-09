import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  clientStatus,
  computeEndDate,
  formatCurrency,
  getClients,
  getSettings,
  saveClients,
  uid,
} from "@/lib/storage";
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
  subscriptionType: z.enum(["Monthly", "Annual"]),
  subscriptionStart: z.string().min(1),
  paymentStatus: z.enum(["Paid", "Unpaid", "Late"]),
  amountPaid: z.coerce.number().min(0),
  notes: z.string().max(500).optional().default(""),
});

const empty = (): Omit<Client, "id" | "subscriptionEnd" | "lastPaymentDate"> => ({
  fullName: "",
  phone: "",
  email: "",
  gender: "Male",
  joinDate: new Date().toISOString().slice(0, 10),
  subscriptionType: "Monthly",
  subscriptionStart: new Date().toISOString().slice(0, 10),
  paymentStatus: "Paid",
  amountPaid: 0,
  notes: "",
});

function ClientsPage() {
  const settings = useMemo(() => getSettings(), []);
  const [clients, setClients] = useState<Client[]>(() => getClients());
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState(empty());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = clients.filter((c) => {
    const q = query.toLowerCase();
    const matchesQ = !q || c.fullName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone.includes(q);
    const matchesType = typeFilter === "all" || c.subscriptionType === typeFilter;
    const status = clientStatus(c);
    const matchesStatus = statusFilter === "all" || status === statusFilter;
    return matchesQ && matchesType && matchesStatus;
  });

  function persist(next: Client[]) {
    setClients(next);
    saveClients(next);
  }

  function openAdd() {
    setEditing(null);
    setForm({ ...empty(), amountPaid: settings.monthlyPrice });
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
      subscriptionType: c.subscriptionType,
      subscriptionStart: c.subscriptionStart,
      paymentStatus: c.paymentStatus,
      amountPaid: c.amountPaid,
      notes: c.notes,
    });
    setErrors({});
    setDialogOpen(true);
  }

  function submit() {
    const result = schema.safeParse(form);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((i) => {
        errs[i.path.join(".")] = i.message;
      });
      setErrors(errs);
      return;
    }
    const data = result.data;
    const subscriptionEnd = computeEndDate(data.subscriptionStart, data.subscriptionType);
    if (editing) {
      const next = clients.map((c) =>
        c.id === editing.id
          ? {
              ...c,
              ...data,
              subscriptionEnd,
              lastPaymentDate: data.paymentStatus === "Paid" ? data.subscriptionStart : c.lastPaymentDate,
              notes: data.notes ?? "",
            }
          : c,
      );
      persist(next);
      toast.success("Client updated");
    } else {
      const newClient: Client = {
        id: uid(),
        ...data,
        notes: data.notes ?? "",
        subscriptionEnd,
        lastPaymentDate: data.paymentStatus === "Paid" ? data.subscriptionStart : null,
      };
      persist([newClient, ...clients]);
      toast.success("Client added");
    }
    setDialogOpen(false);
  }

  function confirmDelete() {
    if (!deleteId) return;
    persist(clients.filter((c) => c.id !== deleteId));
    toast.success("Client removed");
    setDeleteId(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Manage members, subscriptions and contact details."
        actions={
          <Button onClick={openAdd} className="bg-gradient-brand-strong text-white shadow-soft hover:opacity-90">
            <Plus className="mr-2 h-4 w-4" /> Add client
          </Button>
        }
      />

      <Card className="rounded-2xl border-0 p-4 shadow-soft md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email or phone…"
              className="h-10 rounded-xl pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-10 w-full rounded-xl md:w-44">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="Monthly">Monthly</SelectItem>
              <SelectItem value="Annual">Annual</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 w-full rounded-xl md:w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Expiring soon">Expiring soon</SelectItem>
              <SelectItem value="Expired">Expired</SelectItem>
              <SelectItem value="Unpaid">Unpaid</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>End date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => {
                const status = clientStatus(c);
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-brand text-xs font-bold text-white">
                          {c.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                        </div>
                        <div>
                          <div className="font-semibold">{c.fullName}</div>
                          <div className="text-xs text-muted-foreground">{c.gender} · joined {new Date(c.joinDate).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{c.email}</div>
                      <div className="text-xs text-muted-foreground">{c.phone}</div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.subscriptionType} />
                    </TableCell>
                    <TableCell>{new Date(c.subscriptionEnd).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <StatusBadge status={status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={c.paymentStatus} />
                        <span className="text-xs text-muted-foreground">{formatCurrency(c.amountPaid, settings.currency)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)}>
                          <Trash2 className="h-4 w-4 text-rose-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    No clients found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit client" : "Add new client"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update member information and subscription." : "Register a new member to your gym."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full name" error={errors.fullName}>
              <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </Field>
            <Field label="Phone" error={errors.phone}>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Email" error={errors.email}>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Gender">
              <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v as "Male" | "Female" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Join date">
              <Input type="date" value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} />
            </Field>
            <Field label="Subscription type">
              <Select
                value={form.subscriptionType}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    subscriptionType: v as "Monthly" | "Annual",
                    amountPaid: v === "Monthly" ? settings.monthlyPrice : settings.annualPrice,
                  })
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Subscription start">
              <Input type="date" value={form.subscriptionStart} onChange={(e) => setForm({ ...form, subscriptionStart: e.target.value })} />
            </Field>
            <Field label="End date (auto)">
              <Input value={computeEndDate(form.subscriptionStart, form.subscriptionType)} readOnly className="bg-muted" />
            </Field>
            <Field label="Payment status">
              <Select value={form.paymentStatus} onValueChange={(v) => setForm({ ...form, paymentStatus: v as "Paid" | "Unpaid" | "Late" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Unpaid">Unpaid</SelectItem>
                  <SelectItem value="Late">Late</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={`Amount paid (${settings.currency})`} error={errors.amountPaid}>
              <Input type="number" min={0} value={form.amountPaid} onChange={(e) => setForm({ ...form, amountPaid: Number(e.target.value) })} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Notes">
                <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </Field>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={submit} className="bg-gradient-brand-strong text-white">
              {editing ? "Save changes" : "Add client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this client?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the client. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-rose-600 text-white hover:bg-rose-700">
              Delete
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
