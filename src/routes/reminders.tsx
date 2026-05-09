import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Mail, Send, Eye } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  clientStatus, getClients, getReminders, getSettings, saveReminders, uid,
} from "@/lib/storage";
import type { Client, ReminderLog } from "@/lib/types";

export const Route = createFileRoute("/reminders")({
  component: RemindersPage,
});

function RemindersPage() {
  const settings = useMemo(() => getSettings(), []);
  const clients = useMemo(() => getClients(), []);
  const [history, setHistory] = useState<ReminderLog[]>(() => getReminders());
  const [preview, setPreview] = useState<Client | null>(null);

  const dueSoon = clients.filter((c) => clientStatus(c) === "Expiring soon");
  const expired = clients.filter((c) => clientStatus(c) === "Expired");

  function emailBody(c: Client) {
    return `Dear ${c.fullName},\n\nYour ${settings.gymName} subscription is due on ${new Date(c.subscriptionEnd).toLocaleDateString()}. Please renew your payment to keep enjoying full access to the gym.\n\n— ${settings.gymName} Team`;
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
    toast.success(`Reminder email sent to ${c.fullName}`);
  }

  function ClientList({ list, title, emptyMsg }: { list: Client[]; title: string; emptyMsg: string }) {
    return (
      <Card className="rounded-2xl border-0 p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">{title}</h2>
            <p className="text-xs text-muted-foreground">{list.length} client{list.length === 1 ? "" : "s"}</p>
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
                  <div className="text-xs text-muted-foreground">{c.email} · ends {new Date(c.subscriptionEnd).toLocaleDateString()}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={clientStatus(c)} />
                <Button variant="outline" size="sm" onClick={() => setPreview(c)}>
                  <Eye className="mr-1.5 h-3.5 w-3.5" /> Preview
                </Button>
                <Button size="sm" onClick={() => sendReminder(c)} className="bg-gradient-brand-strong text-white">
                  <Send className="mr-1.5 h-3.5 w-3.5" /> Send
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
      <PageHeader
        title="Email reminders"
        description="Notify members before their subscription ends."
      />

      <ClientList list={dueSoon} title={`Due in ${settings.reminderDays} days`} emptyMsg="No upcoming renewals" />
      <ClientList list={expired} title="Expired subscriptions" emptyMsg="No expired subscriptions" />

      <Card className="rounded-2xl border-0 p-5 shadow-soft">
        <div className="mb-4 flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-bold">Reminder history</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Sent at</TableHead>
                <TableHead>Due date</TableHead>
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
                <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No reminders sent yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Email preview</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4 text-sm">
              <div><span className="font-semibold">To:</span> {preview.email}</div>
              <div><span className="font-semibold">Subject:</span> {settings.gymName} Subscription Renewal Reminder</div>
              <div className="border-t border-border pt-3 whitespace-pre-line text-foreground">
                {emailBody(preview)}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPreview(null)}>Close</Button>
            {preview && (
              <Button onClick={() => { sendReminder(preview); setPreview(null); }} className="bg-gradient-brand-strong text-white">
                <Send className="mr-1.5 h-3.5 w-3.5" /> Send email
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
