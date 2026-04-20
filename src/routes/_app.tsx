import * as React from "react";
import { createFileRoute, Outlet, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { FinwiseProvider } from "@/store/finwise-store";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading, signOut } = useAuth();
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


  return (
    <FinwiseProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <div className="flex-1 flex flex-col">
            <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-border/60 bg-background/80 px-3 backdrop-blur sm:px-4">
              <SidebarTrigger />
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <span className="hidden max-w-[200px] truncate text-sm text-muted-foreground sm:inline lg:max-w-none">
                  {user.email}
                </span>
                <Button size="sm" variant="ghost" onClick={() => signOut()}>
                  <LogOut className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Sair</span>
                </Button>
              </div>
            </header>
            <main className="flex-1">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </FinwiseProvider>
  );
}
