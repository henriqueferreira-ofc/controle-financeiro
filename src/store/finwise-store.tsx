import * as React from "react";
import type { AppState, Transaction, Filters } from "./types";
import { SEED } from "./seed";
import { shortId } from "@/lib/format";

const STORAGE_KEY = "finwise_data_v1";

type Ctx = {
  state: AppState;
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  addTransaction: (t: Omit<Transaction, "id">) => void;
  updateTransaction: (id: string, patch: Partial<Omit<Transaction, "id">>) => void;
  deleteTransaction: (id: string) => void;
  reseed: () => void;
  setPersistLocal: (v: boolean) => void;
  setClearOnLogout: (v: boolean) => void;
  logout: () => void;
  loginAgain: () => void;
};

const FinwiseContext = React.createContext<Ctx | null>(null);

const loadState = (): AppState => {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED;
    const parsed = JSON.parse(raw) as AppState;
    return {
      ...SEED,
      ...parsed,
      preferences: { ...SEED.preferences, ...(parsed.preferences || {}) },
      session: { ...SEED.session, ...(parsed.session || {}) },
    };
  } catch {
    return SEED;
  }
};

export function FinwiseProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AppState>(SEED);
  const [filters, setFilters] = React.useState<Filters>({
    period: "30d",
    categoryId: "all",
    search: "",
    type: "all",
  });
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    if (!state.preferences.persistLocal) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state, hydrated]);

  const addTransaction = React.useCallback((t: Omit<Transaction, "id">) => {
    setState((s) => ({ ...s, transactions: [{ ...t, id: shortId() }, ...s.transactions] }));
  }, []);

  const updateTransaction = React.useCallback(
    (id: string, patch: Partial<Omit<Transaction, "id">>) => {
      setState((s) => ({
        ...s,
        transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      }));
    },
    [],
  );

  const deleteTransaction = React.useCallback((id: string) => {
    setState((s) => ({ ...s, transactions: s.transactions.filter((t) => t.id !== id) }));
  }, []);

  const reseed = React.useCallback(() => {
    setState((s) => ({ ...SEED, preferences: s.preferences, session: s.session }));
  }, []);

  const setPersistLocal = React.useCallback((v: boolean) => {
    setState((s) => ({ ...s, preferences: { ...s.preferences, persistLocal: v } }));
    if (!v) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  }, []);

  const setClearOnLogout = React.useCallback((v: boolean) => {
    setState((s) => ({ ...s, preferences: { ...s.preferences, clearOnLogout: v } }));
  }, []);

  const logout = React.useCallback(() => {
    setState((s) => {
      if (s.preferences.clearOnLogout) {
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch {
          // ignore
        }
        return { ...SEED, session: { loggedOut: true } };
      }
      return { ...s, session: { loggedOut: true } };
    });
  }, []);

  const loginAgain = React.useCallback(() => {
    setState((s) => ({ ...s, session: { loggedOut: false } }));
  }, []);

  const value: Ctx = {
    state,
    filters,
    setFilters,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    reseed,
    setPersistLocal,
    setClearOnLogout,
    logout,
    loginAgain,
  };

  return <FinwiseContext.Provider value={value}>{children}</FinwiseContext.Provider>;
}

export function useFinwise() {
  const ctx = React.useContext(FinwiseContext);
  if (!ctx) throw new Error("useFinwise must be used within FinwiseProvider");
  return ctx;
}
