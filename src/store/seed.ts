import type { AppState } from "./types";

const today = new Date();
const daysAgo = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// Seed transactions reference categories by NAME (resolved at insert time
// against the user's available global+custom categories).
export type SeedTransaction = Omit<AppState["transactions"][number], "id" | "categoryId" | "paid"> & {
  categoryName?: string;
  paid?: boolean;
};

export const SEED_TRANSACTIONS: SeedTransaction[] = [
  { type: "entrada", date: daysAgo(44), description: "Salário", categoryName: "Salário", amount: 8000, essential: true, fixed: true },
  { type: "entrada", date: daysAgo(30), description: "Freelance app", categoryName: "Freelance", amount: 1200, essential: false, fixed: false },
  { type: "despesa", date: daysAgo(43), description: "Mercado", categoryName: "Alimentação", amount: 320, essential: true, fixed: false },
  { type: "despesa", date: daysAgo(42), description: "Almoço", categoryName: "Alimentação", amount: 48, essential: true, fixed: false },
  { type: "despesa", date: daysAgo(40), description: "UBER", categoryName: "Transporte", amount: 36, essential: true, fixed: false },
  { type: "despesa", date: daysAgo(39), description: "Aluguel", categoryName: "Moradia", amount: 2500, essential: true, fixed: true },
  { type: "despesa", date: daysAgo(37), description: "Streaming", categoryName: "Lazer", amount: 39, essential: false, fixed: true },
  { type: "despesa", date: daysAgo(35), description: "Cinema", categoryName: "Lazer", amount: 55, essential: false, fixed: false },
  { type: "despesa", date: daysAgo(33), description: "Remédio", categoryName: "Saúde", amount: 68, essential: true, fixed: false },
  { type: "despesa", date: daysAgo(31), description: "Gasolina", categoryName: "Transporte", amount: 220, essential: true, fixed: false },
  { type: "entrada", date: daysAgo(25), description: "Freelance site", categoryName: "Freelance", amount: 900, essential: false, fixed: false },
  { type: "despesa", date: daysAgo(24), description: "Supermercado", categoryName: "Alimentação", amount: 410, essential: true, fixed: false },
  { type: "despesa", date: daysAgo(23), description: "Plano de saúde", categoryName: "Saúde", amount: 350, essential: true, fixed: true },
  { type: "despesa", date: daysAgo(22), description: "Curso online", categoryName: "Educação", amount: 199, essential: false, fixed: false },
  { type: "despesa", date: daysAgo(20), description: "Pizza", categoryName: "Alimentação", amount: 79, essential: false, fixed: false },
  { type: "despesa", date: daysAgo(18), description: "UBER", categoryName: "Transporte", amount: 28, essential: true, fixed: false },
  { type: "despesa", date: daysAgo(16), description: "Internet", categoryName: "Moradia", amount: 120, essential: true, fixed: true },
  { type: "entrada", date: daysAgo(14), description: "Salário", categoryName: "Salário", amount: 8000, essential: true, fixed: true },
  { type: "despesa", date: daysAgo(13), description: "Mercado", categoryName: "Alimentação", amount: 340, essential: true, fixed: false },
  { type: "despesa", date: daysAgo(12), description: "Farmácia", categoryName: "Saúde", amount: 95, essential: true, fixed: false },
  { type: "despesa", date: daysAgo(11), description: "Dízimo", categoryName: "Dízimo", amount: 800, essential: true, fixed: true },
  { type: "despesa", date: daysAgo(10), description: "Passeio", categoryName: "Lazer", amount: 120, essential: false, fixed: false },
  { type: "despesa", date: daysAgo(9), description: "Metrô", categoryName: "Transporte", amount: 12, essential: true, fixed: false },
  { type: "despesa", date: daysAgo(8), description: "Gasolina", categoryName: "Transporte", amount: 210, essential: true, fixed: false },
  { type: "despesa", date: daysAgo(7), description: "Conta de luz", categoryName: "Contas Diversas", amount: 180, essential: true, fixed: true },
  { type: "despesa", date: daysAgo(5), description: "Restaurante", categoryName: "Alimentação", amount: 130, essential: false, fixed: false },
  { type: "despesa", date: daysAgo(3), description: "UBER", categoryName: "Transporte", amount: 22, essential: true, fixed: false },
  { type: "despesa", date: daysAgo(2), description: "Padaria", categoryName: "Alimentação", amount: 35, essential: true, fixed: false },
  { type: "despesa", date: daysAgo(1), description: "Mercado", categoryName: "Alimentação", amount: 280, essential: true, fixed: false },
];
