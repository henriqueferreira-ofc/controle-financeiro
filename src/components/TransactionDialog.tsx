import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinwise } from "@/store/finwise-store";
import type { Transaction } from "@/store/types";
import { todayISO, brl } from "@/lib/format";
import { toast } from "sonner";
import { useI18n } from "@/i18n/I18nProvider";

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Transaction | null;
  mode: "create" | "edit";
}

export function TransactionDialog({ open, onOpenChange, initial, mode }: TransactionDialogProps) {
  const { categories, addTransaction, updateTransaction } = useFinwise();
  const { t } = useI18n();
  const [type, setType] = React.useState<"entrada" | "despesa">("despesa");
  const [date, setDate] = React.useState(todayISO());
  const [categoryId, setCategoryId] = React.useState<string>("");
  const [description, setDescription] = React.useState("");
  const [amount, setAmount] = React.useState<string>("");
  const [essential, setEssential] = React.useState(true);
  const [fixed, setFixed] = React.useState(false);
  const [paymentMethod, setPaymentMethod] = React.useState<string>("");
  const [tags, setTags] = React.useState<string>("");
  const [paid, setPaid] = React.useState(false);

  React.useEffect(() => {
    if (open && initial) {
      setType(initial.type);
      setDate(initial.date);
      setCategoryId(initial.categoryId || "");
      setDescription(initial.description);
      setAmount(String(initial.amount));
      setEssential(initial.essential);
      setFixed(initial.fixed);
      setPaymentMethod(initial.paymentMethod || "");
      setTags(initial.tags?.join(", ") || "");
      setPaid(initial.paid);
    } else if (open) {
      setType("despesa");
      setDate(todayISO());
      setCategoryId("");
      setDescription("");
      setAmount("");
      setEssential(true);
      setFixed(false);
      setPaymentMethod("");
      setTags("");
      setPaid(false);
    }
  }, [open, initial]);

  const availableCategories = categories.filter((c) => c.kind === type);
  const numericAmount = Number(amount.replace(",", "."));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: string[] = [];
    if (!description.trim()) errors.push(t("tx.errDescription"));
    if (!date) errors.push(t("tx.errDate"));
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) errors.push(t("tx.errAmount"));
    if (type === "despesa" && !categoryId) errors.push(t("tx.errCategory"));
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
      essential,
      fixed,
      paymentMethod: paymentMethod || undefined,
      tags: tags.split(",").map(tg => tg.trim()).filter(Boolean),
      paid,
    };

    try {
      if (mode === "edit" && initial) {
        await updateTransaction(initial.id, payload);
        toast.success(t("tx.updated"));
      } else {
        await addTransaction(payload);
        toast.success(t("tx.created"));
      }
      onOpenChange(false);
    } catch {
      // toast already shown by store
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-[480px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? t("tx.edit") : t("tx.new")}</DialogTitle>
          <DialogDescription>
            {mode === "edit" ? t("tx.subtitleEdit") : t("tx.subtitle")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>{t("tx.type")}</Label>
              <Select value={type} onValueChange={(v) => { setType(v as "entrada" | "despesa"); setCategoryId(""); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="despesa">{t("tx.expense")}</SelectItem>
                  <SelectItem value="entrada">{t("tx.income")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">{t("tx.date")}</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>{t("tx.category")} {type === "despesa" && <span className="text-destructive">*</span>}</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder={type === "entrada" ? t("tx.categoryOptional") : t("tx.categorySelect")} />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="desc">{t("tx.description")}</Label>
            <Input id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("tx.descriptionPh")} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="amount">{t("tx.amount")}</Label>
            <Input
              id="amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
              placeholder="0,00"
            />
            {numericAmount > 0 && (
              <span className="text-xs text-muted-foreground">{t("tx.preview", { v: brl(numericAmount) })}</span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-lg border border-border/60 bg-muted/30 p-3 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <Label htmlFor="essential" className="cursor-pointer">{t("tx.essential")}</Label>
                <p className="text-xs text-muted-foreground">{t("tx.essentialHint")}</p>
              </div>
              <Switch id="essential" checked={essential} onCheckedChange={setEssential} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <Label htmlFor="fixed" className="cursor-pointer">{t("tx.fixed")}</Label>
                <p className="text-xs text-muted-foreground">{t("tx.fixedHint")}</p>
              </div>
              <Switch id="fixed" checked={fixed} onCheckedChange={setFixed} />
            </div>
          </div>

          {type === "despesa" && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-success/30 bg-success/10 p-3">
              <div>
                <Label htmlFor="paid" className="cursor-pointer text-success font-semibold">{t("common.paid")}</Label>
                <p className="text-xs text-success/80">{t("tx.paidHint") || "Marque se esta transação já foi liquidada"}</p>
              </div>
              <Switch id="paid" checked={paid} onCheckedChange={setPaid} className="data-[state=checked]:bg-success" />
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>{t("tx.payment")}</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder={t("tx.categorySelect")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="money">{t("pay.money")}</SelectItem>
                  <SelectItem value="pix">{t("pay.pix")}</SelectItem>
                  <SelectItem value="credit_card">{t("pay.credit_card")}</SelectItem>
                  <SelectItem value="debit_card">{t("pay.debit_card")}</SelectItem>
                  <SelectItem value="transfer">{t("pay.transfer")}</SelectItem>
                  <SelectItem value="other">{t("pay.other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tags">{t("tx.tags")}</Label>
              <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder={t("tx.tagsPh")} />
            </div>
          </div>

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              {t("common.cancel")}
            </Button>
            <Button type="submit" className="w-full sm:w-auto">{mode === "edit" ? t("common.save") : t("common.add")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
