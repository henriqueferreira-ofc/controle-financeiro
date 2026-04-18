import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useFinwise } from "@/store/finwise-store";
import type { Recurring, RecurringFrequency } from "@/store/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowDownCircle, ArrowUpCircle, Pencil, Play, Plus, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { brl, formatDateBR, todayISO } from "@/lib/format";

export const Route = createFileRoute("/_app/recorrentes")({
  head: () => ({
    meta: [
      { title: "Recorrentes — FinWise" },
      { name: "description", content: "Cadastre transações que se repetem automaticamente." },
    ],
  }),
  component: RecurringPage,
});

const FREQ_LABEL: Record<RecurringFrequency, string> = {
  daily: "Diária",
  weekly: "Semanal",
  monthly: "Mensal",
  yearly: "Anual",
};

function RecurringPage() {
  const { recurrings, categories, addRecurring, updateRecurring, deleteRecurring, applyRecurringNow } = useFinwise();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Recurring | null>(null);
  const [confirmDel, setConfirmDel] = useState<Recurring | null>(null);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transações recorrentes</h1>
          <p className="text-sm text-muted-foreground">Aplicadas automaticamente nas datas configuradas.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => applyRecurringNow()}>
            <Play className="mr-1 h-4 w-4" /> Executar pendentes
          </Button>
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="mr-1 h-4 w-4" /> Nova
          </Button>
        </div>
      </div>

      {recurrings.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Repeat className="mx-auto mb-3 h-10 w-10 opacity-50" />
            Nenhuma recorrência cadastrada.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {recurrings.map((r) => {
            const cat = categories.find((c) => c.id === r.categoryId);
            return (
              <Card key={r.id}>
                <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${r.type === "entrada" ? "bg-green-500/15 text-green-600" : "bg-red-500/15 text-red-600"}`}>
                    {r.type === "entrada" ? <ArrowUpCircle className="h-5 w-5" /> : <ArrowDownCircle className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{r.description}</p>
                      <Badge variant="outline">{FREQ_LABEL[r.frequency]}</Badge>
                      {!r.active && <Badge variant="secondary">Pausada</Badge>}
                      {cat && (
                        <Badge variant="outline" className="gap-1">
                          <span className="h-2 w-2 rounded-full" style={{ background: cat.color }} />
                          {cat.name}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Próxima: {formatDateBR(r.nextRun)}
                      {r.endDate && ` · até ${formatDateBR(r.endDate)}`}
                    </p>
                  </div>
                  <p className={`font-semibold ${r.type === "entrada" ? "text-green-600" : "text-red-600"}`}>
                    {r.type === "entrada" ? "+" : "-"}{brl(r.amount)}
                  </p>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={r.active}
                      onCheckedChange={async (v) => {
                        await updateRecurring(r.id, { active: v });
                      }}
                    />
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setConfirmDel(r)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <RecurringDialog
        open={open}
        editing={editing}
        categories={categories}
        onClose={() => { setOpen(false); setEditing(null); }}
        onSave={async (payload) => {
          if (editing) {
            await updateRecurring(editing.id, payload);
            toast.success("Recorrência atualizada.");
          } else {
            await addRecurring(payload);
            toast.success("Recorrência criada.");
          }
          setOpen(false);
          setEditing(null);
        }}
      />

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir recorrência?</AlertDialogTitle>
            <AlertDialogDescription>Transações já criadas serão preservadas.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (confirmDel) {
                  await deleteRecurring(confirmDel.id);
                  toast.success("Recorrência excluída.");
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

function RecurringDialog({
  open, editing, categories, onClose, onSave,
}: {
  open: boolean;
  editing: Recurring | null;
  categories: { id: string; name: string; kind: "entrada" | "despesa" }[];
  onClose: () => void;
  onSave: (r: Omit<Recurring, "id" | "nextRun"> & { nextRun?: string }) => Promise<void>;
}) {
  const [type, setType] = useState<"entrada" | "despesa">("despesa");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [frequency, setFrequency] = useState<RecurringFrequency>("monthly");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState("");
  const [essential, setEssential] = useState(true);
  const [fixed, setFixed] = useState(true);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (open) {
      setType(editing?.type || "despesa");
      setDescription(editing?.description || "");
      setAmount(editing?.amount?.toString() || "");
      setCategoryId(editing?.categoryId || "");
      setFrequency(editing?.frequency || "monthly");
      setStartDate(editing?.startDate || todayISO());
      setEndDate(editing?.endDate || "");
      setEssential(editing?.essential ?? true);
      setFixed(editing?.fixed ?? true);
      setActive(editing?.active ?? true);
    }
  }, [open, editing]);

  const filteredCats = categories.filter((c) => c.kind === type);

  const submit = async () => {
    if (!description.trim()) return toast.error("Informe a descrição.");
    const n = Number(amount);
    if (!n || n <= 0) return toast.error("Valor inválido.");
    if (!startDate) return toast.error("Data inicial obrigatória.");
    await onSave({
      type,
      description: description.trim(),
      amount: n,
      categoryId: categoryId || null,
      frequency,
      startDate,
      endDate: endDate || null,
      essential,
      fixed,
      active,
      nextRun: editing?.nextRun || startDate,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar recorrência" : "Nova recorrência"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as "entrada" | "despesa")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="despesa">Despesa</SelectItem>
                  <SelectItem value="entrada">Entrada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Frequência</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as RecurringFrequency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diária</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Aluguel" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Valor</Label>
              <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={categoryId || "none"} onValueChange={(v) => setCategoryId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Sem categoria" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {filteredCats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Início</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fim (opcional)</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 pt-2">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={essential} onCheckedChange={setEssential} /> Essencial
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={fixed} onCheckedChange={setFixed} /> Fixa
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={active} onCheckedChange={setActive} /> Ativa
            </label>
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
