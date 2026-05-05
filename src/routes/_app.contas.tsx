import { createFileRoute, Link } from "@tanstack/react-router";
import { useI18n } from "@/i18n/I18nProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { brl } from "@/lib/format";
import { Plus, Wallet, Calendar, TrendingUp, MoreVertical, X } from "lucide-react";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFinwise } from "@/store/finwise-store";
import { computeCurrentBalance } from "@/store/projection";
import {
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";

export const Route = createFileRoute("/_app/contas")({
  head: () => ({
    meta: [
      { title: "AxisPay — Contas" },
      { name: "description", content: "Gerencie suas contas bancárias e carteiras." },
    ],
  }),
  component: ContasPage,
});

const ACCOUNT_TYPES = [
  { id: "carteira", label: "Carteira", icon: "💰" },
  { id: "corrente", label: "Conta Corrente", icon: "🏦" },
  { id: "poupanca", label: "Poupança", icon: "🐷" },
  { id: "investimento", label: "Investimento", icon: "📈" },
  { id: "cartao", label: "Cartão de Crédito", icon: "💳" },
];

const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MONTHS_SHORT = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

function ContasPage() {
  const { t, locale } = useI18n();
  const { transactions } = useFinwise();
  const currentBalance = computeCurrentBalance(transactions);
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const dateLocales: Record<string, Locale> = { pt: ptBR, en: enUS, es: es };
  const dateLocale = dateLocales[locale] || ptBR;

  const now = new Date();
  const currentYear = now.getFullYear();

  // Build monthly chart data (Jan → Dec of current year)
  const monthlyData = useMemo(() => {
    return MONTHS_SHORT.map((shortLabel, monthIdx) => {
      const prefix = `${currentYear}-${String(monthIdx + 1).padStart(2, "0")}-`;
      const monthTxs = transactions.filter(tx => tx.date.startsWith(prefix));
      const income  = monthTxs.filter(tx => tx.type === "entrada").reduce((s, tx) => s + Math.abs(tx.amount), 0);
      const expense = monthTxs.filter(tx => tx.type === "despesa").reduce((s, tx) => s + Math.abs(tx.amount), 0);
      const saldo   = income - expense;
      return {
        label: `${shortLabel} ${currentYear}`,
        shortLabel,
        month: MONTHS_PT[monthIdx],
        income,
        expense,
        saldo,
        projected: saldo,
      };
    });
  }, [transactions, currentYear]);

  const projectedBalance = currentBalance;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-3 py-4 sm:px-4 sm:py-6 md:px-8 md:py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("accounts.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("accounts.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Stats toggle button */}
          <Button
            variant="outline"
            size="icon"
            className={`h-9 w-9 rounded-full border-border/60 transition-colors ${showStats ? "bg-primary text-primary-foreground border-primary" : ""}`}
            onClick={() => setShowStats(!showStats)}
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

      {/* ── Account Cards Grid (always visible) ── */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Nova Conta */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
              <button
                onClick={() => setShowNewAccount(true)}
                className="flex h-full min-h-[160px] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 transition-all hover:border-primary/60 hover:bg-primary/10 hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary/40 bg-background">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm font-semibold text-primary">{t("accounts.new")}</span>
              </button>
            </motion.div>

            {/* Carteira padrão */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }}>
              <Card className="border-border/60 shadow-[var(--shadow-card)]">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm">💰</div>
                      <span className="font-semibold text-sm">{t("accounts.wallet")}</span>
                    </div>
                    <button className="text-muted-foreground hover:text-foreground">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t("accounts.currentBalance")}</span>
                      <span className={`font-semibold tabular-nums ${currentBalance >= 0 ? "text-success" : "text-destructive"}`}>
                        {brl(currentBalance)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        {t("accounts.projectedBalance")} <Calendar className="h-3 w-3" />
                      </span>
                      <span className={`font-semibold tabular-nums ${projectedBalance >= 0 ? "text-success" : "text-destructive"}`}>
                        {brl(projectedBalance)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border/40">
                    <Link to="/registros" className="text-xs font-semibold uppercase tracking-wide text-primary hover:underline">
                      {t("accounts.addExpense")}
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* Right: Totals */}
        <div className="space-y-3">
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, delay: 0.1 }}>
            <Card className="border-border/60 shadow-[var(--shadow-card)]">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t("accounts.currentBalance")}</p>
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

          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, delay: 0.15 }}>
            <Card className="border-border/60 shadow-[var(--shadow-card)]">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t("accounts.projectedBalance")}</p>
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

          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, delay: 0.2 }}>
            <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 text-center">
              <p className="text-xs text-muted-foreground leading-relaxed">{t("accounts.comingSoon")}</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Stats Panel — shown when TrendingUp is clicked */}
      <AnimatePresence>
        {showStats && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            {/* ── Anexo 2: Saldo em Contas ── */}
            <Card className="border-border/60 shadow-[var(--shadow-card)]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-semibold">{t("accounts.balanceChart")}</CardTitle>
                <div className="flex items-center gap-2">
                  <Select defaultValue="all">
                    <SelectTrigger className="h-8 w-[160px] rounded-full border-primary/50 text-xs text-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("accounts.allAccounts")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {/* Period selectors */}
                <div className="mb-4 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
                  <span>{t("accounts.period")}</span>
                  <Select defaultValue="0">
                    <SelectTrigger className="h-7 w-[140px] rounded-full border-primary/50 text-xs text-primary font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS_PT.map((m, i) => (
                        <SelectItem key={i} value={String(i)}>{m} {currentYear}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span>—</span>
                  <Select defaultValue="11">
                    <SelectTrigger className="h-7 w-[140px] rounded-full border-primary/50 text-xs text-primary font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS_PT.map((m, i) => (
                        <SelectItem key={i} value={String(i)}>{m} {currentYear}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Line chart */}
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10 }}
                        stroke="var(--muted-foreground)"
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        stroke="var(--muted-foreground)"
                        tickFormatter={(v) => `R$ ${v.toLocaleString("pt-BR")}`}
                      />
                      <Tooltip
                        formatter={(value: number) => brl(value)}
                        contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: "12px" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="saldo"
                        name={t("accounts.allAccounts")}
                        stroke="#8B5CF6"
                        strokeWidth={2}
                        fill="url(#colorSaldo)"
                        dot={{ r: 4, fill: "#8B5CF6", strokeWidth: 2 }}
                        activeDot={{ r: 6 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#8B5CF6]" />
                  <span>{t("accounts.allAccounts")}</span>
                </div>
              </CardContent>
            </Card>

            {/* ── Anexo 3: Saldo por mês ── */}
            <Card className="border-border/60 shadow-[var(--shadow-card)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold">{t("accounts.monthlyTable")}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Period label */}
                <div className="px-6 pb-3 text-sm text-muted-foreground">
                  {MONTHS_PT[0]} {currentYear} — {MONTHS_PT[11]} {currentYear}
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/40 bg-muted/30">
                        <TableHead className="pl-6 font-semibold">{t("accounts.colMonth")}</TableHead>
                        <TableHead className="text-center font-semibold">{t("accounts.colTransfIn")}</TableHead>
                        <TableHead className="text-center font-semibold">{t("accounts.colTransfOut")}</TableHead>
                        <TableHead className="text-center font-semibold">{t("accounts.colIncome")}</TableHead>
                        <TableHead className="text-center font-semibold">{t("accounts.colExpense")}</TableHead>
                        <TableHead className="pr-6 text-right font-semibold">{t("accounts.colProjected")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyData.map((row, idx) => (
                        <TableRow key={idx} className="border-border/30 hover:bg-muted/20">
                          <TableCell className="pl-6 font-medium capitalize">{row.month} {currentYear}</TableCell>
                          <TableCell className="text-center text-muted-foreground">{brl(0)}</TableCell>
                          <TableCell className="text-center text-muted-foreground">{brl(0)}</TableCell>
                          <TableCell className="text-center">
                            <span className={row.income > 0 ? "text-success font-semibold" : "text-muted-foreground"}>
                              {brl(row.income)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={row.expense > 0 ? "text-destructive font-semibold" : "text-muted-foreground"}>
                              {brl(row.expense)}
                            </span>
                          </TableCell>
                          <TableCell className="pr-6 text-right">
                            <span className={`font-semibold tabular-nums ${row.saldo >= 0 ? "text-foreground" : "text-destructive"}`}>
                              {brl(row.saldo)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {/* Footer */}
                <div className="flex items-center justify-end gap-4 border-t border-border/40 px-6 py-3 text-xs text-muted-foreground">
                  <span>{t("accounts.colMonth")} 1–12 de 12</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>


      {/* New Account Modal */}
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
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">{t("accounts.new")}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{t("accounts.newDesc")}</p>
              </div>
              <button onClick={() => setShowNewAccount(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
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
              <p className="text-xs text-muted-foreground">🚀 {t("accounts.featureWip")}</p>
            </div>
            <Button variant="outline" className="mt-4 w-full" onClick={() => setShowNewAccount(false)}>
              {t("common.close")}
            </Button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
