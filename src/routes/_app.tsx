import * as React from "react";
import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { FinwiseProvider } from "@/store/finwise-store";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/i18n/I18nProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationsBell } from "@/components/NotificationsBell";
import { useGoalCelebrations } from "@/hooks/use-goal-celebrations";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading, signOut } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth", search: { redirect: location.pathname } });
    }
  }, [loading, user, navigate, location.pathname]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0];
  const initials = (name || "U").slice(0, 2).toUpperCase();

  return (
    <FinwiseProvider>
      <AppShell
        userId={user.id}
        name={name}
        fallbackAvatar={user.user_metadata?.avatar_url}
        initials={initials}
        signOut={signOut}
        t={t}
      />
    </FinwiseProvider>
  );
}

function AppShell({
  userId,
  name,
  fallbackAvatar,
  initials,
  signOut,
  t,
}: {
  userId: string;
  name: string;
  fallbackAvatar?: string;
  initials: string;
  signOut: () => Promise<void> | void;
  t: (k: string) => string;
}) {
  useGoalCelebrations();

  // Avatar sincronizado entre dispositivos via tabela profiles
  const [avatarUrl, setAvatarUrl] = React.useState<string | undefined>(fallbackAvatar);
  React.useEffect(() => {
    let alive = true;
    supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        const url = (data as any)?.avatar_url;
        if (url) setAvatarUrl(url);
      });
    return () => {
      alive = false;
    };
  }, [userId]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-border/60 bg-background/80 px-3 backdrop-blur sm:px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
            </div>

            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <NotificationsBell />

              <div className="flex items-center gap-2 mr-1 sm:mr-2">
                <Avatar className="h-8 w-8 border border-border/50">
                  <AvatarImage src={avatarUrl} className="object-cover" />
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[150px] truncate text-sm font-medium sm:inline">
                  {name}
                </span>
              </div>
              <LanguageSwitcher compact />
              <Button size="sm" variant="ghost" className="h-9 px-2 sm:px-3 text-muted-foreground hover:text-destructive" onClick={() => signOut()}>
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t("common.signout")}</span>
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-hidden relative">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
