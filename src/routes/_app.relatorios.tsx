import { createFileRoute } from "@tanstack/react-router";
import { useFinwise } from "@/store/finwise-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { brl } from "@/lib/format";
import { ArrowDownRight, ArrowUpRight, BarChart3, Calendar, Wallet } from "lucide-react";
import { useState, useMemo } from "react";
import { KpiCard } from "@/components/KpiCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { useI18n } from "@/i18n/I18nProvider";

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
  const { transactions, categories } = useFinwise();

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
              filteredData.transactions.map((t) => {
                const cat = t.categoryId ? catById.get(t.categoryId) : undefined;
                const isIncome = t.type === 'entrada';
                return (
                  <div key={t.id} className="flex items-center justify-between p-4 bg-card/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        isIncome ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                      }`}>
                        {isIncome ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{t.description}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(t.date + "T12:00:00"), "dd/MM/yy", { locale: dateLocale })}
                          </span>
                          <span className="text-xs font-medium" style={{ color: cat?.color }}>
                            {cat?.name || t("cat.none")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className={`text-sm font-bold tabular-nums ${isIncome ? 'text-success' : 'text-destructive'}`}>
                      {isIncome ? '+' : '-'} {brl(Math.abs(t.amount))}
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        {t("rep.empty")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.transactions.map((t) => {
                      const cat = t.categoryId ? catById.get(t.categoryId) : undefined;
                      const isIncome = t.type === 'entrada';
                      return (
                        <TableRow key={t.id} className="hover:bg-muted/30">
                          <TableCell className="text-xs text-muted-foreground px-4">
                            {format(new Date(t.date + "T12:00:00"), "dd/MM/yy", { locale: dateLocale })}
                          </TableCell>
                          <TableCell className="font-medium px-4">{t.description}</TableCell>
                          <TableCell className="px-4">
                            <Badge variant="secondary" className="font-normal h-5" style={{
                              backgroundColor: cat?.color + '20',
                              color: cat?.color,
                              borderColor: cat?.color + '40'
                            }}>
                              {cat?.name || t("cat.none")}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-right font-semibold tabular-nums px-4 ${isIncome ? 'text-success' : 'text-destructive'}`}>
                            {isIncome ? '+' : '-'} {brl(Math.abs(t.amount))}
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
    </div>
  );
}
