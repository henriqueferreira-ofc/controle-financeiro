import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useFinwise } from "@/store/finwise-store";
import type { Category } from "@/store/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/I18nProvider";

export const Route = createFileRoute("/_app/categorias")({
  head: () => ({
    meta: [
      { title: "AxisPay" },
      { name: "description", content: "Gerencie suas categorias de receitas e despesas." },
    ],
  }),
  component: CategoriesPage,
});

const PALETTE = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#10b981", "#14b8a6",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#a855f7", "#ec4899", "#64748b",
];

function CategoriesPage() {
  const { t } = useI18n();
  const { categories, addCategory, updateCategory, deleteCategory } = useFinwise();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Category | null>(null);

  const globais = categories.filter((c) => c.isGlobal);
  const customs = categories.filter((c) => !c.isGlobal);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteCategory(confirmDelete.id);
      toast.success(t("cat.deleted"));
    } catch {
      // already toasted
    }
    setConfirmDelete(null);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 md:px-8 md:py-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{t("cat.title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("cat.subtitle")}
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="shrink-0">
            <Plus className="mr-1 h-4 w-4" /> {t("cat.new")}
          </Button>
        </div>

        <Section
          title={t("cat.yours")}
          subtitle={customs.length === 0 ? t("cat.yours.empty") : undefined}
        >
          <CategoryGrid items={customs} onEdit={setEditing} onDelete={setConfirmDelete} />
        </Section>

        <Section title={t("cat.global")} subtitle={t("cat.global.subtitle")}>
          <CategoryGrid items={globais} readonly />
        </Section>
      </div>

      <CategoryDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        onSubmit={async (payload) => {
          await addCategory(payload);
          toast.success(t("cat.newTitle") + " OK"); // Simple success toast
        }}
      />

      <CategoryDialog
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        mode="edit"
        initial={editing}
        onSubmit={async (payload) => {
          if (!editing) return;
          await updateCategory(editing.id, payload);
          toast.success(t("cat.editTitle") + " OK");
        }}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("cat.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("cat.deleteDesc", { name: confirmDelete?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div>
      <div className="mb-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function CategoryGrid({
  items,
  readonly,
  onEdit,
  onDelete,
}: {
  items: Category[];
  readonly?: boolean;
  onEdit?: (c: Category) => void;
  onDelete?: (c: Category) => void;
}) {
  const { t } = useI18n();
  if (items.length === 0) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((c) => (
        <Card key={c.id} className="border-border/60 shadow-[var(--shadow-card)]">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: c.color + "33", color: c.color }}
              >
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">{c.name}</p>
                <Badge variant="outline" className="mt-1 text-[10px] uppercase">
                  {c.kind}
                </Badge>
              </div>
            </div>
            {readonly ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-muted-foreground">
                    <Lock className="h-4 w-4" />
                  </span>
                </TooltipTrigger>
                  <TooltipContent>{t("cat.default")}</TooltipContent>
              </Tooltip>
            ) : (
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => onEdit?.(c)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => onDelete?.(c)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CategoryDialog({
  open,
  onOpenChange,
  mode,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  initial?: Category | null;
  onSubmit: (payload: { name: string; kind: "entrada" | "despesa"; icon: string; color: string }) => Promise<void>;
}) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"entrada" | "despesa">("despesa");
  const [color, setColor] = useState(PALETTE[0]);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setName(initial.name);
      setKind(initial.kind);
      setColor(initial.color);
    } else {
      setName("");
      setKind("despesa");
      setColor(PALETTE[0]);
    }
  }, [open, initial]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t("cat.errName"));
      return;
    }
    try {
      await onSubmit({ name: name.trim(), kind, icon: "circle", color });
      onOpenChange(false);
    } catch {
      // already toasted
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? t("cat.editTitle") : t("cat.newTitle")}</DialogTitle>
          <DialogDescription>{t("cat.dialogDesc")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="cat-name">{t("cat.name")}</Label>
            <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("cat.namePh")} />
          </div>
          <div className="grid gap-2">
            <Label>{t("cat.type")}</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as "entrada" | "despesa")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="despesa">{t("rec.type.expense")}</SelectItem>
                <SelectItem value="entrada">{t("rec.type.income")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>{t("cat.color")}</Label>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full border-2 transition-transform ${color === c ? "scale-110 border-foreground" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
            <Button type="submit">{mode === "edit" ? t("common.save") : t("common.add")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
