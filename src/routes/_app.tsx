import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { FinwiseProvider, useFinwise } from "@/store/finwise-store";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function LoggedOutScreen() {
  const { loginAgain } = useFinwise();
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
          <LogIn className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Você saiu da conta</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta é uma sessão simulada. Seus dados continuam salvos localmente.
        </p>
        <Button className="mt-6" onClick={loginAgain}>
          Entrar novamente
        </Button>
      </div>
    </div>
  );
}

function ShellInner() {
  const { state } = useFinwise();
  if (state.session.loggedOut) return <LoggedOutScreen />;
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/60 bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger />
          </header>
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppLayout() {
  return (
    <FinwiseProvider>
      <ShellInner />
      <Toaster richColors position="top-right" />
    </FinwiseProvider>
  );
}
