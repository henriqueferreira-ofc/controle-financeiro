import { createFileRoute } from "@tanstack/react-router";
import { useFinwise } from "@/store/finwise-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Database, Globe, LogOut, RefreshCw, Wallet } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/perfil")({
  head: () => ({
    meta: [
      { title: "Meu Perfil — FinWise" },
      { name: "description", content: "Informações da conta e preferências do app." },
    ],
  }),
  component: PerfilPage,
});

function PerfilPage() {
  const { state, reseed, setPersistLocal, setClearOnLogout, logout } = useFinwise();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Meu Perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configurações da conta e preferências do FinWise.
        </p>
      </div>

      <Card className="border-border/60 shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="text-base">Informações da conta</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <Avatar className="h-16 w-16 border border-border">
            <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">JF</AvatarFallback>
          </Avatar>
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <Info label="Nome" value="João Finanças" />
            <Info label="Email" value="joao@finwise.app" />
            <Info icon={<Wallet className="h-3.5 w-3.5" />} label="Moeda" value="R$ BRL (Real Brasileiro)" />
            <Info icon={<Globe className="h-3.5 w-3.5" />} label="Fuso horário" value="pt-BR (UTC−03:00)" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="text-base">Preferências do app</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Label htmlFor="persist" className="text-sm font-medium">Persistência local</Label>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Salva seus dados no navegador para mantê-los entre sessões.
              </p>
            </div>
            <Switch
              id="persist"
              checked={state.preferences.persistLocal}
              onCheckedChange={(v) => {
                setPersistLocal(v);
                toast.success(v ? "Persistência ativada." : "Persistência desativada.");
              }}
            />
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <Label htmlFor="clearLogout" className="text-sm font-medium">Limpar dados ao sair</Label>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Ao fazer logout, remove todos os dados salvos localmente.
              </p>
            </div>
            <Switch
              id="clearLogout"
              checked={state.preferences.clearOnLogout}
              onCheckedChange={setClearOnLogout}
            />
          </div>

          <div className="flex flex-col gap-3 border-t border-border/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Database className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Recarregar dados de exemplo</p>
                <p className="text-sm text-muted-foreground">
                  Restaura o conjunto inicial de transações e categorias.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                reseed();
                toast.success("Dados de exemplo restaurados.");
              }}
            >
              <RefreshCw className="mr-1 h-4 w-4" /> Restaurar seed
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">Sair da conta</p>
            <p className="text-sm text-muted-foreground">
              Logout simulado — não há autenticação real nesta versão.
            </p>
          </div>
          <Button variant="destructive" onClick={logout}>
            <LogOut className="mr-1 h-4 w-4" /> Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  );
}
