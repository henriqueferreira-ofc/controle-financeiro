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
import { ArrowDownRight, ArrowUpRight, Eye, Pencil, Plus, Search, Trash2, Inbox, Download } from "lucide-react";
import { exportToCSV } from "@/lib/export";
import { toast } from "sonner";
import * as React from "react";
import { useI18n } from "@/i18n/I18nProvider";

export const Route = createFileRoute("/_app/registros")({
  head: () => ({
    meta: [
      { title: "AxisPay" },
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
          if (filters.tag !== "all" && !t.tags?.includes(filters.tag!)) return false;
          if (filters.paymentMethod !== "all" && t.paymentMethod !== filters.paymentMethod) return false;
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
      <div className="mx-auto w-full max-w-7xl space-y-4 px-3 py-4 sm:space-y-6 sm:px-4 sm:py-6 md:px-8 md:py-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Meus Registros</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gerencie todas as suas entradas e despesas.
              <span className="hidden sm:inline">
                {" "}
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs">/</kbd> para buscar,{" "}
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs">n</kbd> para novo.
              </span>
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
            <Button 
              variant="outline" 
              onClick={() => exportToCSV(filtered, categories)} 
              disabled={filtered.length === 0}
              className="w-full sm:w-auto"
            >
              <Download className="mr-1 h-4 w-4" /> Exportar
            </Button>
            <Button onClick={() => setCreateOpen(true)} className="w-full shrink-0 md:w-auto">
              <Plus className="mr-1 h-4 w-4" /> Novo Registro
            </Button>
          </div>
        </div>

        <Card className="border-border/60 shadow-[var(--shadow-card)]">
          <CardContent className="p-3 sm:p-4">
            <div className="grid gap-2 sm:gap-3 md:grid-cols-[1fr_auto_auto]">
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
              <div className="flex flex-wrap gap-2 sm:gap-3">
              <Select value={filters.type} onValueChange={(v) => setFilters((f) => ({ ...f, type: v as typeof f.type }))}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="entrada">Apenas Entradas</SelectItem>
                  <SelectItem value="despesa">Apenas Despesas</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.categoryId} onValueChange={(v) => setFilters((f) => ({ ...f, categoryId: v }))}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filters.tag} onValueChange={(v) => setFilters((f) => ({ ...f, tag: v }))}>
                <SelectTrigger className="w-full md:w-[150px]">
                  <SelectValue placeholder="Tags" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Tags</SelectItem>
                  {Array.from(new Set(transactions.flatMap(t => t.tags || []))).map(tag => (
                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filters.paymentMethod} onValueChange={(v) => setFilters((f) => ({ ...f, paymentMethod: v }))}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Métodos</SelectItem>
                  <SelectItem value="money">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                  <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                  <SelectItem value="transfer">Transferência</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-9 px-2 text-muted-foreground"
                onClick={() => setFilters({ search: "", type: "all", categoryId: "all", tag: "all", paymentMethod: "all", period: "all" })}
              >
                Limpar
              </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-[var(--shadow-card)]">
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center sm:py-16">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Inbox className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-medium">Nenhum registro encontrado</p>
                  <p className="text-sm text-muted-foreground">
                    {transactions.length === 0
                      ? "Comece adicionando sua primeira movimentação."
                      : "Ajuste os filtros para visualizar mais resultados."}
                  </p>
                </div>
                {transactions.length === 0 && (
                  <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="mr-1 h-4 w-4" /> Adicionar primeiro registro
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* MOBILE: card list */}
                <ul className="divide-y divide-border/60 md:hidden">
                  {paginated.map((t) => (
                    <li key={t.id} className="flex items-start gap-3 px-3 py-3 sm:px-4">
                      <div
                        className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                          t.type === "entrada"
                            ? "bg-success/15 text-success"
                            : "bg-destructive/15 text-destructive"
                        }`}
                      >
                        {t.type === "entrada" ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-medium">{t.description}</p>
                          <span
                            className={`shrink-0 text-sm font-semibold tabular-nums ${
                              t.type === "entrada" ? "text-success" : "text-foreground"
                            }`}
                          >
                            {t.type === "despesa" ? "-" : "+"} {brl(t.amount)}
                          </span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          <span>{formatDateBR(t.date)}</span>
                          <span aria-hidden>•</span>
                          <span className="truncate">{getCategoryName(t.categoryId)}</span>
                        </div>
                        <div className="mt-2 flex gap-1">
                          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setViewing(t)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setEditing(t)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2"
                            onClick={() => setConfirmDelete(t)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* DESKTOP / TABLET: table */}
                <div className="hidden overflow-x-auto md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="hidden lg:table-cell">Categoria</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="hidden xl:table-cell">Tags</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="w-[140px] text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginated.map((t) => (
                        <TransactionRow
                          key={t.id}
                          t={t}
                          getCategoryName={getCategoryName}
                          brl={brl}
                          formatDateBR={formatDateBR}
                          onView={setViewing}
                          onEdit={setEditing}
                          onDelete={setConfirmDelete}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {filtered.length > 50 && (
                  <div className="flex items-center justify-between border-t border-border/60 px-3 py-3 text-sm sm:px-4">
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

        {/* Mobile floating action button */}
        <Button
          onClick={() => setCreateOpen(true)}
          size="icon"
          aria-label="Novo registro"
          className="fixed bottom-5 right-5 z-40 h-14 w-14 rounded-full shadow-lg md:hidden"
        >
          <Plus className="h-6 w-6" />
        </Button>
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

// Fase 4.1 — Memoized Row for Performance
interface RowProps {
  t: Transaction;
  getCategoryName: (id?: string) => string;
  brl: (v: number) => string;
  formatDateBR: (d: string) => string;
  onView: (t: Transaction) => void;
  onEdit: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
}

const TransactionRow = React.memo(({ t, getCategoryName, brl, formatDateBR, onView, onEdit, onDelete }: RowProps) => {
  return (
    <TableRow className="group transition-colors hover:bg-muted/30">
      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
        {formatDateBR(t.date)}
      </TableCell>
      <TableCell className="font-medium">{t.description}</TableCell>
      <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
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
      <TableCell className="hidden xl:table-cell">
        <div className="flex flex-wrap gap-1">
          {t.tags?.map(tag => (
            <Badge key={tag} variant="outline" className="text-[10px] font-normal py-0 px-1 text-muted-foreground border-muted-foreground/30">
              {tag}
            </Badge>
          ))}
        </div>
      </TableCell>
      <TableCell className={`text-right font-semibold tabular-nums ${t.type === "entrada" ? "text-success" : "text-foreground"}`}>
        {t.type === "despesa" ? "-" : "+"} {brl(t.amount)}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onView(t)}>
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ver detalhes</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(t)}>
                <Pencil className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Editar</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => onDelete(t)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Excluir</TooltipContent>
          </Tooltip>
        </div>
      </TableCell>
    </TableRow>
  );
});
