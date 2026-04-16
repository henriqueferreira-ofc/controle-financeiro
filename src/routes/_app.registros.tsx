import { createFileRoute } from "@tanstack/react-router";
import { useFinwise } from "@/store/finwise-store";
import { useMemo, useState, useEffect } from "react";
import type { Transaction } from "@/store/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TransactionDialog } from "@/components/TransactionDialog";
import { brl, formatDateBR } from "@/lib/format";
import { ArrowDownRight, ArrowUpRight, Eye, Pencil, Plus, Search, Trash2, Inbox } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/registros")({
  head: () => ({
    meta: [
      { title: "Meus Registros — FinWise" },
      { name: "description", content: "Gestão completa de entradas e despesas." },
    ],
  }),
  component: RegistrosPage,
});

function RegistrosPage() {
  const { transactions, categories, filters, setFilters, deleteTransaction } = useFinwise();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [viewing, setViewing] = useState<Transaction | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Transaction | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => setPage(1), [filters.search, filters.type, filters.categoryId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isTyping = tag === "INPUT" || tag === "TEXTAREA";
      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        document.getElementById("search-input")?.focus();
      } else if (e.key === "n" && !isTyping) {
        setCreateOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const filtered = useMemo(() => {
    return transactions
      .filter((t) => {
        if (filters.type !== "all" && t.type !== filters.type) return false;
        if (filters.categoryId !== "all" && t.categoryId !== filters.categoryId) return false;
        if (filters.search.trim()) {
          const s = filters.search.toLowerCase();
          if (!t.description.toLowerCase().includes(s)) return false;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.length > 50 ? filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : filtered;

  const getCategoryName = (id?: string) => categories.find((c) => c.id === id)?.name || "—";

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteTransaction(confirmDelete.id);
      toast.success("Registro removido.");
    } catch {
      // toast already shown
    }
    setConfirmDelete(null);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Meus Registros</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gerencie todas as suas entradas e despesas. <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs">/</kbd> para buscar, <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs">n</kbd> para novo.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="shrink-0">
            <Plus className="mr-1 h-4 w-4" /> Novo Registro
          </Button>
        </div>

        <Card className="border-border/60 shadow-[var(--shadow-card)]">
          <CardContent className="p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search-input"
                  placeholder="Buscar por descrição..."
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                  className="pl-9"
                />
              </div>
              <Select value={filters.type} onValueChange={(v) => setFilters((f) => ({ ...f, type: v as typeof f.type }))}>
                <SelectTrigger className="md:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="entrada">Apenas Entradas</SelectItem>
                  <SelectItem value="despesa">Apenas Despesas</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.categoryId} onValueChange={(v) => setFilters((f) => ({ ...f, categoryId: v }))}>
                <SelectTrigger className="md:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {state.categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-[var(--shadow-card)]">
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Inbox className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-medium">Nenhum registro encontrado</p>
                  <p className="text-sm text-muted-foreground">
                    {state.transactions.length === 0
                      ? "Comece adicionando sua primeira movimentação."
                      : "Ajuste os filtros para visualizar mais resultados."}
                  </p>
                </div>
                {state.transactions.length === 0 && (
                  <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="mr-1 h-4 w-4" /> Adicionar primeiro registro
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="hidden md:table-cell">Categoria</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="w-[140px] text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginated.map((t) => (
                        <TableRow key={t.id} className="group">
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                            {formatDateBR(t.date)}
                          </TableCell>
                          <TableCell className="font-medium">{t.description}</TableCell>
                          <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                            {getCategoryName(t.categoryId)}
                          </TableCell>
                          <TableCell>
                            {t.type === "entrada" ? (
                              <Badge className="border-success/30 bg-success/15 text-success hover:bg-success/20">
                                <ArrowUpRight className="mr-1 h-3 w-3" /> Entrada
                              </Badge>
                            ) : (
                              <Badge className="border-destructive/30 bg-destructive/15 text-destructive hover:bg-destructive/20">
                                <ArrowDownRight className="mr-1 h-3 w-3" /> Despesa
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className={`text-right font-semibold tabular-nums ${t.type === "entrada" ? "text-success" : "text-foreground"}`}>
                            {t.type === "despesa" ? "-" : "+"} {brl(t.amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" onClick={() => setViewing(t)}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Ver detalhes</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" onClick={() => setEditing(t)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Editar</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" onClick={() => setConfirmDelete(t)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Excluir</TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {filtered.length > 50 && (
                  <div className="flex items-center justify-between border-t border-border/60 px-4 py-3 text-sm">
                    <span className="text-muted-foreground">
                      Página {page} de {totalPages}
                    </span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                        Anterior
                      </Button>
                      <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                        Próxima
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create */}
      <TransactionDialog open={createOpen} onOpenChange={setCreateOpen} mode="create" />

      {/* Edit */}
      <TransactionDialog
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        mode="edit"
        initial={editing}
      />

      {/* View */}
      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do registro</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="grid gap-3 py-2 text-sm">
              <Row label="Tipo" value={viewing.type === "entrada" ? "Entrada" : "Despesa"} />
              <Row label="Data" value={formatDateBR(viewing.date)} />
              <Row label="Descrição" value={viewing.description} />
              <Row label="Categoria" value={getCategoryName(viewing.categoryId)} />
              <Row
                label="Valor"
                value={brl(viewing.amount)}
                valueClass={viewing.type === "entrada" ? "text-success" : "text-foreground"}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O registro "{confirmDelete?.description}" será removido permanentemente.
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

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${valueClass || ""}`}>{value}</span>
    </div>
  );
}
