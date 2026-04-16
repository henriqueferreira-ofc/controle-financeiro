import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useFinwise } from "@/store/finwise-store";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Database, Download, Globe, LogOut, RefreshCw, Upload, Wallet } from "lucide-react";
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
  const { user, signOut } = useAuth();
  const { reseed, exportJSON, importJSON, refresh } = useFinwise();
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [reseeding, setReseeding] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.name) setName(data.name);
      });
  }, [user]);

  const initials = (name || user?.email || "U").slice(0, 2).toUpperCase();

  const saveName = async () => {
    if (!user) return;
    setSavingName(true);
    const { error } = await supabase.from("profiles").update({ name }).eq("id", user.id);
    setSavingName(false);
    if (error) toast.error("Erro ao salvar: " + error.message);
    else toast.success("Nome atualizado.");
  };

  const handleReseed = async () => {
    setReseeding(true);
    try {
      await reseed();
      toast.success("Dados de exemplo carregados.");
    } catch {
      // toast already shown
    }
    setReseeding(false);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) await importJSON(f);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Meu Perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">Configurações da conta e preferências do FinWise.</p>
      </div>

      <Card className="border-border/60 shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="text-base">Informações da conta</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <Avatar className="h-16 w-16 border border-border">
            <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="grid flex-1 gap-4">
            <div className="grid gap-2 sm:max-w-sm">
              <Label htmlFor="name">Nome</Label>
              <div className="flex gap-2">
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                <Button onClick={saveName} disabled={savingName}>{savingName ? "Salvando..." : "Salvar"}</Button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="Email" value={user?.email || "—"} />
              <Info icon={<Wallet className="h-3.5 w-3.5" />} label="Moeda" value="R$ BRL" />
              <Info icon={<Globe className="h-3.5 w-3.5" />} label="Fuso horário" value="pt-BR (UTC−03:00)" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="text-base">Dados do app</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Action
            icon={<Database className="h-4 w-4" />}
            title="Carregar dados de exemplo"
            description="Insere transações de exemplo na sua conta para teste."
            action={<Button variant="outline" onClick={handleReseed} disabled={reseeding}><RefreshCw className="mr-1 h-4 w-4" /> {reseeding ? "Carregando..." : "Carregar seed"}</Button>}
          />
          <Action
            icon={<Download className="h-4 w-4" />}
            title="Exportar dados (JSON)"
            description="Baixa um backup com todas as suas transações."
            action={<Button variant="outline" onClick={exportJSON}><Download className="mr-1 h-4 w-4" /> Exportar</Button>}
          />
          <Action
            icon={<Upload className="h-4 w-4" />}
            title="Importar dados (JSON)"
            description="Adiciona transações a partir de um arquivo JSON."
            action={
              <>
                <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={handleImport} />
                <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="mr-1 h-4 w-4" /> Importar</Button>
              </>
            }
          />
          <Button variant="ghost" size="sm" onClick={refresh}>Recarregar dados do servidor</Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">Sair da conta</p>
            <p className="text-sm text-muted-foreground">Encerra sua sessão atual.</p>
          </div>
          <Button variant="destructive" onClick={() => signOut()}>
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
      <div className="mt-0.5 text-sm font-medium break-all">{value}</div>
    </div>
  );
}

function Action({ icon, title, description, action }: { icon: React.ReactNode; title: string; description: string; action: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">{icon}</div>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}
