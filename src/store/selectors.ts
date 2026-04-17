import type { Filters, Transaction, Category } from "./types";

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

export function applyFilters(transactions: Transaction[], filters: Filters): Transaction[] {
  const { start, end } = getDateRange(filters.period, transactions);
  return transactions.filter((t) => {
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

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function dashboardData(transactions: Transaction[], categories: Category[], filters: Filters) {
  const filtered = applyFilters(transactions, { ...filters, search: "", type: "all" });
  const { start, days } = getDateRange(filters.period, transactions);

  const entradas = filtered.filter((t) => t.type === "entrada");
  const despesas = filtered.filter((t) => t.type === "despesa");

  const totalEntradas = entradas.reduce((a, b) => a + b.amount, 0);
  const totalSaidas = despesas.reduce((a, b) => a + b.amount, 0);
  const saldo = totalEntradas - totalSaidas;
  const gastoMedioDiario = days > 0 ? totalSaidas / days : 0;

  const byCategory = new Map<string, number>();
  for (const d of despesas) {
    if (!d.categoryId) continue;
    byCategory.set(d.categoryId, (byCategory.get(d.categoryId) || 0) + d.amount);
  }

  let topCat: { id: string; name: string; total: number; color: string } | null = null;
  if (byCategory.size > 0) {
    const entries = [...byCategory.entries()].sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      const an = categories.find((c) => c.id === a[0])?.name || a[0];
      const bn = categories.find((c) => c.id === b[0])?.name || b[0];
      return an.localeCompare(bn);
    });
    const [id, total] = entries[0];
    const cat = categories.find((c) => c.id === id);
    topCat = { id, name: cat?.name || id, total, color: cat?.color || "#64748b" };
  }

  // Series per day (despesas + entradas + saldo acumulado)
  const dayTpl: { date: string; label: string; despesa: number; entrada: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = ymd(d);
    dayTpl.push({
      date: key,
      label: key.slice(8, 10) + "/" + key.slice(5, 7),
      despesa: 0,
      entrada: 0,
    });
  }
  const idxByDate = new Map(dayTpl.map((d, i) => [d.date, i]));
  for (const t of filtered) {
    const i = idxByDate.get(t.date);
    if (i === undefined) continue;
    if (t.type === "despesa") dayTpl[i].despesa += t.amount;
    else dayTpl[i].entrada += t.amount;
  }
  const perDay = dayTpl.map((d) => ({ ...d, despesa: Number(d.despesa.toFixed(2)), entrada: Number(d.entrada.toFixed(2)), total: Number(d.despesa.toFixed(2)) }));

  let acc = 0;
  const cumulative = perDay.map((d) => {
    acc += d.entrada - d.despesa;
    return { date: d.date, label: d.label, saldo: Number(acc.toFixed(2)) };
  });

  const perCategory = [...byCategory.entries()]
    .map(([id, total]) => {
      const c = categories.find((x) => x.id === id);
      return {
        id,
        name: c?.name || id,
        color: c?.color || "#64748b",
        total: Number(total.toFixed(2)),
      };
    })
    .sort((a, b) => b.total - a.total);

  // Comparativo mês atual vs mês anterior (independente do filtro de período)
  const now = new Date();
  const yCur = now.getFullYear();
  const mCur = now.getMonth();
  const prev = new Date(yCur, mCur - 1, 1);
  const yPrev = prev.getFullYear();
  const mPrev = prev.getMonth();

  const monthAgg = (y: number, m: number) => {
    let despesa = 0;
    let entrada = 0;
    for (const t of transactions) {
      const d = new Date(t.date + "T12:00:00");
      if (d.getFullYear() === y && d.getMonth() === m) {
        if (t.type === "despesa") despesa += t.amount;
        else entrada += t.amount;
      }
    }
    return { despesa: Number(despesa.toFixed(2)), entrada: Number(entrada.toFixed(2)) };
  };
  const cur = monthAgg(yCur, mCur);
  const prv = monthAgg(yPrev, mPrev);
  const monthCompare = [
    { label: "Mês anterior", entrada: prv.entrada, despesa: prv.despesa },
    { label: "Mês atual", entrada: cur.entrada, despesa: cur.despesa },
  ];

  const insights: { title: string; text: string }[] = [];
  if (topCat && totalSaidas > 0) {
    const pct = (topCat.total / totalSaidas) * 100;
    insights.push({
      title: "Categoria dominante",
      text: `A categoria ${topCat.name} representou ${pct.toFixed(1)}% das suas despesas no período.`,
    });
  }
  if (perDay.length > 0) {
    const peak = perDay.reduce((a, b) => (b.despesa > a.despesa ? b : a));
    if (peak.despesa > 0) {
      insights.push({
        title: "Pico de gasto",
        text: `Seu maior gasto diário foi de R$ ${peak.despesa.toFixed(2)} em ${peak.label}.`,
      });
    }
  }
  if (topCat && topCat.total > 0) {
    insights.push({
      title: "Economia potencial",
      text: `Reduzindo 10% em ${topCat.name}, você economiza cerca de R$ ${(topCat.total * 0.1).toFixed(2)} neste período.`,
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
    saldo,
    gastoMedioDiario,
    topCat,
    perDay,
    perCategory,
    cumulative,
    monthCompare,
    insights,
    days,
    hasData: filtered.length > 0,
  };
}
