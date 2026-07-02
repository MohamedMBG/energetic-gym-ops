import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Locale = "en" | "fr";

type Dictionary = Record<string, { en: string; fr: string }>;

const STORAGE_KEY = "7up_locale";

const dictionary: Dictionary = {
  "app.adminSuite": { en: "Admin Suite", fr: "Suite admin" },
  "app.loading": { en: "Loading...", fr: "Chargement..." },
  "app.navigation": { en: "Navigation", fr: "Navigation" },
  "app.proTip": { en: "Pro tip", fr: "Conseil" },
  "app.proTipText": {
    en: "Send reminders 7 days before renewal to boost retention.",
    fr: "Envoyez des rappels 7 jours avant le renouvellement pour améliorer la fidélisation.",
  },
  "app.signOut": { en: "Sign out", fr: "Déconnexion" },
  "language.english": { en: "English", fr: "Anglais" },
  "language.french": { en: "French", fr: "Français" },
  "nav.dashboard": { en: "Dashboard", fr: "Tableau de bord" },
  "nav.clients": { en: "Clients", fr: "Clients" },
  "nav.subscriptions": { en: "Subscriptions", fr: "Abonnements" },
  "nav.packs": { en: "Packs", fr: "Packs" },
  "nav.offers": { en: "Offers", fr: "Offres" },
  "nav.equipment": { en: "Equipment", fr: "Équipement" },
  "nav.payments": { en: "Payments", fr: "Paiements" },
  "nav.reminders": { en: "Reminders", fr: "Rappels" },
  "nav.reports": { en: "Reports", fr: "Rapports" },
  "nav.settings": { en: "Settings", fr: "Paramètres" },
  "status.Active": { en: "Active", fr: "Actif" },
  "status.Expiring soon": { en: "Expiring soon", fr: "Expire bientôt" },
  "status.Expired": { en: "Expired", fr: "Expiré" },
  "status.Unpaid": { en: "Unpaid", fr: "Non payé" },
  "status.Paid": { en: "Paid", fr: "Payé" },
  "status.Late": { en: "Late", fr: "En retard" },
  "status.Monthly": { en: "Monthly", fr: "Mensuel" },
  "status.Annual": { en: "Annual", fr: "Annuel" },
  "status.Paused": { en: "Paused", fr: "En pause" },
  "status.Ended": { en: "Ended", fr: "Terminé" },
  "status.Archived": { en: "Archived", fr: "Archivé" },
  "status.Operational": { en: "Operational", fr: "Opérationnel" },
  "status.Maintenance": { en: "Maintenance", fr: "Maintenance" },
  "status.Out of service": { en: "Out of service", fr: "Hors service" },
  "status.Martial Arts": { en: "Martial Arts", fr: "Arts martiaux" },
  "status.Gym & Bodybuilding": { en: "Gym & Bodybuilding", fr: "Gym et musculation" },
  "status.Both": { en: "Both", fr: "Les deux" },
  "status.Cash": { en: "Cash", fr: "Espèces" },
  "status.Card": { en: "Card", fr: "Carte" },
  "status.Bank transfer": { en: "Bank transfer", fr: "Virement bancaire" },
  "common.actions": { en: "Actions", fr: "Actions" },
  "common.cancel": { en: "Cancel", fr: "Annuler" },
  "common.delete": { en: "Delete", fr: "Supprimer" },
  "common.saveChanges": { en: "Save changes", fr: "Enregistrer" },
  "common.saving": { en: "Saving...", fr: "Enregistrement..." },
  "common.search": { en: "Search", fr: "Rechercher" },
  "common.status": { en: "Status", fr: "Statut" },
  "common.payment": { en: "Payment", fr: "Paiement" },
  "common.client": { en: "Client", fr: "Client" },
  "common.clients": { en: "Clients", fr: "Clients" },
  "common.amount": { en: "Amount", fr: "Montant" },
  "common.date": { en: "Date", fr: "Date" },
  "common.method": { en: "Method", fr: "Méthode" },
  "common.plan": { en: "Plan", fr: "Formule" },
  "common.access": { en: "Access", fr: "Accès" },
  "common.assurance": { en: "Assurance", fr: "Assurance" },
  "common.start": { en: "Start", fr: "Début" },
  "common.end": { en: "End", fr: "Fin" },
  "common.loading": { en: "Loading...", fr: "Chargement..." },
  "common.noData": { en: "No data yet", fr: "Aucune donnée" },
  "common.none": { en: "None", fr: "Aucun" },
  "common.noOffer": { en: "No offer", fr: "Aucune offre" },
  "common.yearly": { en: "yearly", fr: "par an" },
  "common.ends": { en: "ends", fr: "fin" },
  "clients.title": { en: "Clients", fr: "Clients" },
  "clients.description": { en: "Manage members, subscriptions and contact details.", fr: "Gérez les membres, les abonnements et les coordonnées." },
  "clients.add": { en: "Add client", fr: "Ajouter un client" },
  "clients.searchPlaceholder": { en: "Search by name, email or phone...", fr: "Rechercher par nom, email ou téléphone..." },
  "clients.allTypes": { en: "All types", fr: "Tous les types" },
  "clients.allStatuses": { en: "All statuses", fr: "Tous les statuts" },
  "clients.contact": { en: "Contact", fr: "Contact" },
  "clients.endDate": { en: "End date", fr: "Date de fin" },
  "clients.noClients": { en: "No clients found", fr: "Aucun client trouvé" },
  "clients.editTitle": { en: "Edit client", fr: "Modifier le client" },
  "clients.addTitle": { en: "Add new client", fr: "Ajouter un nouveau client" },
  "clients.editDescription": { en: "Update member information and subscription.", fr: "Mettez à jour les informations du membre et son abonnement." },
  "clients.addDescription": { en: "Register a new member to your gym.", fr: "Inscrivez un nouveau membre à votre salle." },
  "clients.fullName": { en: "Full name", fr: "Nom complet" },
  "clients.phone": { en: "Phone", fr: "Téléphone" },
  "clients.email": { en: "Email", fr: "Email" },
  "clients.gender": { en: "Gender", fr: "Genre" },
  "clients.male": { en: "Male", fr: "Homme" },
  "clients.female": { en: "Female", fr: "Femme" },
  "clients.joinDate": { en: "Join date", fr: "Date d'inscription" },
  "clients.floorAccess": { en: "Floor access", fr: "Accès aux étages" },
  "clients.firstFloor": { en: "First floor - martial arts", fr: "Premier étage - arts martiaux" },
  "clients.secondFloor": { en: "Second floor - gym and bodybuilding", fr: "Deuxième étage - gym et musculation" },
  "clients.bothFloors": { en: "Both floors", fr: "Les deux étages" },
  "clients.subscriptionPack": { en: "Subscription pack", fr: "Pack d'abonnement" },
  "clients.selectPack": { en: "Select pack", fr: "Choisir un pack" },
  "clients.customPack": { en: "Custom / existing pack", fr: "Pack personnalisé / existant" },
  "clients.packName": { en: "Pack name", fr: "Nom du pack" },
  "clients.durationMonths": { en: "Duration (months)", fr: "Durée (mois)" },
  "clients.subscriptionStart": { en: "Subscription start", fr: "Début de l'abonnement" },
  "clients.offer": { en: "Offer", fr: "Offre" },
  "clients.endDateAuto": { en: "End date (auto)", fr: "Date de fin (auto)" },
  "clients.assuranceFee": { en: "Assurance fee", fr: "Frais d'assurance" },
  "clients.assurancePayment": { en: "Assurance payment", fr: "Paiement de l'assurance" },
  "clients.assuranceStart": { en: "Assurance start", fr: "Début de l'assurance" },
  "clients.assuranceEndAuto": { en: "Assurance end (auto)", fr: "Fin de l'assurance (auto)" },
  "clients.paymentStatus": { en: "Payment status", fr: "Statut du paiement" },
  "clients.amountPaid": { en: "Amount paid", fr: "Montant payé" },
  "clients.paymentMethod": { en: "Payment method", fr: "Méthode de paiement" },
  "clients.notes": { en: "Notes", fr: "Notes" },
  "clients.deleteTitle": { en: "Delete this client?", fr: "Supprimer ce client ?" },
  "clients.deleteDescription": { en: "This will permanently remove the client. This action cannot be undone.", fr: "Cela supprimera définitivement le client. Cette action est irréversible." },
  "clients.added": { en: "Client added", fr: "Client ajouté" },
  "clients.updated": { en: "Client updated", fr: "Client modifié" },
  "clients.removed": { en: "Client removed", fr: "Client supprimé" },
  "subscriptions.title": { en: "Subscription tracking", fr: "Suivi des abonnements" },
  "subscriptions.description": { en: "Monitor every member's subscription lifecycle and renewal status.", fr: "Suivez le cycle de vie des abonnements et les renouvellements." },
  "subscriptions.all": { en: "All subscriptions", fr: "Tous les abonnements" },
  "subscriptions.daysLeft": { en: "Days left", fr: "Jours restants" },
  "subscriptions.noAssuranceDate": { en: "No assurance date", fr: "Aucune date d'assurance" },
  "subscriptions.deleteTitle": { en: "Delete this subscription?", fr: "Supprimer cet abonnement ?" },
  "subscriptions.deleteDescription": { en: "This permanently removes the client and their subscription. Their payment records are also deleted. This cannot be undone.", fr: "Cela supprime définitivement le client et son abonnement. Les paiements liés sont aussi supprimés. Cette action est irréversible." },
  "subscriptions.deleted": { en: "Subscription deleted", fr: "Abonnement supprimé" },
  "payments.title": { en: "Payments", fr: "Paiements" },
  "payments.description": { en: "Record transactions and review your earnings.", fr: "Enregistrez les transactions et consultez vos revenus." },
  "payments.add": { en: "Add payment", fr: "Ajouter un paiement" },
  "payments.thisMonth": { en: "This month", fr: "Ce mois" },
  "payments.thisYear": { en: "This year", fr: "Cette année" },
  "payments.totalPayments": { en: "Total payments", fr: "Total des paiements" },
  "payments.history": { en: "Payment history", fr: "Historique des paiements" },
  "payments.period": { en: "Period", fr: "Période" },
  "payments.noPayments": { en: "No payments yet", fr: "Aucun paiement pour le moment" },
  "payments.record": { en: "Record payment", fr: "Enregistrer un paiement" },
  "payments.selectClient": { en: "Select client", fr: "Choisir un client" },
  "payments.saved": { en: "Payment recorded", fr: "Paiement enregistré" },
  "payments.save": { en: "Save payment", fr: "Enregistrer le paiement" },
  "settings.title": { en: "Settings", fr: "Paramètres" },
  "settings.description": { en: "Configure your gym's preferences.", fr: "Configurez les préférences de votre salle." },
  "settings.gymName": { en: "Gym name", fr: "Nom de la salle" },
  "settings.monthlyPrice": { en: "Monthly subscription price", fr: "Prix de l'abonnement mensuel" },
  "settings.annualPrice": { en: "Annual subscription price", fr: "Prix de l'abonnement annuel" },
  "settings.reminderDays": { en: "Reminder days before expiry", fr: "Jours de rappel avant expiration" },
  "settings.currency": { en: "Currency", fr: "Devise" },
  "settings.saved": { en: "Settings saved", fr: "Paramètres enregistrés" },
  "notFound.title": { en: "Page not found", fr: "Page introuvable" },
  "notFound.text": { en: "The page you're looking for doesn't exist or has been moved.", fr: "La page demandée n'existe pas ou a été déplacée." },
  "error.goHome": { en: "Go home", fr: "Retour à l'accueil" },
  "error.loadTitle": { en: "This page didn't load", fr: "Cette page ne s'est pas chargée" },
  "error.loadText": { en: "Something went wrong on our end. You can try refreshing or head back home.", fr: "Une erreur est survenue. Vous pouvez réessayer ou revenir à l'accueil." },
  "error.tryAgain": { en: "Try again", fr: "Réessayer" },
};

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, fallback?: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function initialLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "fr" ? "fr" : "en";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    setLocale: setLocaleState,
    t: (key, fallback) => dictionary[key]?.[locale] ?? fallback ?? key,
  }), [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export function translateStatus(status: string, locale: Locale) {
  return dictionary[`status.${status}`]?.[locale] ?? status;
}
