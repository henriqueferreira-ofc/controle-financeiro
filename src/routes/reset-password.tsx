import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Wallet } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — AxisPay" },
      { name: "description", content: "Defina uma nova senha para sua conta AxisPay." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const { t } = useI18n();
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") || "");
    const confirm = String(fd.get("confirm") || "");
    if (password.length < 6) return toast.error(t("reset.errMin"));
    if (password !== confirm) return toast.error(t("reset.errMatch"));
    setSubmitting(true);
    const { error } = await updatePassword(password);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("reset.success"));
      navigate({ to: "/" });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
            <Wallet className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">AxisPay</h1>
        </div>
        <Card className="border-border/60 shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="text-lg">{t("reset.title")}</CardTitle>
            <CardDescription>{t("reset.desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {!ready ? (
              <p className="text-sm text-muted-foreground">{t("reset.waiting")}</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid gap-2">
                  <Label htmlFor="np">{t("reset.new")}</Label>
                  <Input id="np" name="password" type="password" minLength={6} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cp">{t("reset.confirm")}</Label>
                  <Input id="cp" name="confirm" type="password" minLength={6} required />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? t("reset.saving") : t("reset.submit")}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
