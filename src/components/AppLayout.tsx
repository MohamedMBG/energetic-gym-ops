import { useEffect, useState } from "react";
import { Menu, Bell } from "lucide-react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { AppSidebar } from "./AppSidebar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

const PUBLIC_PATHS = ["/login", "/setup"];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  if (PUBLIC_PATHS.includes(pathname)) {
    return <>{children}</>;
  }

  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: auth, isLoading, isError } = useAuth();
  const { locale, setLocale, t } = useI18n();

  useEffect(() => {
    if (isError) navigate({ to: "/login" });
  }, [isError, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (isError || !auth) return null;

  const displayName = auth.user.email.split("@")[0];
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen w-full bg-background">
      <div className="hidden lg:block">
        <AppSidebar />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur lg:px-8">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger className="rounded-lg p-2 text-muted-foreground hover:bg-accent lg:hidden">
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="sr-only">{t("app.navigation")}</SheetTitle>
              <AppSidebar onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="flex-1" />

          <div className="flex items-center rounded-xl border border-border bg-background p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setLocale("en")}
              className={`rounded-lg px-2.5 py-1.5 transition-colors ${locale === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLocale("fr")}
              className={`rounded-lg px-2.5 py-1.5 transition-colors ${locale === "fr" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
            >
              FR
            </button>
          </div>

          <button className="relative rounded-xl p-2.5 text-muted-foreground hover:bg-accent">
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
          </button>

          <div className="hidden items-center gap-3 sm:flex">
            <div className="text-right">
              <div className="text-sm font-semibold">{auth.gym.name}</div>
              <div className="text-xs text-muted-foreground">{auth.user.email}</div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-brand text-sm font-bold text-white">
              {initials}
            </div>
          </div>
        </header>

        <main className="flex-1 animate-in fade-in slide-in-from-bottom-2 px-4 py-6 duration-500 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
