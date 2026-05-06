import { createFileRoute } from "@tanstack/react-router";
import { useFinwise } from "@/store/finwise-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { brl } from "@/lib/format";
import { ArrowDownRight, ArrowUpRight, BarChart3, Calendar, CheckCircle2, Circle, Wallet, Pencil } from "lucide-react";
import { useState, useMemo } from "react";
import { KpiCard } from "@/components/KpiCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { useI18n } from "@/i18n/I18nProvider";
import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";
import { TransactionDialog } from "@/components/TransactionDialog";
import type { Transaction } from "@/store/types";

export const Route = createFileRoute("/_app/relatorios")({
  head: () => ({
    meta: [
      { title: "AxisPay" },
      { name: "description", content: "Análise detalhada de entradas e saídas por mês." },
    ],
  }),
  component: RelatoriosPage,
});

function RelatoriosPage() {
  const { t } = useI18n();
  const { transactions, categories, updateTransaction } = useFinwise();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  function openEdit(tx: Transaction) {
    setSelectedTx(tx);
    setDialogOpen(true);
  }

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear().toString());

  // Fase 4 — perf: indexa categorias por id (lookup O(1))
  const catById = useMemo(() => {
    const m = new Map<string, typeof categories[number]>();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);

  const years = useMemo(() => {
    const y = new Set<string>();
    y.add(now.getFullYear().toString());
    transactions.forEach(t => y.add(t.date.slice(0, 4)));
    return Array.from(y).sort((a, b) => b.localeCompare(a));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions]);

  const months = [
    { value: "0", label: t("month.0") }, { value: "1", label: t("month.1") },
    { value: "2", label: t("month.2") }, { value: "3", label: t("month.3") },
    { value: "4", label: t("month.4") }, { value: "5", label: t("month.5") },
    { value: "6", label: t("month.6") }, { value: "7", label: t("month.7") },
    { value: "8", label: t("month.8") }, { value: "9", label: t("month.9") },
    { value: "10", label: t("month.10") }, { value: "11", label: t("month.11") },
  ];

  const filteredData = useMemo(() => {
    const m = parseInt(selectedMonth);
    const y = parseInt(selectedYear);
    const yStr = String(y);
    const mStr = String(m + 1).padStart(2, "0");
    const prefix = `${yStr}-${mStr}-`;

    // Fase 4 — perf: filtra por prefixo de string (sem instanciar Date por linha)
    const periodTransactions = transactions.filter(t => t.date.startsWith(prefix));

    let totalIn = 0;
    let totalOut = 0;
    for (const t of periodTransactions) {
      if (t.type === "entrada") totalIn += Math.abs(t.amount);
      else totalOut += Math.abs(t.amount);
    }

    return {
      transactions: periodTransactions.sort((a, b) => b.date.localeCompare(a.date)),
      totalIn,
      totalOut,
      balance: totalIn - totalOut,
    };
  }, [transactions, selectedMonth, selectedYear]);

  const categoryChartData = useMemo(() => {
    const expenses = filteredData.transactions.filter(t => t.type === 'despesa');
    const grouped = new Map<string, { value: number; name: string; color: string }>();

    for (const tx of expenses) {
      const cat = tx.categoryId ? catById.get(tx.categoryId) : undefined;
      const catId = tx.categoryId || 'none';
      const current = grouped.get(catId) || { 
        value: 0, 
        name: cat?.name || t("cat.none"), 
        color: cat?.color || '#94a3b8' 
      };
      current.value += Math.abs(tx.amount);
      grouped.set(catId, current);
    }

    return Array.from(grouped.values()).sort((a, b) => b.value - a.value);
  }, [filteredData.transactions, catById, t]);

    const { locale } = useI18n();
    const dateLocales = { pt: ptBR, en: enUS, es: es };
    const dateLocale = dateLocales[locale] || ptBR;

    return (
      <div className="mx-auto w-full max-w-7xl space-y-4 px-3 py-4 sm:space-y-6 sm:px-4 sm:py-6 md:px-8 md:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("rep.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("rep.subtitle")}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-full sm:w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard
          label={t("rep.kpi.balance")}
          value={brl(filteredData.balance)}
          tone={filteredData.balance >= 0 ? "success" : "destructive"}
          icon={Wallet}
        />
        <KpiCard
          label={t("rep.kpi.in")}
          value={brl(filteredData.totalIn)}
          tone="success"
          icon={ArrowUpRight}
        />
        <KpiCard
          label={t("rep.kpi.out")}
          value={brl(filteredData.totalOut)}
          tone="destructive"
          icon={ArrowDownRight}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2 border-border/60 shadow-[var(--shadow-card)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">{t("rep.chart.byCategory") || "Gastos por Categoria"}</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryChartData.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                {t("rep.empty")}
              </div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: number) => brl(value)}
                      contentStyle={{ 
                        borderRadius: '8px', 
                        border: 'none', 
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        fontSize: '12px'
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      content={({ payload }) => (
                        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-4">
                          {payload?.map((entry: any, index: number) => (
                            <div key={`legend-${index}`} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                              <span>{entry.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-border/60 shadow-[var(--shadow-card)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">{t("rep.breakdown") || "Detalhamento de Gastos"}</CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <div className="space-y-4">
              {categoryChartData.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  {t("rep.empty")}
                </div>
              ) : (
                categoryChartData.map((item, index) => {
                  const percentage = ((item.value / filteredData.totalOut) * 100).toFixed(1);
                  return (
                    <div key={index} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="font-medium">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2 tabular-nums">
                          <span className="text-muted-foreground text-xs">{percentage}%</span>
                          <span className="font-semibold">{brl(item.value)}</span>
                        </div>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted/50">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ 
                            width: `${percentage}%`,
                            backgroundColor: item.color
                          }} 
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 shadow-[var(--shadow-card)]">
        <CardHeader className="flex flex-row items-center justify-between px-4 pb-2 pt-4 sm:px-6">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="hidden sm:inline">{t("rep.list", { m: months[parseInt(selectedMonth)].label })}</span>
          </CardTitle>
          <Badge variant="outline" className="font-normal text-[10px] sm:text-xs">
            {t("rep.kpi.count", { n: filteredData.transactions.length })}
          </Badge>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {/* MOBILE VIEW */}
          <div className="divide-y divide-border/40 sm:hidden">
            {filteredData.transactions.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground px-4">
                {t("rep.empty")}
              </div>
            ) : (
              filteredData.transactions.map((tx) => {
                const cat = tx.categoryId ? catById.get(tx.categoryId) : undefined;
                const isIncome = tx.type === 'entrada';
                return (
                  <div key={tx.id} className="flex items-center justify-between p-4 bg-card/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        isIncome ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                      }`}>
                        {isIncome ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{tx.description}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(tx.date + "T12:00:00"), "dd/MM/yy", { locale: dateLocale })}
                          </span>
                          <span className="text-xs font-medium" style={{ color: cat?.color }}>
                            {cat?.name || t("cat.none")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`text-sm font-bold tabular-nums ${!isIncome && tx.paid ? 'text-success' : isIncome ? 'text-success' : 'text-destructive'}`}>
                        {isIncome ? '+' : '-'} {brl(Math.abs(tx.amount))}
                      </div>
                      {!isIncome && (
                        <button 
                          onClick={() => updateTransaction(tx.id, { paid: !tx.paid })}
                          className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                            tx.paid ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {tx.paid ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* DESKTOP VIEW */}
          <div className="hidden sm:block">
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24 px-4">{t("rec.col.date")}</TableHead>
                    <TableHead className="px-4">{t("rec.col.description")}</TableHead>
                    <TableHead className="px-4">{t("rec.col.category")}</TableHead>
                    <TableHead className="text-right px-4">{t("rec.col.amount")}</TableHead>
                    <TableHead className="w-20 px-4 text-center">{t("common.paid") || "Pago"}</TableHead>
                    <TableHead className="w-16 px-4 text-right">{t("rec.col.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        {t("rep.empty")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.transactions.map((tx) => {
                      const cat = tx.categoryId ? catById.get(tx.categoryId) : undefined;
                      const isIncome = tx.type === 'entrada';
                      return (
                        <TableRow 
                          key={tx.id} 
                          className={cn(
                            "hover:bg-muted/30 transition-colors",
                            !isIncome && tx.paid && "bg-success/5 hover:bg-success/10"
                          )}
                        >
                          <TableCell className="text-xs text-muted-foreground px-4">
                            {format(new Date(tx.date + "T12:00:00"), "dd/MM/yy", { locale: dateLocale })}
                          </TableCell>
                          <TableCell className={cn("font-medium px-4", !isIncome && tx.paid && "text-success")}>{tx.description}</TableCell>
                          <TableCell className="px-4">
                            <Badge variant="secondary" className="font-normal h-5" style={{
                              backgroundColor: cat?.color + '20',
                              color: cat?.color,
                              borderColor: cat?.color + '40'
                            }}>
                              {cat?.name || t("cat.none")}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-right font-semibold tabular-nums px-4 ${!isIncome && tx.paid ? 'text-success' : isIncome ? 'text-success' : 'text-destructive'}`}>
                            {isIncome ? '+' : '-'} {brl(Math.abs(tx.amount))}
                          </TableCell>
                          <TableCell className="px-4 text-center">
                            {!isIncome && (
                              <button 
                                onClick={() => updateTransaction(tx.id, { paid: !tx.paid })}
                                className={cn(
                                  "mx-auto flex h-7 w-7 items-center justify-center rounded-full transition-all",
                                  tx.paid 
                                    ? "bg-success text-success-foreground shadow-sm" 
                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                                )}
                              >
                                {tx.paid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                              </button>
                            )}
                          </TableCell>
                          <TableCell className="px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1 text-xs text-primary hover:bg-primary/10"
                              onClick={() => openEdit(tx)}
                            >
                              <Pencil className="h-3 w-3" />
                              {t("common.view")}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={selectedTx}
        mode="edit"
      />
    </div>
  );
}
