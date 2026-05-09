export type SubscriptionType = "Monthly" | "Annual";
export type PaymentStatus = "Paid" | "Unpaid" | "Late";
export type PaymentMethod = "Cash" | "Card" | "Bank transfer";
export type Gender = "Male" | "Female";

export interface Client {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  gender: Gender;
  joinDate: string; // ISO date
  subscriptionType: SubscriptionType;
  subscriptionStart: string;
  subscriptionEnd: string;
  paymentStatus: PaymentStatus;
  lastPaymentDate: string | null;
  amountPaid: number;
  notes: string;
}

export interface Payment {
  id: string;
  clientId: string;
  clientName?: string; // not stored in backend — derived from clients list when needed
  amount: number;
  date: string;
  periodStart: string;
  periodEnd: string;
  method: PaymentMethod;
  status: "Paid" | "Unpaid";
}

export interface ReminderLog {
  id: string;
  clientId: string;
  clientName: string;
  email: string;
  sentAt: string;
  dueDate: string;
}

export interface Settings {
  gymName: string;
  monthlyPrice: number;
  annualPrice: number;
  reminderDays: number;
  currency: string;
}
