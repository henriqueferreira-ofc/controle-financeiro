import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useFinwise } from "@/store/finwise-store";
import type { Budget } from "@/store/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AlertTriangle, ChevronLeft, ChevronRight, History, LayoutDashboard, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { brl } from "@/lib/format";
import { useI18n } from "@/i18n/I18nProvider";

export const Route = createFileRoute("/_app/orcamentos")({
  head: () => ({
    meta: [
      { title: "AxisPay" },
      { name: "description", content: "bud.meta.desc" },
    ],
  }),
  component: BudgetsPage,
});

function BudgetCard({ 
  budget, category, spent, pct, over, onEdit, onDelete, isHistory = false 
}: { 
  budget: Budget; 
  category: any; 
  spent: number; 
  pct: number; 
  over: boolean; 
  onEdit?: () => void; 
  onDelete?: () => void;
  isHistory?: boolean;
}) {
  const { t } = useI18n();
  return (
    <Card className={`relative overflow-hidden ${over ? "border-destructive/30 bg-destructive/5" : ""}`}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ background: category?.color || "#64748b" }} />
              <p className="font-medium truncate">{category?.name || t("cat.removed")}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {budget.period === "monthly" ? t("bud.monthly") : t("bud.weekly")}
            </p>
          </div>
          {!isHistory && onEdit && onDelete && (
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={onEdit} className="h-8 w-8">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" onClick={onDelete} className="h-8 w-8 text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className={over ? "text-destructive font-semibold" : "font-medium"}>{brl(spent)}</span>
            <span className="text-muted-foreground">{brl(budget.amount)}</span>
          </div>
          <Progress value={pct} className={over ? "[&>div]:bg-destructive" : ""} />
          <div className="flex justify-between text-xs">
            <span className={over ? "text-destructive font-medium" : "text-muted-foreground"}>
              {t("bud.usedPct", { p: pct.toFixed(0) })}
            </span>
            {over && (
              <Badge variant="destructive" className="h-5 gap-1 px-1.5 text-[10px]">
                <AlertTriangle className="h-3 w-3" /> {t("bud.exceeded")}
              </Badge>
            )}
            {!over && isHistory && (
              <Badge variant="outline" className="h-5 border-success/40 text-success bg-success/5 text-[10px]">
                {t("common.withinLimit")}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BudgetsPage() {
  const { t } = useI18n();
  const { budgets, categories, transactions, addBudget, updateBudget, deleteBudget } = useFinwise();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [confirmDel, setConfirmDel] = useState<Budget | null>(null);

  const months = [
    t("month.0"), t("month.1"), t("month.2"), t("month.3"), 
    t("month.4"), t("month.5"), t("month.6"), t("month.7"), 
    t("month.8"), t("month.9"), t("month.10"), t("month.11")
  ];

  const despesaCats = categories.filter((c) => c.kind === "despesa");

  const [view, setView] = useState<"current" | "history">("current");
  const [historyMonth, setHistoryMonth] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7); // YYYY-MM
  });

  const spentByBudget = useMemo(() => {
    const map = new Map<string, number>();
    const now = view === "current" ? new Date() : new Date(historyMonth + "-01T12:00:00");
    
    for (const b of budgets) {
      let start: Date;
      let end: Date;
      
      if (b.period === "monthly") {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      } else {
        // Semanal só faz sentido no "atual" ou requer lógica complexa de histórico de semanas. 
        // Para simplificar no histórico mensal, ignoramos semanas ou tratamos como o mês todo.
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      }
      
      const startISO = start.toISOString().slice(0, 10);
      const endISO = end.toISOString().slice(0, 10);
      
      let total = 0;
      for (const t of transactions) {
        if (t.type !== "despesa" || t.categoryId !== b.categoryId) continue;
        if (t.date >= startISO && t.date <= endISO) {
          total += t.amount;
        }
      }
      map.set(b.id, total);
    }
    return map;
  }, [budgets, transactions, view, historyMonth]);

  const historyOptions = useMemo(() => {
    const opts = [];
    const now = new Date();
    const localeMap: Record<string, string> = { pt: "pt-BR", en: "en-US", es: "es-ES" };
    const currentLocale = localeMap[localStorage.getItem("axispay-locale") || "pt"];

    for (let i = 1; i <= 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      opts.push({
        label: d.toLocaleString(currentLocale, { month: "long", year: "numeric" }),
        value: d.toISOString().slice(0, 7),
      });
    }
    return opts;
  }, []);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("bud.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("bud.subtitle")}</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="shrink-0">
          <Plus className="mr-1 h-4 w-4" /> {t("bud.newBtn")}
        </Button>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as any)} className="w-full">
        <div className="flex items-center justify-between border-b pb-1">
          <TabsList className="bg-transparent h-auto p-0 gap-6">
            <TabsTrigger value="current" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 text-sm font-medium">
              {t("bud.tab.current")}
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 text-sm font-medium">
              {t("bud.tab.history")}
            </TabsTrigger>
          </TabsList>

          {view === "history" && (
            <Select value={historyMonth} onValueChange={setHistoryMonth}>
              <SelectTrigger className="h-8 w-[180px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {historyOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <TabsContent value="current" className="mt-6 space-y-4">
          {budgets.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Wallet className="mx-auto mb-3 h-10 w-10 opacity-50" />
                {t("bud.empty")}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {budgets.map((b) => {
                const cat = categories.find((c) => c.id === b.categoryId);
                const spent = spentByBudget.get(b.id) || 0;
                const pct = Math.min(100, (spent / b.amount) * 100);
                const over = spent > b.amount;
                return (
                  <BudgetCard 
                    key={b.id} 
                    budget={b} 
                    category={cat} 
                    spent={spent} 
                    pct={pct} 
                    over={over} 
                    onEdit={() => { setEditing(b); setOpen(true); }}
                    onDelete={() => setConfirmDel(b)}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {budgets.map((b) => {
              const cat = categories.find((c) => c.id === b.categoryId);
              const spent = spentByBudget.get(b.id) || 0;
              const pct = Math.min(100, (spent / b.amount) * 100);
              const over = spent > b.amount;
              return (
                <BudgetCard 
                  key={b.id} 
                  budget={b} 
                  category={cat} 
                  spent={spent} 
                  pct={pct} 
                  over={over} 
                  isHistory
                />
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <BudgetDialog
        open={open}
        onClose={() => { setOpen(false); setEditing(null); }}
        editing={editing}
        categories={despesaCats}
        existing={budgets}
        onSave={async (payload) => {
          if (editing) {
            await updateBudget(editing.id, payload);
            toast.success(t("bud.toast.updated"));
          } else {
            await addBudget(payload);
            toast.success(t("bud.toast.created"));
          }
          setOpen(false);
          setEditing(null);
        }}
      />

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("bud.delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("bud.delete.desc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (confirmDel) {
                  await deleteBudget(confirmDel.id);
                  toast.success(t("bud.toast.deleted"));
                  setConfirmDel(null);
                }
              }}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BudgetDialog({
  open, onClose, editing, categories, existing, onSave,
}: {
  open: boolean;
  onClose: () => void;
  editing: Budget | null;
  categories: { id: string; name: string }[];
  existing: Budget[];
  onSave: (b: Omit<Budget, "id">) => Promise<void>;
}) {
  const { t } = useI18n();
  const [categoryId, setCategoryId] = useState(editing?.categoryId || "");
  const [amount, setAmount] = useState(editing?.amount?.toString() || "");
  const [period, setPeriod] = useState<"monthly" | "weekly">(editing?.period || "monthly");

  // Reset on open
  useMemo(() => {
    if (open) {
      setCategoryId(editing?.categoryId || "");
      setAmount(editing?.amount?.toString() || "");
      setPeriod(editing?.period || "monthly");
    }
  }, [open, editing]);

  const submit = async () => {
    if (!categoryId) return toast.error(t("bud.errCategory"));
    const n = Number(amount);
    if (!n || n <= 0) return toast.error(t("bud.errAmount"));
    if (!editing) {
      const dup = existing.find((b) => b.categoryId === categoryId && b.period === period);
      if (dup) return toast.error(t("bud.errExists"));
    }
    await onSave({ categoryId, amount: n, period });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? t("common.edit") : t("bud.new")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("bud.category")}</Label>
            <Select value={categoryId} onValueChange={setCategoryId} disabled={!!editing}>
              <SelectTrigger><SelectValue placeholder={t("common.search")} /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("bud.amount")}</Label>
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label>{t("bud.period")}</Label>
            <Select value={period} onValueChange={(v) => setPeriod(v as "monthly" | "weekly")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">{t("bud.monthly")}</SelectItem>
                <SelectItem value="weekly">{t("bud.weekly")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
          <Button onClick={submit}>{t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
