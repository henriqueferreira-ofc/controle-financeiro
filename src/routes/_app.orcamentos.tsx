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
import { AlertTriangle, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_app/orcamentos")({
  head: () => ({
    meta: [
      { title: "Orçamentos — FinWise" },
      { name: "description", content: "Defina limites mensais ou semanais por categoria e acompanhe o progresso." },
    ],
  }),
  component: BudgetsPage,
});

function BudgetsPage() {
  const { budgets, categories, transactions, addBudget, updateBudget, deleteBudget } = useFinwise();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [confirmDel, setConfirmDel] = useState<Budget | null>(null);

  const despesaCats = categories.filter((c) => c.kind === "despesa");

  const spentByBudget = useMemo(() => {
    const map = new Map<string, number>();
    const now = new Date();
    for (const b of budgets) {
      let start: Date;
      if (b.period === "monthly") {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
        const day = now.getDay();
        start = new Date(now);
        start.setDate(now.getDate() - day);
        start.setHours(0, 0, 0, 0);
      }
      const startISO = start.toISOString().slice(0, 10);
      let total = 0;
      for (const t of transactions) {
        if (t.type !== "despesa") continue;
        if (t.categoryId !== b.categoryId) continue;
        if (t.date < startISO) continue;
        total += t.amount;
      }
      map.set(b.id, total);
    }
    return map;
  }, [budgets, transactions]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Orçamentos</h1>
          <p className="text-sm text-muted-foreground">Defina limites por categoria e acompanhe gastos.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="mr-1 h-4 w-4" /> Novo orçamento
        </Button>
      </div>

      {budgets.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Wallet className="mx-auto mb-3 h-10 w-10 opacity-50" />
            Nenhum orçamento criado. Comece definindo um limite para uma categoria.
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
              <Card key={b.id} className="relative overflow-hidden">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ background: cat?.color || "#64748b" }} />
                        <p className="font-medium truncate">{cat?.name || "Categoria removida"}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {b.period === "monthly" ? "Mensal" : "Semanal"}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(b); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setConfirmDel(b)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className={over ? "text-destructive font-medium" : ""}>{brl(spent)}</span>
                      <span className="text-muted-foreground">{brl(b.amount)}</span>
                    </div>
                    <Progress value={pct} className={over ? "[&>div]:bg-destructive" : ""} />
                    <div className="flex justify-between text-xs">
                      <span className={over ? "text-destructive" : "text-muted-foreground"}>
                        {pct.toFixed(0)}% utilizado
                      </span>
                      {over && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" /> Excedido
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <BudgetDialog
        open={open}
        onClose={() => { setOpen(false); setEditing(null); }}
        editing={editing}
        categories={despesaCats}
        existing={budgets}
        onSave={async (payload) => {
          if (editing) {
            await updateBudget(editing.id, payload);
            toast.success("Orçamento atualizado.");
          } else {
            await addBudget(payload);
            toast.success("Orçamento criado.");
          }
          setOpen(false);
          setEditing(null);
        }}
      />

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir orçamento?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (confirmDel) {
                  await deleteBudget(confirmDel.id);
                  toast.success("Orçamento excluído.");
                  setConfirmDel(null);
                }
              }}
            >
              Excluir
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
    if (!categoryId) return toast.error("Selecione uma categoria.");
    const n = Number(amount);
    if (!n || n <= 0) return toast.error("Informe um valor válido.");
    if (!editing) {
      const dup = existing.find((b) => b.categoryId === categoryId && b.period === period);
      if (dup) return toast.error("Já existe um orçamento para esta categoria e período.");
    }
    await onSave({ categoryId, amount: n, period });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar orçamento" : "Novo orçamento"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId} disabled={!!editing}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Limite (R$)</Label>
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
          </div>
          <div className="space-y-2">
            <Label>Período</Label>
            <Select value={period} onValueChange={(v) => setPeriod(v as "monthly" | "weekly")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Mensal</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
