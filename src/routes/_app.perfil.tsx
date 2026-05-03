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
import { Camera, Database, Download, Globe, Loader2, LogOut, RefreshCw, Upload, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/I18nProvider";

export const Route = createFileRoute("/_app/perfil")({
  head: () => ({
    meta: [
      { title: "Meu Perfil — AxisPay" },
      { name: "description", content: "Informações da conta e preferências do app." },
    ],
  }),
  component: PerfilPage,
});

function PerfilPage() {
  const { user, signOut } = useAuth();
  const { reseed, exportJSON, importJSON, refresh } = useFinwise();
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reseeding, setReseeding] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    
    // Carregar nome e foto do perfil (sincronizado entre dispositivos)
    supabase
      .from("profiles")
      .select("name, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.name) setName(data.name);
        if ((data as any)?.avatar_url) setAvatarUrl((data as any).avatar_url);
        else if (user.user_metadata?.avatar_url) setAvatarUrl(user.user_metadata.avatar_url);
      });
  }, [user]);

  const initials = (name || user?.email || "U").slice(0, 2).toUpperCase();

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Persiste nome + avatar_url na tabela profiles (sincroniza entre dispositivos)
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ name, avatar_url: avatarUrl } as any)
        .eq("id", user.id);
      if (profileError) throw profileError;

      // Espelha no auth metadata para acesso rápido em todas as telas
      const { error: authError } = await supabase.auth.updateUser({
        data: { avatar_url: avatarUrl, name },
      });
      if (authError) throw authError;

      toast.success("Perfil atualizado com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 2MB.");
      if (avatarFileRef.current) avatarFileRef.current.value = "";
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${pub.publicUrl}?v=${Date.now()}`;

      const { error: authErr } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      });
      if (authErr) throw authErr;

      // Persiste na tabela profiles → sincroniza em qualquer dispositivo/login
      await supabase.from("profiles").update({ avatar_url: publicUrl } as any).eq("id", user.id);

      setAvatarUrl(publicUrl);
      toast.success("Foto atualizada!");
    } catch (err: any) {
      toast.error("Erro ao enviar foto: " + err.message);
    } finally {
      setUploading(false);
      if (avatarFileRef.current) avatarFileRef.current.value = "";
    }
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
        <p className="mt-1 text-sm text-muted-foreground">Configurações da conta e preferências do AxisPay.</p>
      </div>

      <Card className="border-border/60 shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="text-base">Informações da conta</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="relative shrink-0">
            <Avatar className="h-24 w-24 border-2 border-primary/20 p-1">
              {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="h-full w-full rounded-full object-cover" />
              ) : (
                <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">{initials}</AvatarFallback>
              )}
            </Avatar>
            <button
              type="button"
              onClick={() => avatarFileRef.current?.click()}
              disabled={uploading}
              aria-label="Alterar foto de perfil"
              className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-2 ring-background transition hover:scale-105 disabled:opacity-60"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <input
              ref={avatarFileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>

          <div className="grid flex-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Clique no ícone da câmera para enviar uma nova foto (máx. 2MB).
              </p>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveProfile} disabled={saving} className="w-full sm:w-auto">
                {saving ? "Salvando..." : "Salvar Perfil"}
              </Button>
            </div>

            <div className="grid gap-3 pt-4 border-t border-border/40 sm:grid-cols-2 lg:grid-cols-3">
              <Info label="Email" value={user?.email || "—"} />
              <Info icon={<Wallet className="h-3.5 w-3.5" />} label="Moeda" value="R$ BRL" />
              <Info icon={<Globe className="h-3.5 w-3.5" />} label="Fuso horário" value="pt-BR (UTC−03:00)" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="text-base">Gerenciamento de Dados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Action
            icon={<Database className="h-4 w-4" />}
            title="Carregar dados de exemplo"
            description="Insere transações fictícias para testes."
            action={<Button variant="outline" onClick={handleReseed} disabled={reseeding}><RefreshCw className="mr-1 h-4 w-4" /> {reseeding ? "Carregando..." : "Carregar demo"}</Button>}
          />
          <Action
            icon={<Download className="h-4 w-4" />}
            title="Exportar dados (JSON)"
            description="Baixa um backup de segurança."
            action={<Button variant="outline" onClick={exportJSON}><Download className="mr-1 h-4 w-4" /> Exportar</Button>}
          />
          <Action
            icon={<Upload className="h-4 w-4" />}
            title="Importar dados (JSON)"
            description="Restaurar a partir de um backup."
            action={
              <>
                <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={handleImport} />
                <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="mr-1 h-4 w-4" /> Importar</Button>
              </>
            }
          />
          <Button variant="ghost" size="sm" onClick={refresh} className="text-xs text-muted-foreground hover:text-primary">
            Sincronizar com servidor
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">Sair da conta</p>
            <p className="text-sm text-muted-foreground">Encerra sua sessão atual com segurança.</p>
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
    <div className="bg-muted/30 p-3 rounded-lg border border-border/30">
      <div className="flex items-center gap-1.5 text-xs uppercase font-bold tracking-wider text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 text-sm font-medium truncate">{value}</div>
    </div>
  );
}

function Action({ icon, title, description, action }: { icon: React.ReactNode; title: string; description: string; action: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl border border-border/40 bg-card/50 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}
