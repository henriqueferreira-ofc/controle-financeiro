import { createFileRoute, Link } from "@tanstack/react-router";
import { useI18n } from "@/i18n/I18nProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { brl } from "@/lib/format";
import { Plus, Search, Filter, ArrowUpCircle, ArrowDownCircle, BarChart2, ChevronLeft, ChevronRight, CheckCircle2, Circle } from "lucide-react";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useFinwise } from "@/store/finwise-store";
import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/receitas")({
  head: () => ({
    meta: [
      { title: "AxisPay — Receitas" },
      { name: "description", content: "Gerencie todas as suas receitas e entradas financeiras." },
    ],
  }),
  component: ReceitasPage,
});

function ReceitasPage() {
  const { t, locale } = useI18n();
  const { transactions, categories, updateTransaction } = useFinwise();
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());

  const dateLocales = { pt: ptBR, en: enUS, es: es };
  const dateLocale = dateLocales[locale] || ptBR;

  // Navigate months
  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const catById = useMemo(() => {
    const m = new Map<string, typeof categories[number]>();
    categories.forEach(c => m.set(c.id, c));
    return m;
  }, [categories]);

  // Filter only income transactions for the selected month
  const filtered = useMemo(() => {
    const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-`;
    return transactions
      .filter(t => t.type === "entrada" && t.date.startsWith(prefix))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, currentMonth, currentYear]);

  const totals = useMemo(() => {
    const total = filtered.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const received = filtered.filter(t => t.paid).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const pending = total - received;
    return { total, received, pending };
  }, [filtered]);

  const monthLabel = format(new Date(currentYear, currentMonth, 1), "MMMM yyyy", { locale: dateLocale });
  const monthLabelShort = format(new Date(currentYear, currentMonth, 1), "MMM", { locale: dateLocale });
  const monthYear = format(new Date(currentYear, currentMonth, 1), "yyyy", { locale: dateLocale });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 px-3 py-4 sm:px-4 sm:py-6 md:px-8 md:py-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Badge className="bg-success text-success-foreground px-4 py-1.5 text-sm font-semibold rounded-full cursor-default select-none">
            ✓ {t("common.income") || "Receitas"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild className="gap-1.5 bg-success text-success-foreground hover:bg-success/90 shadow-sm">
            <Link to="/registros">
              <Plus className="h-4 w-4" />
              {t("income.new") || "Nova Receita"}
            </Link>
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-full border-border/60">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-full border-border/60">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Mini Cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="border-border/60 shadow-[var(--shadow-card)] cursor-pointer hover:border-success/40 transition-colors">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/15">
                <ArrowUpCircle className="h-5 w-5 text-success" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{t("income.pending") || "Receitas pendentes"}</p>
                <p className="text-lg font-bold tabular-nums text-success">{brl(totals.pending)}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border-border/60 shadow-[var(--shadow-card)] cursor-pointer hover:border-success/40 transition-colors">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/15">
                <ArrowDownCircle className="h-5 w-5 text-success" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{t("income.received") || "Receitas recebidas"}</p>
                <p className="text-lg font-bold tabular-nums text-success">{brl(totals.received)}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-border/60 shadow-[var(--shadow-card)] cursor-pointer hover:border-success/40 transition-colors">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/15">
                <BarChart2 className="h-5 w-5 text-success" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{t("common.total") || "Total"}</p>
                <p className="text-lg font-bold tabular-nums text-success">{brl(totals.total)}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Table Card */}
      <Card className="border-border/60 shadow-[var(--shadow-card)]">
        {/* Month navigator */}
        <div className="flex items-center justify-center gap-4 border-b border-border/40 py-3">
          <button
            onClick={prevMonth}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="rounded-full border border-success/60 bg-success/5 px-5 py-1 text-sm font-semibold text-success">
            <span className="capitalize">{monthLabelShort}</span>{" "}
            <span className="text-muted-foreground font-normal">{monthYear}</span>
          </span>
          <button
            onClick={nextMonth}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/40">
                <TableHead className="w-10 pl-4"><input type="checkbox" className="rounded" /></TableHead>
                <TableHead>{t("rec.col.status") || "Situação"}</TableHead>
                <TableHead className="flex items-center gap-1">
                  {t("rec.col.date") || "Data"}
                </TableHead>
                <TableHead>{t("rec.col.description") || "Descrição"}</TableHead>
                <TableHead>{t("rec.col.category") || "Categoria"}</TableHead>
                <TableHead>{t("accounts.wallet") || "Conta"}</TableHead>
                <TableHead className="text-right">{t("rec.col.amount") || "Valor"}</TableHead>
                <TableHead className="text-right">{t("rec.col.actions") || "Ações"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-4 py-12">
                      <div className="text-6xl">🔭</div>
                      <p className="text-sm text-muted-foreground font-medium">
                        {t("rep.empty") || "Nenhum resultado"}
                      </p>
                      <Button asChild size="sm" className="bg-success text-success-foreground hover:bg-success/90">
                        <Link to="/registros">
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          {t("income.new") || "Nova Receita"}
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((tx) => {
                  const cat = tx.categoryId ? catById.get(tx.categoryId) : undefined;
                  return (
                    <TableRow key={tx.id} className="border-border/30 hover:bg-muted/20 transition-colors">
                      <TableCell className="pl-4"><input type="checkbox" className="rounded" /></TableCell>
                      <TableCell>
                        <button
                          onClick={() => updateTransaction(tx.id, { paid: !tx.paid })}
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full transition-all",
                            tx.paid ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                          )}
                        >
                          {tx.paid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                        </button>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(tx.date + "T12:00:00"), "dd/MM/yyyy", { locale: dateLocale })}
                      </TableCell>
                      <TableCell className="font-medium">{tx.description}</TableCell>
                      <TableCell>
                        {cat ? (
                          <Badge variant="secondary" className="font-normal" style={{ backgroundColor: cat.color + "20", color: cat.color }}>
                            {cat.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {t("accounts.wallet") || "Carteira"}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-success">
                        + {brl(Math.abs(tx.amount))}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-primary">
                          <Link to="/registros">{t("common.view") || "Ver"}</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
