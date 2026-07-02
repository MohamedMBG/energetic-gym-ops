import type { Client, Payment, ReminderLog, Settings, SubscriptionType } from "./types";

const KEYS = {
  clients: "7up_clients",
  payments: "7up_payments",
  reminders: "7up_reminders",
  settings: "7up_settings",
  seeded: "7up_seeded_v1",
};

export const DEFAULT_SETTINGS: Settings = {
  gymName: "7up Gym",
  monthlyPrice: 45,
  annualPrice: 480,
  reminderDays: 7,
  currency: "MAD",
};

const isBrowser = () => typeof window !== "undefined";

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

export const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function computeEndDate(start: string, typeOrMonths: SubscriptionType | number): string {
  if (typeof typeOrMonths === "number") return addMonths(start, typeOrMonths);
  return addMonths(start, typeOrMonths === "Annual" || typeOrMonths === "Yearly" ? 12 : 1);
}

export function getClients(): Client[] {
  ensureSeed();
  return read<Client[]>(KEYS.clients, []);
}
export function saveClients(c: Client[]) {
  write(KEYS.clients, c);
}

export function getPayments(): Payment[] {
  ensureSeed();
  return read<Payment[]>(KEYS.payments, []);
}
export function savePayments(p: Payment[]) {
  write(KEYS.payments, p);
}

export function getReminders(): ReminderLog[] {
  return read<ReminderLog[]>(KEYS.reminders, []);
}
export function saveReminders(r: ReminderLog[]) {
  write(KEYS.reminders, r);
}

export function getSettings(): Settings {
  ensureSeed();
  return read<Settings>(KEYS.settings, DEFAULT_SETTINGS);
}
export function saveSettings(s: Settings) {
  write(KEYS.settings, s);
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function ensureSeed() {
  if (!isBrowser()) return;
  if (localStorage.getItem(KEYS.seeded)) return;

  const settings = DEFAULT_SETTINGS;
  write(KEYS.settings, settings);

  const seedClients: Array<Partial<Client> & { fullName: string; subscriptionType: SubscriptionType; startOffset: number; status: Client["paymentStatus"] }> = [
    { fullName: "Alex Carter", subscriptionType: "Monthly", startOffset: -25, status: "Paid", gender: "Male", phone: "+1 555 0142", email: "alex.c@mail.com" },
    { fullName: "Mia Johnson", subscriptionType: "Annual", startOffset: -120, status: "Paid", gender: "Female", phone: "+1 555 0144", email: "mia.j@mail.com" },
    { fullName: "Liam Brown", subscriptionType: "Monthly", startOffset: -28, status: "Late", gender: "Male", phone: "+1 555 0148", email: "liam.b@mail.com" },
    { fullName: "Sophia Davis", subscriptionType: "Monthly", startOffset: -3, status: "Paid", gender: "Female", phone: "+1 555 0150", email: "sophia.d@mail.com" },
    { fullName: "Noah Wilson", subscriptionType: "Annual", startOffset: -300, status: "Paid", gender: "Male", phone: "+1 555 0151", email: "noah.w@mail.com" },
    { fullName: "Emma Martinez", subscriptionType: "Monthly", startOffset: -32, status: "Unpaid", gender: "Female", phone: "+1 555 0155", email: "emma.m@mail.com" },
    { fullName: "Ethan Garcia", subscriptionType: "Monthly", startOffset: -10, status: "Paid", gender: "Male", phone: "+1 555 0160", email: "ethan.g@mail.com" },
    { fullName: "Olivia Lee", subscriptionType: "Annual", startOffset: -350, status: "Late", gender: "Female", phone: "+1 555 0162", email: "olivia.l@mail.com" },
    { fullName: "Lucas Walker", subscriptionType: "Monthly", startOffset: -15, status: "Paid", gender: "Male", phone: "+1 555 0170", email: "lucas.w@mail.com" },
    { fullName: "Ava Hall", subscriptionType: "Monthly", startOffset: -22, status: "Paid", gender: "Female", phone: "+1 555 0175", email: "ava.h@mail.com" },
    { fullName: "Mason Allen", subscriptionType: "Annual", startOffset: -60, status: "Paid", gender: "Male", phone: "+1 555 0180", email: "mason.a@mail.com" },
    { fullName: "Isabella Young", subscriptionType: "Monthly", startOffset: -27, status: "Paid", gender: "Female", phone: "+1 555 0182", email: "bella.y@mail.com" },
  ];

  const clients: Client[] = seedClients.map((s) => {
    const start = daysFromNow(s.startOffset);
    const end = computeEndDate(start, s.subscriptionType);
    const amount = s.subscriptionType === "Monthly" ? settings.monthlyPrice : settings.annualPrice;
    return {
      id: uid(),
      fullName: s.fullName,
      phone: s.phone || "",
      email: s.email || "",
      gender: (s.gender as Client["gender"]) || "Male",
      joinDate: daysFromNow(s.startOffset - 5),
      subscriptionType: s.subscriptionType,
      subscriptionPlanId: null,
      subscriptionDurationMonths: s.subscriptionType === "Annual" ? 12 : 1,
      subscriptionStart: start,
      subscriptionEnd: end,
      offerId: null,
      paymentStatus: s.status,
      lastPaymentDate: s.status === "Unpaid" ? null : start,
      amountPaid: s.status === "Unpaid" ? 0 : amount,
      notes: "",
    };
  });
  write(KEYS.clients, clients);

  const payments: Payment[] = clients
    .filter((c) => c.paymentStatus !== "Unpaid")
    .map((c) => ({
      id: uid(),
      clientId: c.id,
      clientName: c.fullName,
      amount: c.amountPaid,
      date: c.lastPaymentDate || c.subscriptionStart,
      periodStart: c.subscriptionStart,
      periodEnd: c.subscriptionEnd,
      method: (["Cash", "Card", "Bank transfer"] as const)[Math.floor(Math.random() * 3)],
      status: "Paid",
    }));
  // a few historical payments
  for (let i = 0; i < 6; i++) {
    const c = clients[i];
    payments.push({
      id: uid(),
      clientId: c.id,
      clientName: c.fullName,
      amount: settings.monthlyPrice,
      date: daysFromNow(-30 * (i + 2)),
      periodStart: daysFromNow(-30 * (i + 2)),
      periodEnd: daysFromNow(-30 * (i + 1)),
      method: "Card",
      status: "Paid",
    });
  }
  write(KEYS.payments, payments);
  write(KEYS.reminders, []);
  localStorage.setItem(KEYS.seeded, "1");
}

export function resetAllData() {
  if (!isBrowser()) return;
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}

// Derived helpers
export function clientStatus(c: Client): "Active" | "Expiring soon" | "Expired" | "Unpaid" {
  if (c.paymentStatus === "Unpaid") return "Unpaid";
  const today = new Date();
  const end = new Date(c.subscriptionEnd);
  const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "Expired";
  if (diffDays <= 5) return "Expiring soon";
  return "Active";
}

export function formatCurrency(n: number, currency = "MAD") {
  try {
    const num = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
    return `${num} ${currency}`;
  } catch {
    return `${Math.round(n)} ${currency}`;
  }
}
