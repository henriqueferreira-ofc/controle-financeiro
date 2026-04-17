import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
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

export const Route = createFileRoute("/_app/categorias")({
  head: () => ({
    meta: [
      { title: "Categorias — FinWise" },
      { name: "description", content: "Gerencie suas categorias personalizadas com cores e ícones." },
    ],
  }),
  component: CategoriesPage,
});

const PALETTE = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#10b981", "#14b8a6",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#a855f7", "#ec4899", "#64748b",
];

function CategoriesPage() {
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
      toast.success("Categoria excluída.");
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
            <h1 className="text-3xl font-semibold tracking-tight">Categorias</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Use as categorias padrão ou crie as suas, com cor própria.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="shrink-0">
            <Plus className="mr-1 h-4 w-4" /> Nova categoria
          </Button>
        </div>

        <Section
          title="Suas categorias personalizadas"
          subtitle={customs.length === 0 ? "Você ainda não criou categorias personalizadas." : undefined}
        >
          <CategoryGrid
            items={customs}
            onEdit={setEditing}
            onDelete={setConfirmDelete}
          />
        </Section>

        <Section title="Categorias padrão" subtitle="Disponíveis para todos os usuários e não podem ser editadas.">
          <CategoryGrid items={globais} readonly />
        </Section>
      </div>

      <CategoryDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        onSubmit={async (payload) => {
          await addCategory(payload);
          toast.success("Categoria criada.");
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
          toast.success("Categoria atualizada.");
        }}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Os registros vinculados a "{confirmDelete?.name}" ficarão sem categoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
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
                <TooltipContent>Categoria padrão</TooltipContent>
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
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"entrada" | "despesa">("despesa");
  const [color, setColor] = useState(PALETTE[0]);

  useResetOnOpen(open, () => {
    if (initial) {
      setName(initial.name);
      setKind(initial.kind);
      setColor(initial.color);
    } else {
      setName("");
      setKind("despesa");
      setColor(PALETTE[0]);
    }
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nome é obrigatório.");
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
          <DialogTitle>{mode === "edit" ? "Editar categoria" : "Nova categoria"}</DialogTitle>
          <DialogDescription>Dê um nome, tipo e uma cor para sua categoria.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="cat-name">Nome</Label>
            <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Pets" />
          </div>
          <div className="grid gap-2">
            <Label>Tipo</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as "entrada" | "despesa")}>
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
            <Label>Cor</Label>
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
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">{mode === "edit" ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function useResetOnOpen(open: boolean, fn: () => void) {
  const ref = useRef(false);
  useEffect(() => {
    if (open && !ref.current) {
      ref.current = true;
      fn();
    } else if (!open) {
      ref.current = false;
    }
  }, [open, fn]);
}
