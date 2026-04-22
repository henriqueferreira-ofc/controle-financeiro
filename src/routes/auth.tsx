import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";
import { AxispayLogo } from "@/components/AxispayLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : "/",
  }),
  head: () => ({
    meta: [
      { title: "AxisPay" },
      { name: "description", content: "Acesse sua conta AxisPay para gerenciar suas finanças." },
    ],
  }),
  component: AuthPage,
});

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});
const signupSchema = loginSchema.extend({
  name: z.string().min(2, "Informe seu nome"),
});

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { user, loading, signIn, signUp, resetPassword } = useAuth();
  const [tab, setTab] = useState<"login" | "signup" | "reset">("login");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: search.redirect || "/" });
  }, [user, loading, navigate, search.redirect]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await signIn(parsed.data.email, parsed.data.password);
    setSubmitting(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "Email ou senha incorretos." : error.message);
    } else {
      toast.success("Bem-vindo de volta!");
    }
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signupSchema.safeParse({
      name: fd.get("name"),
      email: fd.get("email"),
      password: fd.get("password"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await signUp(parsed.data.email, parsed.data.password, parsed.data.name);
    setSubmitting(false);
    if (error) {
      toast.error(error.message.includes("already") ? "Este email já está cadastrado." : error.message);
    } else {
      toast.success("Conta criada! Você já pode entrar.");
    }
  };

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "");
    if (!email) return toast.error("Informe seu email.");
    setSubmitting(true);
    const { error } = await resetPassword(email);
    setSubmitting(false);
    if (error) toast.error(error.message);
    else toast.success("Enviamos um link para redefinir sua senha.");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="absolute right-3 top-3">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <AxispayLogo size={64} showWordmark={false} className="mb-3" />
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">Axis</span>
            <span className="text-foreground">Pay</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Financial Axis</p>
        </div>

        <Card className="border-border/60 shadow-[var(--shadow-card)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {tab === "login" ? "Entrar" : tab === "signup" ? "Criar conta" : "Recuperar senha"}
            </CardTitle>
            <CardDescription>
              {tab === "login"
                ? "Acesse sua conta para gerenciar suas finanças."
                : tab === "signup"
                  ? "Comece a controlar suas finanças hoje."
                  : "Enviaremos um link para redefinir sua senha."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Cadastrar</TabsTrigger>
              </TabsList>
              <TabsContent value="login" className="mt-4">
                {tab === "reset" ? (
                  <form onSubmit={handleReset} className="space-y-3">
                    <div className="grid gap-2">
                      <Label htmlFor="r-email">Email</Label>
                      <Input id="r-email" name="email" type="email" required />
                    </div>
                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting ? "Enviando..." : "Enviar link de recuperação"}
                    </Button>
                    <button
                      type="button"
                      className="block w-full text-center text-sm text-muted-foreground hover:text-foreground"
                      onClick={() => setTab("login")}
                    >
                      Voltar para entrar
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleLogin} className="space-y-3">
                    <div className="grid gap-2">
                      <Label htmlFor="l-email">Email</Label>
                      <Input id="l-email" name="email" type="email" autoComplete="email" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="l-pass">Senha</Label>
                      <Input id="l-pass" name="password" type="password" autoComplete="current-password" required />
                    </div>
                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting ? "Entrando..." : "Entrar"}
                    </Button>
                    <button
                      type="button"
                      className="block w-full text-center text-sm text-muted-foreground hover:text-foreground"
                      onClick={() => setTab("reset")}
                    >
                      Esqueci minha senha
                    </button>
                  </form>
                )}
              </TabsContent>
              <TabsContent value="signup" className="mt-4">
                <form onSubmit={handleSignup} className="space-y-3">
                  <div className="grid gap-2">
                    <Label htmlFor="s-name">Nome</Label>
                    <Input id="s-name" name="name" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="s-email">Email</Label>
                    <Input id="s-email" name="email" type="email" autoComplete="email" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="s-pass">Senha</Label>
                    <Input id="s-pass" name="password" type="password" autoComplete="new-password" minLength={6} required />
                    <p className="text-xs text-muted-foreground">Mínimo 6 caracteres.</p>
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? "Criando..." : "Criar conta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">← Voltar ao início</Link>
        </p>
      </div>
    </div>
  );
}
