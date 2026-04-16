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

export const SEED: AppState = {
  categories: [
    { id: "cat_alimentacao", name: "Alimentação", kind: "despesa" },
    { id: "cat_transporte", name: "Transporte", kind: "despesa" },
    { id: "cat_moradia", name: "Moradia", kind: "despesa" },
    { id: "cat_lazer", name: "Lazer", kind: "despesa" },
    { id: "cat_saude", name: "Saúde", kind: "despesa" },
    { id: "cat_educacao", name: "Educação", kind: "despesa" },
    { id: "cat_assinaturas", name: "Assinaturas", kind: "despesa" },
    { id: "cat_salario", name: "Salário", kind: "entrada" },
    { id: "cat_freela", name: "Freelance", kind: "entrada" },
  ],
  transactions: [
    { id: "t1", type: "entrada", date: daysAgo(44), description: "Salário", categoryId: "cat_salario", amount: 8000 },
    { id: "t2", type: "entrada", date: daysAgo(30), description: "Freelance app", categoryId: "cat_freela", amount: 1200 },
    { id: "t3", type: "despesa", date: daysAgo(43), description: "Mercado", categoryId: "cat_alimentacao", amount: 320 },
    { id: "t4", type: "despesa", date: daysAgo(42), description: "Almoço", categoryId: "cat_alimentacao", amount: 48 },
    { id: "t5", type: "despesa", date: daysAgo(40), description: "UBER", categoryId: "cat_transporte", amount: 36 },
    { id: "t6", type: "despesa", date: daysAgo(39), description: "Aluguel", categoryId: "cat_moradia", amount: 2500 },
    { id: "t7", type: "despesa", date: daysAgo(37), description: "Streaming", categoryId: "cat_assinaturas", amount: 39 },
    { id: "t8", type: "despesa", date: daysAgo(35), description: "Cinema", categoryId: "cat_lazer", amount: 55 },
    { id: "t9", type: "despesa", date: daysAgo(33), description: "Remédio", categoryId: "cat_saude", amount: 68 },
    { id: "t10", type: "despesa", date: daysAgo(31), description: "Gasolina", categoryId: "cat_transporte", amount: 220 },
    { id: "t11", type: "entrada", date: daysAgo(25), description: "Freelance site", categoryId: "cat_freela", amount: 900 },
    { id: "t12", type: "despesa", date: daysAgo(24), description: "Supermercado", categoryId: "cat_alimentacao", amount: 410 },
    { id: "t13", type: "despesa", date: daysAgo(23), description: "Plano de saúde", categoryId: "cat_saude", amount: 350 },
    { id: "t14", type: "despesa", date: daysAgo(22), description: "Curso online", categoryId: "cat_educacao", amount: 199 },
    { id: "t15", type: "despesa", date: daysAgo(20), description: "Pizza", categoryId: "cat_alimentacao", amount: 79 },
    { id: "t16", type: "despesa", date: daysAgo(18), description: "UBER", categoryId: "cat_transporte", amount: 28 },
    { id: "t17", type: "despesa", date: daysAgo(16), description: "Internet", categoryId: "cat_moradia", amount: 120 },
    { id: "t18", type: "entrada", date: daysAgo(14), description: "Salário", categoryId: "cat_salario", amount: 8000 },
    { id: "t19", type: "despesa", date: daysAgo(13), description: "Mercado", categoryId: "cat_alimentacao", amount: 340 },
    { id: "t20", type: "despesa", date: daysAgo(12), description: "Farmácia", categoryId: "cat_saude", amount: 95 },
    { id: "t21", type: "despesa", date: daysAgo(11), description: "Assinatura SaaS", categoryId: "cat_assinaturas", amount: 59 },
    { id: "t22", type: "despesa", date: daysAgo(10), description: "Passeio", categoryId: "cat_lazer", amount: 120 },
    { id: "t23", type: "despesa", date: daysAgo(9), description: "Metrô", categoryId: "cat_transporte", amount: 12 },
    { id: "t24", type: "despesa", date: daysAgo(8), description: "Gasolina", categoryId: "cat_transporte", amount: 210 },
    { id: "t25", type: "despesa", date: daysAgo(5), description: "Restaurante", categoryId: "cat_alimentacao", amount: 130 },
    { id: "t26", type: "despesa", date: daysAgo(3), description: "UBER", categoryId: "cat_transporte", amount: 22 },
    { id: "t27", type: "despesa", date: daysAgo(2), description: "Padaria", categoryId: "cat_alimentacao", amount: 35 },
    { id: "t28", type: "despesa", date: daysAgo(1), description: "Mercado", categoryId: "cat_alimentacao", amount: 280 },
  ],
  preferences: {
    persistLocal: true,
    clearOnLogout: false,
  },
  session: {
    loggedOut: false,
  },
};
