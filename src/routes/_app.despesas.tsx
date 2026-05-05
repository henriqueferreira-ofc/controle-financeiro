import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/i18n/I18nProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { brl } from "@/lib/format";
import {
  Plus, Search, Filter, ArrowUpCircle, ArrowDownCircle, BarChart2,
  ChevronLeft, ChevronRight, CheckCircle2, Circle, Pencil, X,
} from "lucide-react";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFinwise } from "@/store/finwise-store";
import type { Transaction } from "@/store/types";
import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { TransactionDialog } from "@/components/TransactionDialog";

export const Route = createFileRoute("/_app/despesas")({
  head: () => ({
    meta: [
      { title: "AxisPay — Despesas" },
      { name: "description", content: "Gerencie todas as suas despesas e saídas financeiras." },
    ],
  }),
  component: DespesasPage,
});

function DespesasPage() {
  const { t, locale } = useI18n();
  const { transactions, categories, updateTransaction } = useFinwise();
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());

  // UI state
  const [showSearch, setShowSearch] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all"); // all | paid | pending

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const dateLocales: Record<string, Locale> = { pt: ptBR, en: enUS, es: es };
  const dateLocale = dateLocales[locale] || ptBR;

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

  // Expense categories used in this month
  const expenseCategories = useMemo(() => {
    const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-`;
    const usedCatIds = new Set(
      transactions
        .filter(tx => tx.type === "despesa" && tx.date.startsWith(prefix) && tx.categoryId)
        .map(tx => tx.categoryId!)
    );
    return categories.filter(c => usedCatIds.has(c.id));
  }, [transactions, categories, currentMonth, currentYear]);

  const filtered = useMemo(() => {
    const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-`;
    return transactions
      .filter(tx => {
        if (tx.type !== "despesa") return false;
        if (!tx.date.startsWith(prefix)) return false;
        if (searchQuery && !tx.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (filterCategory !== "all" && tx.categoryId !== filterCategory) return false;
        if (filterStatus === "paid" && !tx.paid) return false;
        if (filterStatus === "pending" && tx.paid) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, currentMonth, currentYear, searchQuery, filterCategory, filterStatus]);

  const totals = useMemo(() => {
    const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-`;
    const all = transactions.filter(tx => tx.type === "despesa" && tx.date.startsWith(prefix));
    const total = all.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const paid = all.filter(tx => tx.paid).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    return { total, paid, pending: total - paid };
  }, [transactions, currentMonth, currentYear]);

  const monthLabelShort = format(new Date(currentYear, currentMonth, 1), "MMM", { locale: dateLocale });
  const monthYear = format(new Date(currentYear, currentMonth, 1), "yyyy", { locale: dateLocale });

  const hasActiveFilters = filterCategory !== "all" || filterStatus !== "all" || searchQuery !== "";

  function openNew() {
    setSelectedTx(null);
    setDialogMode("create");
    setDialogOpen(true);
  }

  function openEdit(tx: Transaction) {
    setSelectedTx(tx);
    setDialogMode("edit");
    setDialogOpen(true);
  }

  function clearFilters() {
    setSearchQuery("");
    setFilterCategory("all");
    setFilterStatus("all");
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 px-3 py-4 sm:px-4 sm:py-6 md:px-8 md:py-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Badge className="w-fit bg-destructive text-destructive-foreground px-4 py-1.5 text-sm font-semibold rounded-full cursor-default select-none">
          ↓ {t("common.expense")}
        </Badge>
        <div className="flex items-center gap-2">
          <Button className="gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm" onClick={openNew}>
            <Plus className="h-4 w-4" />
            {t("expense.new")}
          </Button>
          <Button
            variant="outline"
            size="icon"
            className={cn("h-9 w-9 rounded-full border-border/60 transition-colors", showSearch && "bg-primary/10 border-primary/40")}
            onClick={() => { setShowSearch(s => !s); setShowFilter(false); }}
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className={cn("h-9 w-9 rounded-full border-border/60 transition-colors", (showFilter || hasActiveFilters) && "bg-primary/10 border-primary/40")}
            onClick={() => { setShowFilter(s => !s); setShowSearch(false); }}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder={t("common.search") || "Buscar despesas..."}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-9 rounded-full border-border/60"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter panel */}
      <AnimatePresence>
        {showFilter && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <Card className="border-border/60 border-dashed">
              <CardContent className="flex flex-wrap items-center gap-3 p-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Filtros</span>
                </div>

                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="h-8 w-[180px] rounded-full text-xs">
                    <SelectValue placeholder={t("common.allCategories")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.allCategories")}</SelectItem>
                    {expenseCategories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-8 w-[160px] rounded-full text-xs">
                    <SelectValue placeholder="Situação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="paid">{t("expense.paid")}</SelectItem>
                    <SelectItem value="pending">{t("expense.pending")}</SelectItem>
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground" onClick={clearFilters}>
                    <X className="h-3 w-3" />
                    Limpar
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI Mini Cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card
            className="border-border/60 shadow-[var(--shadow-card)] hover:border-destructive/40 transition-colors cursor-pointer"
            onClick={() => { setFilterStatus(filterStatus === "pending" ? "all" : "pending"); setShowFilter(true); }}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/15">
                <ArrowUpCircle className="h-5 w-5 text-destructive" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{t("expense.pending")}</p>
                <p className="text-lg font-bold tabular-nums text-destructive">{brl(totals.pending)}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card
            className="border-border/60 shadow-[var(--shadow-card)] hover:border-destructive/40 transition-colors cursor-pointer"
            onClick={() => { setFilterStatus(filterStatus === "paid" ? "all" : "paid"); setShowFilter(true); }}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/15">
                <ArrowDownCircle className="h-5 w-5 text-destructive" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{t("expense.paid")}</p>
                <p className="text-lg font-bold tabular-nums text-destructive">{brl(totals.paid)}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-border/60 shadow-[var(--shadow-card)] hover:border-destructive/40 transition-colors">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/15">
                <BarChart2 className="h-5 w-5 text-destructive" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{t("common.total")}</p>
                <p className="text-lg font-bold tabular-nums text-destructive">{brl(totals.total)}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Filtrando:</span>
          {searchQuery && (
            <Badge variant="secondary" className="gap-1 text-xs">
              "{searchQuery}"
              <button onClick={() => setSearchQuery("")}><X className="h-3 w-3" /></button>
            </Badge>
          )}
          {filterCategory !== "all" && (
            <Badge variant="secondary" className="gap-1 text-xs">
              {catById.get(filterCategory)?.name}
              <button onClick={() => setFilterCategory("all")}><X className="h-3 w-3" /></button>
            </Badge>
          )}
          {filterStatus !== "all" && (
            <Badge variant="secondary" className="gap-1 text-xs">
              {filterStatus === "paid" ? t("expense.paid") : t("expense.pending")}
              <button onClick={() => setFilterStatus("all")}><X className="h-3 w-3" /></button>
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">{filtered.length} resultado(s)</span>
        </div>
      )}

      {/* Table Card */}
      <Card className="border-border/60 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-center gap-4 border-b border-border/40 py-3">
          <button onClick={prevMonth} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="rounded-full border border-destructive/60 bg-destructive/5 px-5 py-1 text-sm font-semibold text-destructive">
            <span className="capitalize">{monthLabelShort}</span>{" "}
            <span className="text-muted-foreground font-normal">{monthYear}</span>
          </span>
          <button onClick={nextMonth} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/40">
                <TableHead className="w-10 pl-4"><input type="checkbox" className="rounded" /></TableHead>
                <TableHead>{t("rec.col.status")}</TableHead>
                <TableHead>{t("rec.col.date")}</TableHead>
                <TableHead>{t("rec.col.description")}</TableHead>
                <TableHead>{t("rec.col.category")}</TableHead>
                <TableHead>{t("accounts.wallet")}</TableHead>
                <TableHead className="text-right">{t("rec.col.amount")}</TableHead>
                <TableHead className="text-right">{t("rec.col.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-4 py-12">
                      <div className="text-6xl">🔭</div>
                      <p className="text-sm text-muted-foreground font-medium">
                        {hasActiveFilters ? "Nenhum resultado para os filtros aplicados." : (t("rep.empty") || "Nenhum resultado")}
                      </p>
                      {hasActiveFilters ? (
                        <Button variant="outline" size="sm" onClick={clearFilters}>
                          <X className="h-3.5 w-3.5 mr-1" /> Limpar filtros
                        </Button>
                      ) : (
                        <Button className="bg-destructive text-destructive-foreground hover:bg-destructive/90" size="sm" onClick={openNew}>
                          <Plus className="h-3.5 w-3.5 mr-1" />{t("expense.new")}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((tx) => {
                  const cat = tx.categoryId ? catById.get(tx.categoryId) : undefined;
                  return (
                    <TableRow
                      key={tx.id}
                      className={cn(
                        "border-border/30 hover:bg-muted/20 transition-colors",
                        tx.paid && "bg-success/5 hover:bg-success/10"
                      )}
                    >
                      <TableCell className="pl-4"><input type="checkbox" className="rounded" /></TableCell>
                      <TableCell>
                        <button
                          onClick={() => updateTransaction(tx.id, { paid: !tx.paid })}
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full transition-all",
                            tx.paid ? "bg-success text-success-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"
                          )}
                        >
                          {tx.paid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                        </button>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(tx.date + "T12:00:00"), "dd/MM/yyyy", { locale: dateLocale })}
                      </TableCell>
                      <TableCell className={cn("font-medium", tx.paid && "text-success")}>{tx.description}</TableCell>
                      <TableCell>
                        {cat ? (
                          <Badge variant="secondary" className="font-normal" style={{ backgroundColor: cat.color + "20", color: cat.color }}>
                            {cat.name}
                          </Badge>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{t("accounts.wallet")}</TableCell>
                      <TableCell className={cn("text-right font-semibold tabular-nums", tx.paid ? "text-success" : "text-destructive")}>
                        - {brl(Math.abs(tx.amount))}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-primary hover:bg-primary/10" onClick={() => openEdit(tx)}>
                          <Pencil className="h-3 w-3" />{t("common.view")}
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

      <TransactionDialog open={dialogOpen} onOpenChange={setDialogOpen} initial={selectedTx} mode={dialogMode} />
    </div>
  );
}
