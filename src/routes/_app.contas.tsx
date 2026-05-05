import { createFileRoute, Link } from "@tanstack/react-router";
import { useI18n } from "@/i18n/I18nProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { brl } from "@/lib/format";
import { Plus, Wallet, Calendar, TrendingUp, MoreVertical } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { useFinwise } from "@/store/finwise-store";
import { computeCurrentBalance } from "@/store/projection";

export const Route = createFileRoute("/_app/contas")({
  head: () => ({
    meta: [
      { title: "AxisPay — Contas" },
      { name: "description", content: "Gerencie suas contas bancárias e carteiras." },
    ],
  }),
  component: ContasPage,
});

// Tipos de conta disponíveis
const ACCOUNT_TYPES = [
  { id: "carteira", label: "Carteira", icon: "💰", color: "#8B5CF6" },
  { id: "corrente", label: "Conta Corrente", icon: "🏦", color: "#3B82F6" },
  { id: "poupanca", label: "Poupança", icon: "🐷", color: "#10B981" },
  { id: "investimento", label: "Investimento", icon: "📈", color: "#F59E0B" },
  { id: "cartao", label: "Cartão de Crédito", icon: "💳", color: "#EF4444" },
];

function ContasPage() {
  const { t } = useI18n();
  const { transactions } = useFinwise();
  const currentBalance = computeCurrentBalance(transactions);
  const [showNewAccount, setShowNewAccount] = useState(false);

  // Saldo projetado (por enquanto, igual ao atual já que não há contas cadastradas)
  const projectedBalance = currentBalance;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-3 py-4 sm:px-4 sm:py-6 md:px-8 md:py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("accounts.title") || "Contas"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("accounts.subtitle") || "Gerencie suas contas bancárias e carteiras."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full border-border/60"
          >
            <TrendingUp className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full border-border/60"
            onClick={() => setShowNewAccount(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Left: Account cards */}
        <div className="md:col-span-2 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Nova Conta card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <button
                onClick={() => setShowNewAccount(true)}
                className="flex h-full min-h-[160px] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 transition-all hover:border-primary/60 hover:bg-primary/10 hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary/40 bg-background">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm font-semibold text-primary">
                  {t("accounts.new") || "Nova conta"}
                </span>
              </button>
            </motion.div>

            {/* Carteira padrão */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.05 }}
            >
              <Card className="border-border/60 shadow-[var(--shadow-card)]">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                        style={{ backgroundColor: "#8B5CF620", color: "#8B5CF6" }}
                      >
                        💰
                      </div>
                      <span className="font-semibold text-sm">
                        {t("accounts.wallet") || "Carteira"}
                      </span>
                    </div>
                    <button className="text-muted-foreground hover:text-foreground">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t("accounts.currentBalance") || "Saldo atual"}
                      </span>
                      <span className={`font-semibold tabular-nums ${currentBalance >= 0 ? "text-success" : "text-destructive"}`}>
                        {brl(currentBalance)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        {t("accounts.projectedBalance") || "Saldo previsto"}
                        <Calendar className="h-3 w-3" />
                      </span>
                      <span className={`font-semibold tabular-nums ${projectedBalance >= 0 ? "text-success" : "text-destructive"}`}>
                        {brl(projectedBalance)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border/40">
                    <Link
                      to="/registros"
                      className="text-xs font-semibold uppercase tracking-wide text-primary hover:underline"
                    >
                      {t("accounts.addExpense") || "+ Adicionar despesa"}
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* Right: Totals summary */}
        <div className="space-y-3">
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: 0.1 }}
          >
            <Card className="border-border/60 shadow-[var(--shadow-card)]">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {t("accounts.currentBalance") || "Saldo atual"}
                  </p>
                  <p className={`text-xl font-bold tabular-nums ${currentBalance >= 0 ? "text-foreground" : "text-destructive"}`}>
                    {brl(currentBalance)}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Wallet className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: 0.15 }}
          >
            <Card className="border-border/60 shadow-[var(--shadow-card)]">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {t("accounts.projectedBalance") || "Saldo previsto"}
                  </p>
                  <p className={`text-xl font-bold tabular-nums ${projectedBalance >= 0 ? "text-foreground" : "text-destructive"}`}>
                    {brl(projectedBalance)}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Calendar className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Info box */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: 0.2 }}
          >
            <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 text-center">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("accounts.comingSoon") || "Em breve você poderá cadastrar múltiplas contas bancárias e cartões de crédito."}
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* New Account Modal placeholder */}
      {showNewAccount && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowNewAccount(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-1">
              {t("accounts.new") || "Nova Conta"}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {t("accounts.newDesc") || "Escolha o tipo de conta que deseja cadastrar."}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {ACCOUNT_TYPES.map((type) => (
                <button
                  key={type.id}
                  className="flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-background p-4 text-center transition-all hover:border-primary/50 hover:bg-primary/5 hover:shadow-md"
                  onClick={() => setShowNewAccount(false)}
                >
                  <span className="text-2xl">{type.icon}</span>
                  <span className="text-xs font-medium">{type.label}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 rounded-lg bg-muted/40 p-3 text-center">
              <p className="text-xs text-muted-foreground">
                🚀 {t("accounts.featureWip") || "Funcionalidade em desenvolvimento. Em breve disponível!"}
              </p>
            </div>
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={() => setShowNewAccount(false)}
            >
              {t("common.close") || "Fechar"}
            </Button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
