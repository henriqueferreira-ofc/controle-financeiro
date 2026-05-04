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
import { useI18n } from "@/i18n/I18nProvider";

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

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { user, loading, signIn, signUp, resetPassword } = useAuth();
  const { t } = useI18n();
  const [tab, setTab] = useState<"login" | "signup" | "reset">("login");
  const [submitting, setSubmitting] = useState(false);

  const loginSchema = z.object({
    email: z.string().email(t("auth.invalidEmail")),
    password: z.string().min(6, t("auth.minPwd")),
  });
  const signupSchema = loginSchema.extend({
    name: z.string().min(2, t("auth.nameReq")),
  });

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
      toast.error(error.message === "Invalid login credentials" ? t("auth.invalid") : error.message);
    } else {
      toast.success(t("auth.welcomeBack"));
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
      toast.error(error.message.includes("already") ? t("auth.exists") : error.message);
    } else {
      toast.success(t("auth.created"));
    }
  };

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "");
    if (!email) return toast.error(t("auth.resetEmpty"));
    setSubmitting(true);
    const { error } = await resetPassword(email);
    setSubmitting(false);
    if (error) toast.error(error.message);
    else toast.success(t("auth.resetSent"));
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
          <p className="mt-1 text-sm text-muted-foreground">{t("app.tagline")}</p>
        </div>

        <Card className="border-border/60 shadow-[var(--shadow-card)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {tab === "login" ? t("auth.signin") : tab === "signup" ? t("auth.signupTitle") : t("auth.reset")}
            </CardTitle>
            <CardDescription>
              {tab === "login" ? t("auth.signinDesc") : tab === "signup" ? t("auth.signupDesc") : t("auth.resetDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">{t("auth.signin")}</TabsTrigger>
                <TabsTrigger value="signup">{t("auth.signup")}</TabsTrigger>
              </TabsList>
              <TabsContent value="login" className="mt-4">
                {tab === "reset" ? (
                  <form onSubmit={handleReset} className="space-y-3">
                    <div className="grid gap-2">
                      <Label htmlFor="r-email">{t("auth.email")}</Label>
                      <Input id="r-email" name="email" type="email" required />
                    </div>
                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting ? t("auth.sending") : t("auth.sendResetLink")}
                    </Button>
                    <button
                      type="button"
                      className="block w-full text-center text-sm text-muted-foreground hover:text-foreground"
                      onClick={() => setTab("login")}
                    >
                      {t("auth.backToSignin")}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleLogin} className="space-y-3">
                    <div className="grid gap-2">
                      <Label htmlFor="l-email">{t("auth.email")}</Label>
                      <Input id="l-email" name="email" type="email" autoComplete="email" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="l-pass">{t("auth.password")}</Label>
                      <Input id="l-pass" name="password" type="password" autoComplete="current-password" required />
                    </div>
                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting ? t("auth.signing") : t("auth.signin")}
                    </Button>
                    <button
                      type="button"
                      className="block w-full text-center text-sm text-muted-foreground hover:text-foreground"
                      onClick={() => setTab("reset")}
                    >
                      {t("auth.forgot")}
                    </button>
                  </form>
                )}
              </TabsContent>
              <TabsContent value="signup" className="mt-4">
                <form onSubmit={handleSignup} className="space-y-3">
                  <div className="grid gap-2">
                    <Label htmlFor="s-name">{t("auth.name")}</Label>
                    <Input id="s-name" name="name" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="s-email">{t("auth.email")}</Label>
                    <Input id="s-email" name="email" type="email" autoComplete="email" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="s-pass">{t("auth.password")}</Label>
                    <Input id="s-pass" name="password" type="password" autoComplete="new-password" minLength={6} required />
                    <p className="text-xs text-muted-foreground">{t("auth.minChars")}</p>
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? t("auth.creating") : t("auth.create")}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">{t("auth.backHome")}</Link>
        </p>
      </div>
    </div>
  );
}
