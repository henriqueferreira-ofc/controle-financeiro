import type { AppState, Filters, Transaction } from "./types";

export const periodDays = (period: Filters["period"]) =>
  period === "7d" ? 7 : period === "30d" ? 30 : 0;

export function getDateRange(period: Filters["period"], txs: Transaction[]) {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  if (period === "all") {
    if (txs.length === 0) {
      const start = new Date(end);
      start.setDate(start.getDate() - 30);
      return { start, end, days: 30 };
    }
    const sorted = [...txs].sort((a, b) => a.date.localeCompare(b.date));
    const start = new Date(sorted[0].date + "T00:00:00");
    const ms = end.getTime() - start.getTime();
    const days = Math.max(1, Math.ceil(ms / 86400000));
    return { start, end, days };
  }
  const days = periodDays(period);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return { start, end, days };
}

export function applyFilters(state: AppState, filters: Filters): Transaction[] {
  const { start, end } = getDateRange(filters.period, state.transactions);
  return state.transactions.filter((t) => {
    const d = new Date(t.date + "T12:00:00");
    if (d < start || d > end) return false;
    if (filters.categoryId !== "all" && t.categoryId !== filters.categoryId) return false;
    if (filters.type !== "all" && t.type !== filters.type) return false;
    if (filters.search.trim()) {
      const s = filters.search.trim().toLowerCase();
      if (!t.description.toLowerCase().includes(s)) return false;
    }
    return true;
  });
}

export function dashboardData(state: AppState, filters: Filters) {
  const filtered = applyFilters(state, { ...filters, search: "", type: "all" });
  const { start, end, days } = getDateRange(filters.period, state.transactions);

  const entradas = filtered.filter((t) => t.type === "entrada");
  const despesas = filtered.filter((t) => t.type === "despesa");

  const totalEntradas = entradas.reduce((a, b) => a + b.amount, 0);
  const totalSaidas = despesas.reduce((a, b) => a + b.amount, 0);
  const gastoMedioDiario = days > 0 ? totalSaidas / days : 0;

  const byCategory = new Map<string, number>();
  for (const d of despesas) {
    if (!d.categoryId) continue;
    byCategory.set(d.categoryId, (byCategory.get(d.categoryId) || 0) + d.amount);
  }

  let topCat: { id: string; name: string; total: number } | null = null;
  if (byCategory.size > 0) {
    const entries = [...byCategory.entries()].sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      const an = state.categories.find((c) => c.id === a[0])?.name || "";
      const bn = state.categories.find((c) => c.id === b[0])?.name || "";
      return an.localeCompare(bn);
    });
    const [id, total] = entries[0];
    topCat = { id, name: state.categories.find((c) => c.id === id)?.name || "—", total };
  }

  // Per day
  const dayMap = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    dayMap.set(key, 0);
  }
  for (const d of despesas) {
    if (dayMap.has(d.date)) dayMap.set(d.date, (dayMap.get(d.date) || 0) + d.amount);
  }
  const perDay = [...dayMap.entries()].map(([date, total]) => ({
    date,
    label: date.slice(8, 10) + "/" + date.slice(5, 7),
    total: Number(total.toFixed(2)),
  }));

  const perCategory = [...byCategory.entries()]
    .map(([id, total]) => ({
      id,
      name: state.categories.find((c) => c.id === id)?.name || "—",
      total: Number(total.toFixed(2)),
    }))
    .sort((a, b) => b.total - a.total);

  // Insights
  const insights: { title: string; text: string }[] = [];
  if (topCat && totalSaidas > 0) {
    const pct = (topCat.total / totalSaidas) * 100;
    insights.push({
      title: "Categoria dominante",
      text: `A categoria ${topCat.name} representou ${pct.toFixed(1)}% das suas despesas no período.`,
    });
  }
  if (perDay.length > 0) {
    const peak = perDay.reduce((a, b) => (b.total > a.total ? b : a));
    if (peak.total > 0) {
      insights.push({
        title: "Pico de gasto",
        text: `Seu maior gasto diário foi de R$ ${peak.total.toFixed(2)} em ${peak.label}.`,
      });
    }
  }
  if (topCat && topCat.total > 0) {
    const economy = topCat.total * 0.1;
    insights.push({
      title: "Economia potencial",
      text: `Reduzindo 10% em ${topCat.name}, você economiza cerca de R$ ${economy.toFixed(2)} neste período.`,
    });
  }
  if (totalEntradas > 0 && totalSaidas > 0) {
    const ratio = (totalSaidas / totalEntradas) * 100;
    insights.push({
      title: "Comprometimento de receita",
      text: `Suas despesas representam ${ratio.toFixed(1)}% das suas entradas no período.`,
    });
  }

  return {
    totalEntradas,
    totalSaidas,
    gastoMedioDiario,
    topCat,
    perDay,
    perCategory,
    insights,
    days,
    hasData: filtered.length > 0,
  };
}
