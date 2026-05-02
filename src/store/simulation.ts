// Fase 3.2 — Sistema de Simulações ("E se...")
// Critérios cobertos:
// - 3.2.1: aplicar ajustes hipotéticos (cortar % de categoria, receita extra, pausar recorrente)
// - 3.2.2: reprojetar saldo no horizonte 30/60/90 sem alterar dados reais
// - 3.2.3: comparar cenário base vs simulado (delta no saldo final)
import type { Transaction, Recurring } from "./types";
import { buildForecast, type Forecast } from "./intelligence";

export type Adjustment =
  | { kind: "cut-category"; categoryId: string; percent: number } // 0..100
  | { kind: "extra-income"; monthlyAmount: number; description?: string }
  | { kind: "pause-recurring"; recurringId: string };

export type SimulationResult = {
  base: Forecast;
  simulated: Forecast;
  delta: number; // simulated.projectedBalance - base.projectedBalance
  daysAhead: 30 | 60 | 90;
};

/**
 * Aplica os ajustes em cópias dos arrays e re-roda buildForecast.
 * Não muta nada do estado real.
 */
export function runSimulation(
  transactions: Transaction[],
  recurrings: Recurring[],
  adjustments: Adjustment[],
  daysAhead: 30 | 60 | 90,
): SimulationResult {
  const base = buildForecast(transactions, daysAhead, recurrings);

  // 1. Clona transações e ajusta históricos para alterar a média móvel diária.
  let simTx = transactions.map((t) => ({ ...t }));
  // 2. Clona recorrências para pausar / ajustar valores.
  let simRec = recurrings.map((r) => ({ ...r }));

  for (const adj of adjustments) {
    if (adj.kind === "cut-category") {
      const factor = Math.max(0, 1 - adj.percent / 100);
      // Reduz despesas históricas dessa categoria — afeta avgDailyVarNet
      simTx = simTx.map((t) =>
        t.type === "despesa" && t.categoryId === adj.categoryId
          ? { ...t, amount: t.amount * factor }
          : t,
      );
      // Também reduz recorrências da mesma categoria
      simRec = simRec.map((r) =>
        r.type === "despesa" && r.categoryId === adj.categoryId
          ? { ...r, amount: r.amount * factor }
          : r,
      );
    } else if (adj.kind === "pause-recurring") {
      simRec = simRec.map((r) =>
        r.id === adj.recurringId ? { ...r, active: false } : r,
      );
    } else if (adj.kind === "extra-income") {
      // Distribui receita extra como entrada mensal recorrente "virtual"
      const today = new Date();
      const startISO = today.toISOString().slice(0, 10);
      simRec = [
        ...simRec,
        {
          id: `__sim_extra_${Math.random().toString(36).slice(2)}`,
          type: "entrada",
          description: adj.description ?? "Receita extra (simulada)",
          amount: adj.monthlyAmount,
          categoryId: null,
          frequency: "monthly",
          startDate: startISO,
          endDate: null,
          nextRun: startISO,
          essential: false,
          fixed: false,
          active: true,
          pausedUntil: null,
          skipDates: [],
        },
      ];
    }
  }

  const simulated = buildForecast(simTx, daysAhead, simRec);

  return {
    base,
    simulated,
    delta: Number((simulated.projectedBalance - base.projectedBalance).toFixed(2)),
    daysAhead,
  };
}
