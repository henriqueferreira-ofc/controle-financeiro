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
import { ArrowDownCircle, ArrowUpCircle, Calendar, Pencil, Play, Plus, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { brl, formatDateBR, todayISO } from "@/lib/format";
import { useI18n } from "@/i18n/I18nProvider";

export const Route = createFileRoute("/_app/recorrentes")({
  head: () => ({
    meta: [
      { title: "Recorrentes — AxisPay" },
      { name: "description", content: "Cadastre transações que se repetem automaticamente." },
    ],
  }),
  component: RecurringPage,
});

const FREQ_KEY: Record<RecurringFrequency, string> = {
  daily: "freq.daily",
  weekly: "freq.weekly",
  monthly: "freq.monthly",
  yearly: "freq.yearly",
};

function RecurringPage() {
  const { recurrings, categories, addRecurring, updateRecurring, deleteRecurring, applyRecurringNow } = useFinwise();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Recurring | null>(null);
  const [confirmDel, setConfirmDel] = useState<Recurring | null>(null);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 px-3 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">{t("recurring.title")}</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">{t("recurring.subtitle")}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Button variant="outline" size="sm" onClick={() => applyRecurringNow()} className="w-full sm:w-auto">
            <Play className="mr-1 h-4 w-4" /> <span className="truncate">{t("recurring.runPending")}</span>
          </Button>
          <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }} className="w-full sm:w-auto">
            <Plus className="mr-1 h-4 w-4" /> {t("common.new")}
          </Button>
        </div>
      </div>

      {recurrings.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Repeat className="mx-auto mb-3 h-10 w-10 opacity-50" />
            {t("recurring.empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {recurrings.map((r) => {
            const cat = categories.find((c) => c.id === r.categoryId);
            const isIncome = r.type === "entrada";
            return (
              <Card key={r.id} className="overflow-hidden">
                <CardContent className="p-3 sm:p-4">
                  {/* Top row: icon + description + amount */}
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isIncome ? "bg-green-500/15 text-green-600" : "bg-red-500/15 text-red-600"}`}>
                      {isIncome ? <ArrowUpCircle className="h-5 w-5" /> : <ArrowDownCircle className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate text-sm sm:text-base">{r.description}</p>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {t("recurring.next")}: {formatDateBR(r.nextRun)}
                          {r.endDate && ` · ${t("recurring.until")} ${formatDateBR(r.endDate)}`}
                        </span>
                      </div>
                    </div>
                    <p className={`shrink-0 text-right text-sm font-semibold tabular-nums sm:text-base ${isIncome ? "text-green-600" : "text-red-600"}`}>
                      {isIncome ? "+" : "-"}{brl(r.amount)}
                    </p>
                  </div>

                  {/* Badges */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] sm:text-xs">{t(FREQ_KEY[r.frequency])}</Badge>
                    {!r.active && <Badge variant="secondary" className="text-[10px] sm:text-xs">{t("recurring.paused")}</Badge>}
                    {cat && (
                      <Badge variant="outline" className="gap-1 text-[10px] sm:text-xs">
                        <span className="h-2 w-2 rounded-full" style={{ background: cat.color }} />
                        <span className="max-w-[120px] truncate">{cat.name}</span>
                      </Badge>
                    )}
                  </div>

                  {/* Actions row */}
                  <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Switch
                        checked={r.active}
                        onCheckedChange={async (v) => {
                          await updateRecurring(r.id, { active: v });
                        }}
                      />
                      <span>{t("recurring.active")}</span>
                    </label>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditing(r); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => setConfirmDel(r)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
            toast.success(t("recurring.updated"));
          } else {
            await addRecurring(payload);
            toast.success(t("recurring.created"));
          }
          setOpen(false);
          setEditing(null);
        }}
      />

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("recurring.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("recurring.deleteDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (confirmDel) {
                  await deleteRecurring(confirmDel.id);
                  toast.success(t("recurring.deleted"));
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
