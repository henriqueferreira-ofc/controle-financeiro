import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { SEED_TRANSACTIONS } from "./seed";
import type { Transaction, Filters, Category } from "./types";
import { toast } from "sonner";

type DBTransaction = {
  id: string;
  user_id: string;
  type: "entrada" | "despesa";
  date: string;
  description: string;
  category: string | null;
  amount: number;
  payment_method: string | null;
  tags: string[];
  recurring: boolean;
  essential: boolean;
  fixed: boolean;
  created_at: string;
};

type DBCategory = {
  id: string;
  user_id: string | null;
  name: string;
  kind: "entrada" | "despesa";
  icon: string;
  color: string;
  is_global: boolean;
  created_at: string;
  updated_at: string;
};

const toClientTx = (r: DBTransaction): Transaction => ({
  id: r.id,
  type: r.type,
  date: r.date,
  description: r.description,
  categoryId: r.category || undefined,
  amount: Number(r.amount),
  essential: r.essential,
  fixed: r.fixed,
});

const toClientCat = (r: DBCategory): Category => ({
  id: r.id,
  name: r.name,
  kind: r.kind,
  icon: r.icon,
  color: r.color,
  isGlobal: r.is_global,
  userId: r.user_id,
});

type Ctx = {
  transactions: Transaction[];
  categories: Category[];
  loading: boolean;
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  addTransaction: (t: Omit<Transaction, "id">) => Promise<void>;
  updateTransaction: (id: string, patch: Partial<Omit<Transaction, "id">>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addCategory: (c: Omit<Category, "id" | "isGlobal" | "userId">) => Promise<void>;
  updateCategory: (id: string, patch: Partial<Omit<Category, "id" | "isGlobal" | "userId">>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  reseed: () => Promise<void>;
  exportJSON: () => void;
  importJSON: (file: File) => Promise<void>;
  refresh: () => Promise<void>;
};

const FinwiseContext = React.createContext<Ctx | null>(null);

export function FinwiseProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filters, setFilters] = React.useState<Filters>({
    period: "30d",
    categoryId: "all",
    search: "",
    type: "all",
  });

  const refresh = React.useCallback(async () => {
    if (!user) {
      setTransactions([]);
      setCategories([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [txRes, catRes] = await Promise.all([
      supabase.from("transactions").select("*").order("date", { ascending: false }),
      supabase.from("categories").select("*").order("name", { ascending: true }),
    ]);
    if (txRes.error) {
      toast.error("Erro ao carregar registros: " + txRes.error.message);
      setTransactions([]);
    } else {
      setTransactions((txRes.data as unknown as DBTransaction[]).map(toClientTx));
    }
    if (catRes.error) {
      toast.error("Erro ao carregar categorias: " + catRes.error.message);
      setCategories([]);
    } else {
      setCategories((catRes.data as unknown as DBCategory[]).map(toClientCat));
    }
    setLoading(false);
  }, [user]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const addTransaction = React.useCallback(
    async (t: Omit<Transaction, "id">) => {
      if (!user) return;
      const { data, error } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          type: t.type,
          date: t.date,
          description: t.description,
          category: t.categoryId ?? null,
          amount: t.amount,
          essential: t.essential,
          fixed: t.fixed,
        })
        .select()
        .single();
      if (error) {
        toast.error("Erro ao criar registro: " + error.message);
        throw error;
      }
      setTransactions((prev) => [toClientTx(data as unknown as DBTransaction), ...prev]);
    },
    [user],
  );

  const updateTransaction = React.useCallback(
    async (id: string, patch: Partial<Omit<Transaction, "id">>) => {
      const dbPatch: Record<string, unknown> = {};
      if (patch.type !== undefined) dbPatch.type = patch.type;
      if (patch.date !== undefined) dbPatch.date = patch.date;
      if (patch.description !== undefined) dbPatch.description = patch.description;
      if (patch.categoryId !== undefined) dbPatch.category = patch.categoryId ?? null;
      if (patch.amount !== undefined) dbPatch.amount = patch.amount;
      if (patch.essential !== undefined) dbPatch.essential = patch.essential;
      if (patch.fixed !== undefined) dbPatch.fixed = patch.fixed;

      const { data, error } = await supabase
        .from("transactions")
        .update(dbPatch)
        .eq("id", id)
        .select()
        .single();
      if (error) {
        toast.error("Erro ao atualizar: " + error.message);
        throw error;
      }
      const updated = toClientTx(data as unknown as DBTransaction);
      setTransactions((prev) => prev.map((t) => (t.id === id ? updated : t)));
    },
    [],
  );

  const deleteTransaction = React.useCallback(async (id: string) => {
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
      throw error;
    }
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addCategory = React.useCallback(
    async (c: Omit<Category, "id" | "isGlobal" | "userId">) => {
      if (!user) return;
      const { data, error } = await supabase
        .from("categories")
        .insert({
          user_id: user.id,
          name: c.name,
          kind: c.kind,
          icon: c.icon,
          color: c.color,
          is_global: false,
        })
        .select()
        .single();
      if (error) {
        toast.error("Erro ao criar categoria: " + error.message);
        throw error;
      }
      setCategories((prev) => [...prev, toClientCat(data as unknown as DBCategory)].sort((a, b) => a.name.localeCompare(b.name)));
    },
    [user],
  );

  const updateCategory = React.useCallback(
    async (id: string, patch: Partial<Omit<Category, "id" | "isGlobal" | "userId">>) => {
      const dbPatch: Record<string, unknown> = {};
      if (patch.name !== undefined) dbPatch.name = patch.name;
      if (patch.kind !== undefined) dbPatch.kind = patch.kind;
      if (patch.icon !== undefined) dbPatch.icon = patch.icon;
      if (patch.color !== undefined) dbPatch.color = patch.color;

      const { data, error } = await supabase
        .from("categories")
        .update(dbPatch)
        .eq("id", id)
        .select()
        .single();
      if (error) {
        toast.error("Erro ao atualizar categoria: " + error.message);
        throw error;
      }
      const updated = toClientCat(data as unknown as DBCategory);
      setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)).sort((a, b) => a.name.localeCompare(b.name)));
    },
    [],
  );

  const deleteCategory = React.useCallback(async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir categoria: " + error.message);
      throw error;
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const reseed = React.useCallback(async () => {
    if (!user) return;
    // Resolve category names against current categories list
    const byNameKind = new Map<string, string>();
    for (const c of categories) byNameKind.set(`${c.kind}:${c.name.toLowerCase()}`, c.id);

    const rows = SEED_TRANSACTIONS.map((t) => ({
      user_id: user.id,
      type: t.type,
      date: t.date,
      description: t.description,
      category: t.categoryName ? byNameKind.get(`${t.type}:${t.categoryName.toLowerCase()}`) ?? null : null,
      amount: t.amount,
      essential: t.essential,
      fixed: t.fixed,
    }));
    const { error } = await supabase.from("transactions").insert(rows);
    if (error) {
      toast.error("Erro ao popular dados: " + error.message);
      throw error;
    }
    await refresh();
  }, [user, categories, refresh]);

  const exportJSON = React.useCallback(() => {
    const payload = { exported_at: new Date().toISOString(), transactions };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finwise-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [transactions]);

  const importJSON = React.useCallback(
    async (file: File) => {
      if (!user) return;
      const text = await file.text();
      const parsed = JSON.parse(text);
      const rawList: Array<Partial<Transaction>> = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.transactions)
          ? parsed.transactions
          : [];
      if (rawList.length === 0) {
        toast.error("Arquivo JSON sem transações válidas.");
        return;
      }
      const rows = rawList
        .filter((t) => t.type && t.date && t.description && typeof t.amount === "number" && t.amount > 0)
        .map((t) => ({
          user_id: user.id,
          type: t.type as "entrada" | "despesa",
          date: t.date as string,
          description: t.description as string,
          category: t.categoryId ?? null,
          amount: t.amount as number,
          essential: t.essential ?? true,
          fixed: t.fixed ?? false,
        }));
      if (rows.length === 0) {
        toast.error("Nenhum registro válido no arquivo.");
        return;
      }
      const { error } = await supabase.from("transactions").insert(rows);
      if (error) {
        toast.error("Erro ao importar: " + error.message);
        return;
      }
      toast.success(`${rows.length} registro(s) importado(s).`);
      await refresh();
    },
    [user, refresh],
  );

  const value: Ctx = {
    transactions,
    categories,
    loading,
    filters,
    setFilters,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addCategory,
    updateCategory,
    deleteCategory,
    reseed,
    exportJSON,
    importJSON,
    refresh,
  };

  return <FinwiseContext.Provider value={value}>{children}</FinwiseContext.Provider>;
}

export function useFinwise() {
  const ctx = React.useContext(FinwiseContext);
  if (!ctx) throw new Error("useFinwise must be used within FinwiseProvider");
  return ctx;
}
