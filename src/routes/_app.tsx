import { createFileRoute, Outlet, redirect, Link, useLocation } from "@tanstack/react-router";
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    throw redirect({ to: "/auth", search: { redirect: location.pathname } });
  }

  return (
    <FinwiseProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <div className="flex-1 flex flex-col">
            <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-border/60 bg-background/80 px-4 backdrop-blur">
              <SidebarTrigger />
              <div className="flex items-center gap-3">
                <span className="hidden text-sm text-muted-foreground sm:inline">
                  {user.email}
                </span>
                <Button size="sm" variant="ghost" onClick={() => signOut()}>
                  <LogOut className="mr-1 h-4 w-4" /> Sair
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
