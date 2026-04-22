import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useFinwise } from "@/store/finwise-store";
import type { Goal } from "@/store/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CheckCircle2, Pencil, Plus, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { brl, formatDateBR } from "@/lib/format";

export const Route = createFileRoute("/_app/metas")({
  head: () => ({
    meta: [
      { title: "AxisPay" },
      { name: "description", content: "Crie metas financeiras e acompanhe o progresso até a data alvo." },
    ],
  }),
  component: GoalsPage,
});

const PALETTE = ["#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#eab308", "#06b6d4", "#ef4444"];

function GoalsPage() {
  const { goals, addGoal, updateGoal, deleteGoal } = useFinwise();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [confirmDel, setConfirmDel] = useState<Goal | null>(null);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Metas financeiras</h1>
          <p className="text-sm text-muted-foreground">Defina objetivos e acompanhe o progresso.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="shrink-0">
          <Plus className="mr-1 h-4 w-4" /> Nova meta
        </Button>
      </div>

      {goals.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Target className="mx-auto mb-3 h-10 w-10 opacity-50" />
            Nenhuma meta criada. Defina seu primeiro objetivo financeiro.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((g) => {
            const pct = Math.min(100, (g.currentAmount / g.targetAmount) * 100);
            const remaining = Math.max(0, g.targetAmount - g.currentAmount);
            const completed = g.completed || g.currentAmount >= g.targetAmount;
            const forecast = forecastEndDate(g);
            return (
              <Card key={g.id} className="relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-1" style={{ background: g.color }} />
                <CardContent className="p-5 space-y-3 pt-6">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${g.color}20`, color: g.color }}>
                        <Target className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{g.name}</p>
                        {g.targetDate && (
                          <p className="text-xs text-muted-foreground">Até {formatDateBR(g.targetDate)}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(g); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setConfirmDel(g)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{brl(g.currentAmount)}</span>
                      <span className="text-muted-foreground">{brl(g.targetAmount)}</span>
                    </div>
                    <Progress value={pct} />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{pct.toFixed(0)}% concluído</span>
                      <span>Faltam {brl(remaining)}</span>
                    </div>
                  </div>

                  {completed ? (
                    <Badge className="gap-1 bg-green-500/15 text-green-600 hover:bg-green-500/20">
                      <CheckCircle2 className="h-3 w-3" /> Meta atingida
                    </Badge>
                  ) : forecast ? (
                    <p className="text-xs text-muted-foreground">{forecast}</p>
                  ) : null}

                  {!completed && (
                    <AddProgress
                      onAdd={async (delta) => {
                        const newAmount = Math.max(0, g.currentAmount + delta);
                        await updateGoal(g.id, {
                          currentAmount: newAmount,
                          completed: newAmount >= g.targetAmount,
                        });
                        toast.success("Progresso atualizado.");
                      }}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <GoalDialog
        open={open}
        editing={editing}
        onClose={() => { setOpen(false); setEditing(null); }}
        onSave={async (payload) => {
          if (editing) {
            await updateGoal(editing.id, payload);
            toast.success("Meta atualizada.");
          } else {
            await addGoal(payload);
            toast.success("Meta criada.");
          }
          setOpen(false);
          setEditing(null);
        }}
      />

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir meta?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (confirmDel) {
                  await deleteGoal(confirmDel.id);
                  toast.success("Meta excluída.");
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

function forecastEndDate(g: Goal): string | null {
  if (!g.targetDate) return null;
  const target = new Date(g.targetDate + "T12:00:00");
  const today = new Date();
  const days = Math.max(1, Math.ceil((target.getTime() - today.getTime()) / 86400000));
  const remaining = g.targetAmount - g.currentAmount;
  if (remaining <= 0) return null;
  const monthly = (remaining / days) * 30;
  return `Para concluir no prazo, guarde ~${brl(monthly)}/mês.`;
}

function AddProgress({ onAdd }: { onAdd: (delta: number) => Promise<void> }) {
  const [val, setVal] = useState("");
  return (
    <div className="flex gap-2 pt-2 border-t">
      <Input
        type="number"
        step="0.01"
        placeholder="Adicionar valor"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="h-9"
      />
      <Button
        size="sm"
        onClick={async () => {
          const n = Number(val);
          if (!n || n <= 0) return toast.error("Valor inválido.");
          await onAdd(n);
          setVal("");
        }}
      >
        +
      </Button>
    </div>
  );
}

function GoalDialog({
  open, editing, onClose, onSave,
}: {
  open: boolean;
  editing: Goal | null;
  onClose: () => void;
  onSave: (g: Omit<Goal, "id" | "completed">) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [color, setColor] = useState(PALETTE[0]);

  useEffect(() => {
    if (open) {
      setName(editing?.name || "");
      setTargetAmount(editing?.targetAmount?.toString() || "");
      setCurrentAmount(editing?.currentAmount?.toString() || "0");
      setTargetDate(editing?.targetDate || "");
      setColor(editing?.color || PALETTE[0]);
    }
  }, [open, editing]);

  const submit = async () => {
    if (!name.trim()) return toast.error("Informe o nome.");
    const t = Number(targetAmount);
    const c = Number(currentAmount);
    if (!t || t <= 0) return toast.error("Valor alvo inválido.");
    await onSave({
      name: name.trim(),
      targetAmount: t,
      currentAmount: Math.max(0, c || 0),
      targetDate: targetDate || null,
      icon: "target",
      color,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar meta" : "Nova meta"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Reserva de emergência" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Valor alvo</Label>
              <Input type="number" step="0.01" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Já guardado</Label>
              <Input type="number" step="0.01" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Data alvo (opcional)</Label>
            <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full border-2 transition ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ background: c }}
                />
              ))}
            </div>
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
