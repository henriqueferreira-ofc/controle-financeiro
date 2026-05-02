// Fase 1.3 — Importação CSV
// Critérios cobertos:
// - Auto-detecção de separador (vírgula, ponto-e-vírgula, tab)
// - Parser tolerante a aspas e campos com vírgula interna
// - Normalização de valores monetários (BRL "1.234,56" e en "1,234.56")
// - Normalização de datas (DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY)
// - Hash de deduplicação por (data + valor + descrição normalizada)
// - Auto-categorização por regras simples (palavra-chave → categoria)

export type CsvCell = string;
export type CsvRow = CsvCell[];

export type ColumnMapping = {
  date: number | null;
  description: number | null;
  amount: number | null;
  type: number | null; // opcional: coluna de tipo (entrada/despesa)
  category: number | null; // opcional
};

export type ParsedRow = {
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  type: "entrada" | "despesa";
  categoryName?: string | null;
  hash: string;
  duplicate: boolean;
  valid: boolean;
  errors: string[];
};

const SEPARATORS = [",", ";", "\t", "|"] as const;

export function detectSeparator(sample: string): string {
  const lines = sample.split(/\r?\n/).filter((l) => l.trim().length > 0).slice(0, 5);
  if (lines.length === 0) return ",";
  const scores = SEPARATORS.map((sep) => {
    const counts = lines.map((l) => l.split(sep).length);
    const min = Math.min(...counts);
    const max = Math.max(...counts);
    // melhor separador: muitas colunas e estável entre linhas
    return { sep, score: min > 1 ? min * 10 - (max - min) : 0 };
  });
  scores.sort((a, b) => b.score - a.score);
  return scores[0].score > 0 ? scores[0].sep : ",";
}

// Parser CSV simples com suporte a aspas
export function parseCsv(text: string, sep: string): CsvRow[] {
  const rows: CsvRow[] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === sep) {
        cur.push(field);
        field = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        cur.push(field);
        rows.push(cur);
        cur = [];
        field = "";
      } else {
        field += c;
      }
    }
  }
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    rows.push(cur);
  }
  return rows.filter((r) => r.some((c) => c && c.trim().length > 0));
}

export function parseAmount(raw: string): number | null {
  if (!raw) return null;
  let s = raw.trim().replace(/[R$€$\s]/g, "");
  // Detecta formato BR (1.234,56) vs EN (1,234.56)
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      // BR: . é milhar, , é decimal
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      // EN: , é milhar, . é decimal
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    // só vírgula → decimal BR
    s = s.replace(",", ".");
  }
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

export function parseDate(raw: string): string | null {
  if (!raw) return null;
  const s = raw.trim();
  // YYYY-MM-DD
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const [, y, mo, d] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // DD/MM/YYYY ou DD-MM-YYYY
  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = (parseInt(y, 10) > 50 ? "19" : "20") + y;
    // Heurística: se dia > 12, certamente DD/MM
    const dd = parseInt(d, 10);
    const mm = parseInt(mo, 10);
    if (dd > 12 || mm <= 12) {
      return `${y}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
    }
    // ambíguo: assume DD/MM (padrão BR)
    return `${y}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  }
  return null;
}

function normalizeDescription(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/\d{2,}\/\d{2,}(\/\d{2,})?/g, "") // remove datas ex: 10/12
    .replace(/\d{4,}/g, "") // remove números longos (códigos de transação)
    .replace(/[\*\-#]/g, " ") // remove caracteres especiais de separação
    .replace(/\s+/g, " ")
    .trim();
}

// Hash determinístico simples (FNV-1a) — suficiente para dedup local
export function hashKey(date: string, amount: number, desc: string): string {
  const key = `${date}|${amount.toFixed(2)}|${normalizeDescription(desc)}`;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

// Regras simples de auto-categorização
const CATEGORY_RULES: Array<{ keywords: string[]; category: string; type: "entrada" | "despesa" }> = [
  { keywords: ["mercado", "supermerc", "carrefour", "extra", "pao de acucar", "atacadao", "assai", "condor", "zaffari", "muffato", "angeloni", "compras", "mercearia"], category: "Alimentação", type: "despesa" },
  { keywords: ["ifood", "uber eats", "rappi", "restaurante", "lanche", "padaria", "panificadora", "cafe", "starbucks", "mcdonalds", "burger king", "bk", "outback", "pizza", "sushi"], category: "Alimentação", type: "despesa" },
  { keywords: ["uber", "99", "taxi", "metro", "onibus", "combustivel", "gasolina", "posto", "shell", "ipiranga", "br", "estacionamento", "pedagio", "movida", "localiza", "azul", "latam", "gol", "passagem"], category: "Transporte", type: "despesa" },
  { keywords: ["aluguel", "condominio", "iptu", "imovel", "quinto andar", "loft"], category: "Moradia", type: "despesa" },
  { keywords: ["luz", "energia", "cpfl", "enel", "light", "agua", "gas", "internet", "telefone", "vivo", "claro", "tim", "oi", "net", "sky"], category: "Contas", type: "despesa" },
  { keywords: ["farmacia", "drogaria", "raia", "drogasil", "pague menos", "saopaulo", "consulta", "hospital", "plano de saude", "unimed", "bradesco saude", "sulamerica", "laboratorio", "dentista"], category: "Saúde", type: "despesa" },
  { keywords: ["netflix", "spotify", "prime", "disney", "hbo", "youtube", "crunchyroll", "deezer", "globo play", "game", "steam", "playstation", "xbox", "nintendo"], category: "Assinaturas", type: "despesa" },
  { keywords: ["salario", "salario", "pagamento", "honorario", "pro-labore", "rendimento", "dividendos"], category: "Salário", type: "entrada" },
  { keywords: ["pix recebido", "transferencia recebida", "ted recebida", "deposito", "estorno", "cashback", "reembolso"], category: "Transferências", type: "entrada" },
  { keywords: ["amazon", "mercado livre", "shopee", "shein", "magalu", "magazine", "americanas", "casas bahia", "loja", "roupa", "calcado", "tenis", "centauro", "decathlon", "renner", "cea", "riachuelo"], category: "Shopping", type: "despesa" },
  { keywords: ["academia", "smartfit", "bluefit", "selfit", "esporte", "cinema", "ingresso", "show", "teatro", "viagem", "hotel", "airbnb", "booking", "decolar"], category: "Lazer", type: "despesa" },
];

export type BankPreset = "nubank" | "itau" | "bradesco" | "bb" | "generic";

export const BANK_PRESETS: Record<BankPreset, {
  name: string;
  separator: string;
  mapping: ColumnMapping;
  hasHeader: boolean;
}> = {
  nubank: {
    name: "Nubank",
    separator: ",",
    hasHeader: true,
    mapping: { date: 0, amount: 1, description: 3, type: null, category: null },
  },
  itau: {
    name: "Itaú",
    separator: ";",
    hasHeader: true,
    mapping: { date: 0, description: 1, amount: 2, type: null, category: null },
  },
  bradesco: {
    name: "Bradesco",
    separator: ";",
    hasHeader: true,
    mapping: { date: 0, description: 2, amount: 3, type: null, category: null },
  },
  bb: {
    name: "Banco do Brasil",
    separator: ",",
    hasHeader: true,
    mapping: { date: 0, description: 2, amount: 3, type: null, category: null },
  },
  generic: {
    name: "Genérico / Outros",
    separator: ",",
    hasHeader: true,
    mapping: { date: null, description: null, amount: null, type: null, category: null },
  },
};

export function suggestCategory(description: string): { category: string; type: "entrada" | "despesa" } | null {
  const norm = normalizeDescription(description);
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((k) => norm.includes(normalizeDescription(k)))) {
      return { category: rule.category, type: rule.type };
    }
  }
  return null;
}

export function processRows(
  rows: CsvRow[],
  mapping: ColumnMapping,
  hasHeader: boolean,
  existingHashes: Set<string>,
): ParsedRow[] {
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const seenInBatch = new Set<string>();
  const out: ParsedRow[] = [];

  for (const row of dataRows) {
    const errors: string[] = [];
    const dateRaw = mapping.date !== null ? row[mapping.date] ?? "" : "";
    const descRaw = mapping.description !== null ? row[mapping.description] ?? "" : "";
    const amtRaw = mapping.amount !== null ? row[mapping.amount] ?? "" : "";
    const typeRaw = mapping.type !== null ? row[mapping.type] ?? "" : "";
    const catRaw = mapping.category !== null ? row[mapping.category] ?? "" : "";

    const date = parseDate(dateRaw);
    if (!date) errors.push("Data inválida");

    const amount = parseAmount(amtRaw);
    if (amount === null) errors.push("Valor inválido");

    const description = (descRaw || "").trim();
    if (!description) errors.push("Descrição vazia");

    // Tipo: Heurística robusta de sinal (Fase 2.1 - Integridade de entradas/saídas)
    let type: "entrada" | "despesa" = "despesa";
    const typeNorm = typeRaw.trim().toLowerCase();
    
    // 1. Se houver coluna de tipo explícita
    if (typeNorm.startsWith("entr") || typeNorm === "income" || typeNorm === "credit" || typeNorm === "c" || typeNorm === "credito") {
      type = "entrada";
    } else if (typeNorm.startsWith("des") || typeNorm.startsWith("exp") || typeNorm === "debit" || typeNorm === "d" || typeNorm === "debito") {
      type = "despesa";
    } 
    // 2. Baseado no sinal do valor (Padrão: negativo = despesa)
    else if (amount !== null) {
      if (amount < 0) {
        type = "despesa";
      } else if (amount > 0) {
        // No Nubank e outros, valores positivos no extrato costumam ser entradas (pagamentos/estornos)
        type = "entrada";
      }
    }

    // 3. Refinamento por palavra-chave se ainda incerto
    if (amount !== null && amount > 0 && !typeRaw) {
      const suggested = suggestCategory(description);
      if (suggested) type = suggested.type;
    }

    const absAmount = amount !== null ? Math.abs(amount) : 0;
    const categoryName = catRaw.trim() || suggestCategory(description)?.category || null;

    const valid = errors.length === 0;
    const hash = valid ? hashKey(date!, absAmount, description) : "";
    const duplicate = valid && (existingHashes.has(hash) || seenInBatch.has(hash));
    if (valid) seenInBatch.add(hash);

    out.push({
      date: date ?? "",
      description,
      amount: absAmount,
      type,
      categoryName,
      hash,
      duplicate,
      valid,
      errors,
    });
  }
  return out;
}
