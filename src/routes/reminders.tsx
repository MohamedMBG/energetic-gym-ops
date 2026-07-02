import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Mail, Send, Eye } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { clientStatus, getReminders, saveReminders, uid } from "@/lib/storage";
import { useClients } from "@/hooks/use-clients";
import { useSettings } from "@/hooks/use-settings";
import { useI18n } from "@/lib/i18n";
import type { Client, ReminderLog } from "@/lib/types";

export const Route = createFileRoute("/reminders")({
  component: RemindersPage,
});

function RemindersPage() {
  const { t } = useI18n();
  const { data: settings } = useSettings();
  const { data: clients = [] } = useClients();
  // reminder logs remain in localStorage until the reminders API endpoint is built
  const [history, setHistory] = useState<ReminderLog[]>(() => getReminders());
  const [preview, setPreview] = useState<Client | null>(null);

  const gymName = settings?.gymName ?? "the gym";
  const reminderDays = settings?.reminderDays ?? 7;

  const dueSoon = useMemo(() => clients.filter((c) => clientStatus(c) === "Expiring soon"), [clients]);
  const expired = useMemo(() => clients.filter((c) => clientStatus(c) === "Expired"), [clients]);

  function emailBody(c: Client) {
    return t("reminders.emailBody")
      .replace("{name}", c.fullName)
      .replaceAll("{gym}", gymName)
      .replace("{date}", new Date(c.subscriptionEnd).toLocaleDateString());
  }

  function sendReminder(c: Client) {
    const log: ReminderLog = {
      id: uid(),
      clientId: c.id,
      clientName: c.fullName,
      email: c.email,
      sentAt: new Date().toISOString(),
      dueDate: c.subscriptionEnd,
    };
    const next = [log, ...history];
    setHistory(next);
    saveReminders(next);
    toast.success(t("reminders.sentToast").replace("{name}", c.fullName));
  }

  function ClientList({ list, title, emptyMsg }: { list: Client[]; title: string; emptyMsg: string }) {
    return (
      <Card className="rounded-2xl border-0 p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">{title}</h2>
            <p className="text-xs text-muted-foreground">{t(list.length === 1 ? "reminders.clientCount" : "reminders.clientCountPlural").replace("{count}", String(list.length))}</p>
          </div>
        </div>
        <div className="space-y-2">
          {list.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-brand text-xs font-bold text-white">
                  {c.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
                <div>
                  <div className="text-sm font-semibold">{c.fullName}</div>
                  <div className="text-xs text-muted-foreground">{c.email} - {t("common.ends")} {new Date(c.subscriptionEnd).toLocaleDateString()}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={clientStatus(c)} />
                <Button variant="outline" size="sm" onClick={() => setPreview(c)}>
                  <Eye className="mr-1.5 h-3.5 w-3.5" /> {t("reminders.preview")}
                </Button>
                <Button size="sm" onClick={() => sendReminder(c)} className="bg-gradient-brand-strong text-white">
                  <Send className="mr-1.5 h-3.5 w-3.5" /> {t("reminders.send")}
                </Button>
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">{emptyMsg}</p>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("reminders.title")} description={t("reminders.description")} />

      <ClientList list={dueSoon} title={t("reminders.dueInDays").replace("{days}", String(reminderDays))} emptyMsg={t("reminders.noUpcoming")} />
      <ClientList list={expired} title={t("reminders.expiredSubscriptions")} emptyMsg={t("reminders.noExpired")} />

      <Card className="rounded-2xl border-0 p-5 shadow-soft">
        <div className="mb-4 flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-bold">{t("reminders.history")}</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.client")}</TableHead>
                <TableHead>{t("common.email")}</TableHead>
                <TableHead>{t("reminders.sentAt")}</TableHead>
                <TableHead>{t("reminders.dueDate")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.clientName}</TableCell>
                  <TableCell>{r.email}</TableCell>
                  <TableCell>{new Date(r.sentAt).toLocaleString()}</TableCell>
                  <TableCell>{new Date(r.dueDate).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
              {history.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">{t("reminders.noHistory")}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t("reminders.emailPreview")}</DialogTitle></DialogHeader>
          {preview && (
            <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4 text-sm">
              <div><span className="font-semibold">{t("reminders.to")}</span> {preview.email}</div>
              <div><span className="font-semibold">{t("reminders.subject")}</span> {t("reminders.emailSubject").replace("{gym}", gymName)}</div>
              <div className="border-t border-border pt-3 whitespace-pre-line text-foreground">{emailBody(preview)}</div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPreview(null)}>{t("reminders.close")}</Button>
            {preview && (
              <Button onClick={() => { sendReminder(preview); setPreview(null); }} className="bg-gradient-brand-strong text-white">
                <Send className="mr-1.5 h-3.5 w-3.5" /> {t("reminders.sendEmail")}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
