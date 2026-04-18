import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { SEED_TRANSACTIONS } from "./seed";
import type { Transaction, Filters, Category, Budget, Goal, Recurring, RecurringFrequency } from "./types";
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

type DBBudget = {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  period: "monthly" | "weekly";
};

type DBGoal = {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  icon: string;
  color: string;
  completed: boolean;
};

type DBRecurring = {
  id: string;
  user_id: string;
  type: "entrada" | "despesa";
  description: string;
  amount: number;
  category: string | null;
  frequency: RecurringFrequency;
  start_date: string;
  end_date: string | null;
  next_run: string;
  essential: boolean;
  fixed: boolean;
  active: boolean;
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

const toClientBudget = (r: DBBudget): Budget => ({
  id: r.id,
  categoryId: r.category_id,
  amount: Number(r.amount),
  period: r.period,
});

const toClientGoal = (r: DBGoal): Goal => ({
  id: r.id,
  name: r.name,
  targetAmount: Number(r.target_amount),
  currentAmount: Number(r.current_amount),
  targetDate: r.target_date,
  icon: r.icon,
  color: r.color,
  completed: r.completed,
});

const toClientRecurring = (r: DBRecurring): Recurring => ({
  id: r.id,
  type: r.type,
  description: r.description,
  amount: Number(r.amount),
  categoryId: r.category,
  frequency: r.frequency,
  startDate: r.start_date,
  endDate: r.end_date,
  nextRun: r.next_run,
  essential: r.essential,
  fixed: r.fixed,
  active: r.active,
});

type Ctx = {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  goals: Goal[];
  recurrings: Recurring[];
  loading: boolean;
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  addTransaction: (t: Omit<Transaction, "id">) => Promise<void>;
  updateTransaction: (id: string, patch: Partial<Omit<Transaction, "id">>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addCategory: (c: Omit<Category, "id" | "isGlobal" | "userId">) => Promise<void>;
  updateCategory: (id: string, patch: Partial<Omit<Category, "id" | "isGlobal" | "userId">>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addBudget: (b: Omit<Budget, "id">) => Promise<void>;
  updateBudget: (id: string, patch: Partial<Omit<Budget, "id">>) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  addGoal: (g: Omit<Goal, "id" | "completed">) => Promise<void>;
  updateGoal: (id: string, patch: Partial<Omit<Goal, "id">>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addRecurring: (r: Omit<Recurring, "id" | "nextRun"> & { nextRun?: string }) => Promise<void>;
  updateRecurring: (id: string, patch: Partial<Omit<Recurring, "id">>) => Promise<void>;
  deleteRecurring: (id: string) => Promise<void>;
  applyRecurringNow: () => Promise<number>;
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
  const [budgets, setBudgets] = React.useState<Budget[]>([]);
  const [goals, setGoals] = React.useState<Goal[]>([]);
  const [recurrings, setRecurrings] = React.useState<Recurring[]>([]);
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
      setBudgets([]);
      setGoals([]);
      setRecurrings([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    // Apply due recurring first
    await supabase.rpc("apply_due_recurring_transactions", { _user_id: user.id });

    const [txRes, catRes, budRes, goalRes, recRes] = await Promise.all([
      supabase.from("transactions").select("*").order("date", { ascending: false }),
      supabase.from("categories").select("*").order("name", { ascending: true }),
      supabase.from("budgets").select("*"),
      supabase.from("goals").select("*").order("created_at", { ascending: false }),
      supabase.from("recurring_transactions").select("*").order("next_run", { ascending: true }),
    ]);

    if (txRes.error) toast.error("Erro ao carregar registros: " + txRes.error.message);
    else setTransactions((txRes.data as unknown as DBTransaction[]).map(toClientTx));

    if (catRes.error) toast.error("Erro ao carregar categorias: " + catRes.error.message);
    else setCategories((catRes.data as unknown as DBCategory[]).map(toClientCat));

    if (budRes.error) toast.error("Erro ao carregar orçamentos: " + budRes.error.message);
    else setBudgets((budRes.data as unknown as DBBudget[]).map(toClientBudget));

    if (goalRes.error) toast.error("Erro ao carregar metas: " + goalRes.error.message);
    else setGoals((goalRes.data as unknown as DBGoal[]).map(toClientGoal));

    if (recRes.error) toast.error("Erro ao carregar recorrentes: " + recRes.error.message);
    else setRecurrings((recRes.data as unknown as DBRecurring[]).map(toClientRecurring));

    setLoading(false);
  }, [user]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  // Transactions
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
      const dbPatch: {
        type?: "entrada" | "despesa";
        date?: string;
        description?: string;
        category?: string | null;
        amount?: number;
        essential?: boolean;
        fixed?: boolean;
      } = {};
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

  // Categories
  const addCategory = React.useCallback(
    async (c: Omit<Category, "id" | "isGlobal" | "userId">) => {
      if (!user) return;
      const { data, error } = await supabase
        .from("categories")
        .insert({ user_id: user.id, name: c.name, kind: c.kind, icon: c.icon, color: c.color, is_global: false })
        .select()
        .single();
      if (error) {
        toast.error("Erro ao criar categoria: " + error.message);
        throw error;
      }
      setCategories((prev) =>
        [...prev, toClientCat(data as unknown as DBCategory)].sort((a, b) => a.name.localeCompare(b.name)),
      );
    },
    [user],
  );

  const updateCategory = React.useCallback(
    async (id: string, patch: Partial<Omit<Category, "id" | "isGlobal" | "userId">>) => {
      const dbPatch: { name?: string; kind?: "entrada" | "despesa"; icon?: string; color?: string } = {};
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

  // Budgets
  const addBudget = React.useCallback(
    async (b: Omit<Budget, "id">) => {
      if (!user) return;
      const { data, error } = await supabase
        .from("budgets")
        .insert({ user_id: user.id, category_id: b.categoryId, amount: b.amount, period: b.period })
        .select()
        .single();
      if (error) {
        toast.error("Erro ao criar orçamento: " + error.message);
        throw error;
      }
      setBudgets((prev) => [...prev, toClientBudget(data as unknown as DBBudget)]);
    },
    [user],
  );

  const updateBudget = React.useCallback(async (id: string, patch: Partial<Omit<Budget, "id">>) => {
    const dbPatch: { category_id?: string; amount?: number; period?: "monthly" | "weekly" } = {};
    if (patch.categoryId !== undefined) dbPatch.category_id = patch.categoryId;
    if (patch.amount !== undefined) dbPatch.amount = patch.amount;
    if (patch.period !== undefined) dbPatch.period = patch.period;

    const { data, error } = await supabase.from("budgets").update(dbPatch).eq("id", id).select().single();
    if (error) {
      toast.error("Erro ao atualizar orçamento: " + error.message);
      throw error;
    }
    const updated = toClientBudget(data as unknown as DBBudget);
    setBudgets((prev) => prev.map((b) => (b.id === id ? updated : b)));
  }, []);

  const deleteBudget = React.useCallback(async (id: string) => {
    const { error } = await supabase.from("budgets").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir orçamento: " + error.message);
      throw error;
    }
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  }, []);

  // Goals
  const addGoal = React.useCallback(
    async (g: Omit<Goal, "id" | "completed">) => {
      if (!user) return;
      const { data, error } = await supabase
        .from("goals")
        .insert({
          user_id: user.id,
          name: g.name,
          target_amount: g.targetAmount,
          current_amount: g.currentAmount,
          target_date: g.targetDate ?? null,
          icon: g.icon,
          color: g.color,
        })
        .select()
        .single();
      if (error) {
        toast.error("Erro ao criar meta: " + error.message);
        throw error;
      }
      setGoals((prev) => [toClientGoal(data as unknown as DBGoal), ...prev]);
    },
    [user],
  );

  const updateGoal = React.useCallback(async (id: string, patch: Partial<Omit<Goal, "id">>) => {
    const dbPatch: {
      name?: string;
      target_amount?: number;
      current_amount?: number;
      target_date?: string | null;
      icon?: string;
      color?: string;
      completed?: boolean;
    } = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.targetAmount !== undefined) dbPatch.target_amount = patch.targetAmount;
    if (patch.currentAmount !== undefined) dbPatch.current_amount = patch.currentAmount;
    if (patch.targetDate !== undefined) dbPatch.target_date = patch.targetDate ?? null;
    if (patch.icon !== undefined) dbPatch.icon = patch.icon;
    if (patch.color !== undefined) dbPatch.color = patch.color;
    if (patch.completed !== undefined) dbPatch.completed = patch.completed;

    const { data, error } = await supabase.from("goals").update(dbPatch).eq("id", id).select().single();
    if (error) {
      toast.error("Erro ao atualizar meta: " + error.message);
      throw error;
    }
    const updated = toClientGoal(data as unknown as DBGoal);
    setGoals((prev) => prev.map((g) => (g.id === id ? updated : g)));
  }, []);

  const deleteGoal = React.useCallback(async (id: string) => {
    const { error } = await supabase.from("goals").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir meta: " + error.message);
      throw error;
    }
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }, []);

  // Recurrings
  const addRecurring = React.useCallback(
    async (r: Omit<Recurring, "id" | "nextRun"> & { nextRun?: string }) => {
      if (!user) return;
      const { data, error } = await supabase
        .from("recurring_transactions")
        .insert({
          user_id: user.id,
          type: r.type,
          description: r.description,
          amount: r.amount,
          category: r.categoryId ?? null,
          frequency: r.frequency,
          start_date: r.startDate,
          end_date: r.endDate ?? null,
          next_run: r.nextRun ?? r.startDate,
          essential: r.essential,
          fixed: r.fixed,
          active: r.active,
        })
        .select()
        .single();
      if (error) {
        toast.error("Erro ao criar recorrência: " + error.message);
        throw error;
      }
      setRecurrings((prev) => [...prev, toClientRecurring(data as unknown as DBRecurring)]);
    },
    [user],
  );

  const updateRecurring = React.useCallback(async (id: string, patch: Partial<Omit<Recurring, "id">>) => {
    const dbPatch: Record<string, unknown> = {};
    if (patch.type !== undefined) dbPatch.type = patch.type;
    if (patch.description !== undefined) dbPatch.description = patch.description;
    if (patch.amount !== undefined) dbPatch.amount = patch.amount;
    if (patch.categoryId !== undefined) dbPatch.category = patch.categoryId ?? null;
    if (patch.frequency !== undefined) dbPatch.frequency = patch.frequency;
    if (patch.startDate !== undefined) dbPatch.start_date = patch.startDate;
    if (patch.endDate !== undefined) dbPatch.end_date = patch.endDate ?? null;
    if (patch.nextRun !== undefined) dbPatch.next_run = patch.nextRun;
    if (patch.essential !== undefined) dbPatch.essential = patch.essential;
    if (patch.fixed !== undefined) dbPatch.fixed = patch.fixed;
    if (patch.active !== undefined) dbPatch.active = patch.active;

    const { data, error } = await supabase
      .from("recurring_transactions")
      .update(dbPatch)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      toast.error("Erro ao atualizar recorrência: " + error.message);
      throw error;
    }
    const updated = toClientRecurring(data as unknown as DBRecurring);
    setRecurrings((prev) => prev.map((r) => (r.id === id ? updated : r)));
  }, []);

  const deleteRecurring = React.useCallback(async (id: string) => {
    const { error } = await supabase.from("recurring_transactions").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir recorrência: " + error.message);
      throw error;
    }
    setRecurrings((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const applyRecurringNow = React.useCallback(async () => {
    if (!user) return 0;
    const { data, error } = await supabase.rpc("apply_due_recurring_transactions", { _user_id: user.id });
    if (error) {
      toast.error("Erro ao aplicar recorrências: " + error.message);
      return 0;
    }
    const n = (data as unknown as number) ?? 0;
    if (n > 0) {
      toast.success(`${n} transação(ões) recorrente(s) aplicada(s).`);
      await refresh();
    } else {
      toast.info("Nenhuma recorrência pendente.");
    }
    return n;
  }, [user, refresh]);

  const reseed = React.useCallback(async () => {
    if (!user) return;
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
    budgets,
    goals,
    recurrings,
    loading,
    filters,
    setFilters,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addCategory,
    updateCategory,
    deleteCategory,
    addBudget,
    updateBudget,
    deleteBudget,
    addGoal,
    updateGoal,
    deleteGoal,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    applyRecurringNow,
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
