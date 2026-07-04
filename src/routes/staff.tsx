import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Power, ShieldCheck, Trash2, UserCog, Users as UsersIcon, Clock, Activity } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { formatCurrency } from "@/lib/storage";
import { useSettings } from "@/hooks/use-settings";
import {
  useCreateRole, useCreateStaff, useDeleteRole, useDeleteStaff, useRoles, useStaff,
  useStaffPerformance, useUpdateRole, useUpdateStaff,
} from "@/hooks/use-staff";
import { PERMISSIONS, type Permission, type Role, type StaffMember } from "@/lib/types";

export const Route = createFileRoute("/staff")({
  component: StaffPage,
});

function StaffPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { data: auth, isLoading: authLoading } = useAuth();
  const allowed = !!auth && (auth.user.isOwner || auth.user.permissions.includes("staff"));

  useEffect(() => {
    if (!authLoading && auth && !allowed) navigate({ to: "/" });
  }, [authLoading, auth, allowed, navigate]);

  if (authLoading || !allowed) return null;

  return (
    <div className="space-y-6">
      <PageHeader title={t("staff.title")} description={t("staff.description")} />
      <Tabs defaultValue="staff">
        <TabsList>
          <TabsTrigger value="staff">{t("staff.tabStaff")}</TabsTrigger>
          <TabsTrigger value="roles">{t("staff.tabRoles")}</TabsTrigger>
          <TabsTrigger value="performance">{t("staff.tabPerformance")}</TabsTrigger>
        </TabsList>
        <TabsContent value="staff"><StaffTab /></TabsContent>
        <TabsContent value="roles"><RolesTab /></TabsContent>
        <TabsContent value="performance"><PerformanceTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// --- Staff tab ---

type StaffForm = { email: string; password: string; fullName: string; roleId: string; active: boolean };

const emptyStaffForm = (): StaffForm => ({ email: "", password: "", fullName: "", roleId: "", active: true });

function StaffTab() {
  const { t } = useI18n();
  const { data: staff = [], isLoading } = useStaff();
  const { data: roles = [] } = useRoles();
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const deleteStaff = useDeleteStaff();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<StaffForm>(emptyStaffForm());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const roleName = (roleId: string | null) => roles.find((r) => r.id === roleId)?.name ?? t("staff.noRole");

  function openAdd() {
    setEditing(null);
    setForm(emptyStaffForm());
    setErrors({});
    setDialogOpen(true);
  }

  function openEdit(member: StaffMember) {
    setEditing(member);
    setForm({ email: member.email, password: "", fullName: member.fullName, roleId: member.roleId ?? "", active: member.active });
    setErrors({});
    setDialogOpen(true);
  }

  function submit() {
    if (editing) {
      const schema = z.object({
        fullName: z.string().trim().min(2, "Name is required"),
        roleId: z.string().min(1, "Role is required"),
        password: z.union([z.string().length(0), z.string().min(8, "Password must be at least 8 characters")]),
      });
      const result = schema.safeParse(form);
      if (!result.success) {
        setErrors(Object.fromEntries(result.error.issues.map((i) => [i.path.join("."), i.message])));
        return;
      }

      updateStaff.mutate(
        {
          id: editing.id,
          data: {
            fullName: form.fullName,
            roleId: form.roleId,
            active: form.active,
            ...(form.password ? { password: form.password } : {}),
          },
        },
        {
          onSuccess: () => {
            toast.success(t("staff.updated"));
            setDialogOpen(false);
          },
          onError: (err) => toast.error(err.message),
        },
      );
      return;
    }

    const schema = z.object({
      email: z.string().email("Valid email required"),
      password: z.string().min(8, "Password must be at least 8 characters"),
      fullName: z.string().trim().min(2, "Name is required"),
      roleId: z.string().min(1, "Role is required"),
    });
    const result = schema.safeParse(form);
    if (!result.success) {
      setErrors(Object.fromEntries(result.error.issues.map((i) => [i.path.join("."), i.message])));
      return;
    }

    createStaff.mutate(result.data, {
      onSuccess: () => {
        toast.success(t("staff.added"));
        setDialogOpen(false);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  function confirmDelete() {
    if (!deleteId) return;
    deleteStaff.mutate(deleteId, {
      onSuccess: () => {
        toast.success(t("staff.deleted"));
        setDeleteId(null);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openAdd} className="bg-gradient-brand-strong text-white shadow-soft hover:opacity-90">
          <Plus className="mr-2 h-4 w-4" /> {t("staff.add")}
        </Button>
      </div>

      <Card className="rounded-2xl border-0 p-5 shadow-soft">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("staff.fullName")}</TableHead>
                <TableHead>{t("staff.role")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">{t("common.loading")}</TableCell></TableRow>
              )}
              {staff.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="font-semibold">{member.fullName || member.email}</div>
                    <div className="text-xs text-muted-foreground">{member.email}</div>
                  </TableCell>
                  <TableCell>
                    {member.isOwner ? (
                      <Badge className="bg-gradient-brand text-white"><ShieldCheck className="mr-1 h-3 w-3" />{t("staff.owner")}</Badge>
                    ) : (
                      roleName(member.roleId)
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.active ? "default" : "secondary"}>
                      {member.active ? t("staff.active") : t("staff.inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {!member.isOwner && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(member)}><Pencil className="h-4 w-4" /></Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => updateStaff.mutate({ id: member.id, data: { active: !member.active } })}
                          title={member.active ? t("staff.deactivate") : t("staff.activate")}
                        >
                          <Power className={member.active ? "h-4 w-4 text-amber-600 dark:text-amber-400" : "h-4 w-4 text-emerald-600 dark:text-emerald-400"} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(member.id)}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && staff.length === 0 && (
                <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">{t("staff.noStaff")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? t("staff.editTitle") : t("staff.addTitle")}</DialogTitle>
            <DialogDescription>{t("staff.dialogDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field label={t("staff.fullName")} error={errors.fullName}>
              <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </Field>
            {!editing && (
              <Field label={t("staff.email")} error={errors.email}>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
            )}
            <Field label={editing ? t("staff.newPassword") : t("staff.password")} error={errors.password}>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
            <Field label={t("staff.role")} error={errors.roleId}>
              <Select value={form.roleId} onValueChange={(value) => setForm({ ...form, roleId: value })}>
                <SelectTrigger><SelectValue placeholder={t("staff.selectRole")} /></SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {editing && (
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <Label className="text-sm">{t("staff.active")}</Label>
                <Switch checked={form.active} onCheckedChange={(checked) => setForm({ ...form, active: checked })} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={submit} disabled={createStaff.isPending || updateStaff.isPending} className="bg-gradient-brand-strong text-white">
              {createStaff.isPending || updateStaff.isPending ? t("common.saving") : editing ? t("common.saveChanges") : t("staff.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("staff.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("staff.deleteDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleteStaff.isPending} className="bg-rose-600 text-white hover:bg-rose-700">
              {deleteStaff.isPending ? t("common.deleting") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// --- Roles tab ---

type RoleForm = { name: string; permissions: Permission[] };
const emptyRoleForm = (): RoleForm => ({ name: "", permissions: [] });

function RolesTab() {
  const { t } = useI18n();
  const { data: roles = [], isLoading } = useRoles();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<RoleForm>(emptyRoleForm());
  const [errors, setErrors] = useState<Record<string, string>>({});

  function openAdd() {
    setEditing(null);
    setForm(emptyRoleForm());
    setErrors({});
    setDialogOpen(true);
  }

  function openEdit(role: Role) {
    setEditing(role);
    setForm({ name: role.name, permissions: role.permissions });
    setErrors({});
    setDialogOpen(true);
  }

  function togglePermission(permission: Permission, checked: boolean) {
    setForm((f) => ({
      ...f,
      permissions: checked ? [...f.permissions, permission] : f.permissions.filter((p) => p !== permission),
    }));
  }

  function submit() {
    const schema = z.object({ name: z.string().trim().min(2, "Role name is required"), permissions: z.array(z.string()) });
    const result = schema.safeParse(form);
    if (!result.success) {
      setErrors(Object.fromEntries(result.error.issues.map((i) => [i.path.join("."), i.message])));
      return;
    }

    const mutation = editing
      ? updateRole.mutate.bind(updateRole, { id: editing.id, data: form })
      : createRole.mutate.bind(createRole, form);

    mutation({
      onSuccess: () => {
        toast.success(editing ? t("role.updated") : t("role.added"));
        setDialogOpen(false);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  function confirmDelete() {
    if (!deleteId) return;
    deleteRole.mutate(deleteId, {
      onSuccess: () => {
        toast.success(t("role.deleted"));
        setDeleteId(null);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openAdd} className="bg-gradient-brand-strong text-white shadow-soft hover:opacity-90">
          <Plus className="mr-2 h-4 w-4" /> {t("role.add")}
        </Button>
      </div>

      <Card className="rounded-2xl border-0 p-5 shadow-soft">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("role.name")}</TableHead>
                <TableHead>{t("role.permissions")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">{t("common.loading")}</TableCell></TableRow>
              )}
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-semibold">{role.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.length === 0
                        ? <span className="text-xs text-muted-foreground">{t("common.none")}</span>
                        : role.permissions.map((p) => <Badge key={p} variant="secondary">{t(`permission.${p}`)}</Badge>)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(role)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(role.id)}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && roles.length === 0 && (
                <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">{t("role.noRoles")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? t("role.editTitle") : t("role.addTitle")}</DialogTitle>
            <DialogDescription>{t("role.dialogDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field label={t("role.name")} error={errors.name}>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">{t("role.permissions")}</Label>
              <div className="grid grid-cols-2 gap-2">
                {PERMISSIONS.map((permission) => (
                  <label key={permission} className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm">
                    <Checkbox
                      checked={form.permissions.includes(permission)}
                      onCheckedChange={(checked) => togglePermission(permission, checked === true)}
                    />
                    {t(`permission.${permission}`)}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={submit} disabled={createRole.isPending || updateRole.isPending} className="bg-gradient-brand-strong text-white">
              {createRole.isPending || updateRole.isPending ? t("common.saving") : editing ? t("common.saveChanges") : t("role.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("role.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("role.deleteDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleteRole.isPending} className="bg-rose-600 text-white hover:bg-rose-700">
              {deleteRole.isPending ? t("common.deleting") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// --- Performance tab ---

function PerformanceTab() {
  const { t } = useI18n();
  const { data: performance = [], isLoading } = useStaffPerformance();
  const { data: settings } = useSettings();
  const currency = settings?.currency ?? "MAD";

  const totals = useMemo(
    () => ({
      logins: performance.reduce((sum, p) => sum + p.loginCount, 0),
      actions: performance.reduce((sum, p) => sum + p.totalActions, 0),
      revenue: performance.reduce((sum, p) => sum + p.revenueCollected, 0),
    }),
    [performance],
  );

  function formatMinutes(minutes: number) {
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("staff.total")} value={performance.length} icon={UsersIcon} variant="brand" />
        <StatCard label={t("performance.totalLogins")} value={totals.logins} icon={UserCog} />
        <StatCard label={t("performance.totalActions")} value={totals.actions} icon={Activity} />
        <StatCard label={t("performance.totalRevenue")} value={formatCurrency(totals.revenue, currency)} icon={Clock} variant="warning" />
      </div>

      <Card className="rounded-2xl border-0 p-5 shadow-soft">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("staff.fullName")}</TableHead>
                <TableHead className="text-right">{t("performance.clientsHandled")}</TableHead>
                <TableHead className="text-right">{t("performance.paymentsCollected")}</TableHead>
                <TableHead className="text-right">{t("performance.revenueCollected")}</TableHead>
                <TableHead className="text-right">{t("performance.logins")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("performance.lastLogin")}</TableHead>
                <TableHead className="text-right hidden lg:table-cell">{t("performance.onlineTime")}</TableHead>
                <TableHead className="text-right">{t("performance.actionsTaken")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">{t("common.loading")}</TableCell></TableRow>
              )}
              {performance.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-semibold">{p.fullName || p.email}</div>
                    {p.isOwner && <Badge className="mt-1 bg-gradient-brand text-white">{t("staff.owner")}</Badge>}
                  </TableCell>
                  <TableCell className="text-right">{p.clientsHandled}</TableCell>
                  <TableCell className="text-right">{p.paymentsCollected}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(p.revenueCollected, currency)}</TableCell>
                  <TableCell className="text-right">{p.loginCount}</TableCell>
                  <TableCell className="hidden lg:table-cell">{p.lastLoginAt ? new Date(p.lastLoginAt).toLocaleString() : t("performance.never")}</TableCell>
                  <TableCell className="text-right hidden lg:table-cell">{formatMinutes(p.onlineMinutes)}</TableCell>
                  <TableCell className="text-right">{p.totalActions}</TableCell>
                </TableRow>
              ))}
              {!isLoading && performance.length === 0 && (
                <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">{t("staff.noStaff")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
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
