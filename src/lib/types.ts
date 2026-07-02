export type SubscriptionType = string;
export type PaymentStatus = "Paid" | "Unpaid" | "Late";
export type PaymentMethod = "Cash" | "Card" | "Bank transfer";
export type Gender = "Male" | "Female";
export type TrainingAccess = "Martial Arts" | "Gym & Bodybuilding" | "Both";
export type AssurancePaymentStatus = "Paid" | "Unpaid";
export type OfferStatus = "Active" | "Paused" | "Ended";
export type PackStatus = "Active" | "Archived";
export type EquipmentStatus = "Operational" | "Maintenance" | "Out of service";

export interface SubscriptionPack {
  id: string;
  name: string;
  durationMonths: number;
  price: number;
  description: string;
  status: PackStatus;
  isDefault: number;
}

export interface Offer {
  id: string;
  name: string;
  description: string;
  discountPercent: number;
  startDate: string;
  endDate: string | null;
  targetSubscriptions: number;
  status: OfferStatus;
}

export interface Equipment {
  id: string;
  name: string;
  category: string;
  status: EquipmentStatus;
  lastMaintenanceDate: string | null;
  nextMaintenanceDate: string | null;
  repairCost: number;
  supplierName: string;
  supplierPhone: string;
  notes: string;
}

export interface Client {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  gender: Gender;
  joinDate: string; // ISO date
  trainingAccess: TrainingAccess;
  subscriptionType: SubscriptionType;
  subscriptionPlanId: string | null;
  subscriptionDurationMonths: number;
  subscriptionStart: string;
  subscriptionEnd: string;
  assuranceFee: number;
  assuranceStart: string | null;
  assuranceEnd: string | null;
  assurancePaymentStatus: AssurancePaymentStatus;
  offerId: string | null;
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
