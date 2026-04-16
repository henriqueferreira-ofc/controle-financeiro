import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinwise } from "@/store/finwise-store";
import type { Transaction } from "@/store/types";
import { todayISO, brl } from "@/lib/format";
import { toast } from "sonner";

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Transaction | null;
  mode: "create" | "edit";
}

export function TransactionDialog({ open, onOpenChange, initial, mode }: TransactionDialogProps) {
  const { state, addTransaction, updateTransaction } = useFinwise();
  const [type, setType] = React.useState<"entrada" | "despesa">("despesa");
  const [date, setDate] = React.useState(todayISO());
  const [categoryId, setCategoryId] = React.useState<string>("");
  const [description, setDescription] = React.useState("");
  const [amount, setAmount] = React.useState<string>("");

  React.useEffect(() => {
    if (open && initial) {
      setType(initial.type);
      setDate(initial.date);
      setCategoryId(initial.categoryId || "");
      setDescription(initial.description);
      setAmount(String(initial.amount));
    } else if (open) {
      setType("despesa");
      setDate(todayISO());
      setCategoryId("");
      setDescription("");
      setAmount("");
    }
  }, [open, initial]);

  const availableCategories = state.categories.filter((c) => c.kind === type);
  const numericAmount = Number(amount.replace(",", "."));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: string[] = [];
    if (!description.trim()) errors.push("Descrição é obrigatória.");
    if (!date) errors.push("Data é obrigatória.");
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) errors.push("Valor deve ser maior que zero.");
    if (type === "despesa" && !categoryId) errors.push("Categoria é obrigatória para despesas.");
    if (errors.length > 0) {
      toast.error(errors.join(" "));
      return;
    }

    const payload = {
      type,
      date,
      description: description.trim(),
      categoryId: categoryId || undefined,
      amount: numericAmount,
    };

    if (mode === "edit" && initial) {
      updateTransaction(initial.id, payload);
      toast.success("Registro atualizado com sucesso.");
    } else {
      addTransaction(payload);
      toast.success("Registro criado com sucesso.");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Editar registro" : "Novo registro"}</DialogTitle>
          <DialogDescription>
            Preencha os campos para {mode === "edit" ? "atualizar" : "registrar"} sua movimentação.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => { setType(v as "entrada" | "despesa"); setCategoryId(""); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="despesa">Despesa</SelectItem>
                  <SelectItem value="entrada">Entrada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Data</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Categoria {type === "despesa" && <span className="text-destructive">*</span>}</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder={type === "entrada" ? "Opcional" : "Selecione"} />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="desc">Descrição</Label>
            <Input id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Mercado da semana" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="amount">Valor</Label>
            <Input
              id="amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
              placeholder="0,00"
            />
            {numericAmount > 0 && (
              <span className="text-xs text-muted-foreground">Preview: {brl(numericAmount)}</span>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{mode === "edit" ? "Salvar alterações" : "Adicionar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
