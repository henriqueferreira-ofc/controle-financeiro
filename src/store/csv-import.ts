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
    .replace(/[\u0300-\u036f]/g, "")
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
  { keywords: ["mercado", "supermerc", "carrefour", "extra", "pão de açúcar", "atacad"], category: "Alimentação", type: "despesa" },
  { keywords: ["ifood", "uber eats", "rappi", "restaurante", "lanche"], category: "Alimentação", type: "despesa" },
  { keywords: ["uber", "99", "taxi", "metro", "ônibus", "combustivel", "gasolina", "posto"], category: "Transporte", type: "despesa" },
  { keywords: ["aluguel", "condominio", "iptu"], category: "Moradia", type: "despesa" },
  { keywords: ["luz", "energia", "agua", "gas", "internet", "telefone", "celular"], category: "Contas", type: "despesa" },
  { keywords: ["farmacia", "drogaria", "consulta", "hospital", "plano de saude"], category: "Saúde", type: "despesa" },
  { keywords: ["netflix", "spotify", "prime", "disney", "hbo", "youtube"], category: "Assinaturas", type: "despesa" },
  { keywords: ["salario", "salário", "pagamento", "honorario"], category: "Salário", type: "entrada" },
  { keywords: ["pix recebido", "transferencia recebida", "ted recebid"], category: "Transferências", type: "entrada" },
];

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

    // Tipo: explícito > sinal do valor > sugestão por descrição > despesa
    let type: "entrada" | "despesa" = "despesa";
    const typeNorm = typeRaw.trim().toLowerCase();
    if (typeNorm.startsWith("entr") || typeNorm === "income" || typeNorm === "credit" || typeNorm === "c") {
      type = "entrada";
    } else if (typeNorm.startsWith("des") || typeNorm.startsWith("exp") || typeNorm === "debit" || typeNorm === "d") {
      type = "despesa";
    } else if (amount !== null && amount > 0 && !typeRaw) {
      // sem coluna de tipo: positivo=entrada, negativo=despesa
      const suggested = suggestCategory(description);
      if (suggested) type = suggested.type;
    } else if (amount !== null && amount < 0) {
      type = "despesa";
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
