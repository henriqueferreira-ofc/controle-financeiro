// Parsers para extratos bancários (OFX, CSV, XLSX) + classificação automática.
// Tudo client-side. Não solicita nem armazena credenciais bancárias.

import * as XLSX from "xlsx";
import {
  detectSeparator,
  parseCsv,
  parseAmount,
  parseDate,
  hashKey,
} from "./csv-import";

export type StatementFormat = "ofx" | "csv" | "xlsx";

export type ParsedStatementTxn = {
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // sempre positivo
  type: "entrada" | "despesa";
  externalId?: string | null;
  isPix: boolean;
  categorySuggestion: string | null;
  dedupHash: string;
};

// ---------- Classificação automática ----------
type Rule = {
  match: RegExp;
  category: string;
  type?: "entrada" | "despesa";
  isPix?: boolean;
};

const STATEMENT_RULES: Rule[] = [
  { match: /pix\s+receb/i, category: "PIX Recebido", type: "entrada", isPix: true },
  { match: /pix\s+envi/i, category: "PIX Enviado", type: "despesa", isPix: true },
  { match: /\bpix\b/i, category: "PIX", isPix: true },
  { match: /sal[aá]rio|salario|holerite|prolabore|pro\s*labore/i, category: "Salário", type: "entrada" },
  { match: /energia|cpfl|enel|light|eletropaulo|coelba/i, category: "Contas Fixas", type: "despesa" },
  { match: /\bágua|\bagua\b|sabesp|cedae|caesb|copasa/i, category: "Contas Fixas", type: "despesa" },
  { match: /internet|vivo fibra|claro net|oi fibra|net combo/i, category: "Contas Fixas", type: "despesa" },
  { match: /telefone|telefonia|vivo|claro|tim|oi/i, category: "Contas Fixas", type: "despesa" },
  { match: /boleto|cobranca|cobrança/i, category: "Conta Paga", type: "despesa" },
  { match: /tarifa|taxa\s+banc|iof|anuidade/i, category: "Tarifa Bancária", type: "despesa" },
  { match: /cart[aã]o de cr[eé]dito|fatura\s+cart/i, category: "Cartão de Crédito", type: "despesa" },
  { match: /aluguel|imobili[aá]ria|condom[ií]nio|iptu/i, category: "Moradia", type: "despesa" },
  { match: /uber|99\s|taxi|metr[oô]|onibus|combust[ií]vel|gasolina|posto/i, category: "Transporte", type: "despesa" },
  { match: /ifood|rappi|restaurante|lanchonete|padaria/i, category: "Alimentação", type: "despesa" },
  { match: /mercado|supermerc|carrefour|extra|atacad[aã]o|assa[ií]/i, category: "Alimentação", type: "despesa" },
  { match: /farm[aá]cia|drogaria|raia|drogasil/i, category: "Saúde", type: "despesa" },
  { match: /netflix|spotify|prime|disney|hbo|youtube/i, category: "Assinaturas", type: "despesa" },
  { match: /transfer[eê]ncia\s+receb|ted\s+receb|deposito|estorno/i, category: "Transferências", type: "entrada" },
];

export function classify(description: string, signedAmount: number): {
  type: "entrada" | "despesa";
  isPix: boolean;
  category: string | null;
} {
  for (const r of STATEMENT_RULES) {
    if (r.match.test(description)) {
      const type = r.type ?? (signedAmount >= 0 ? "entrada" : "despesa");
      return { type, isPix: !!r.isPix, category: r.category };
    }
  }
  return {
    type: signedAmount >= 0 ? "entrada" : "despesa",
    isPix: /pix/i.test(description),
    category: null,
  };
}

// ---------- OFX ----------
function parseOfxDate(raw: string): string | null {
  // OFX: YYYYMMDD ou YYYYMMDDHHMMSS
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function extractTag(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}>([^<\\r\\n]+)`, "i");
  const m = block.match(re);
  return m ? m[1].trim() : null;
}

export function parseOfx(text: string): ParsedStatementTxn[] {
  const out: ParsedStatementTxn[] = [];
  const blocks = text.split(/<STMTTRN>/i).slice(1);
  for (const raw of blocks) {
    const end = raw.indexOf("</STMTTRN>");
    const block = end >= 0 ? raw.slice(0, end) : raw;
    const dateRaw = extractTag(block, "DTPOSTED") || extractTag(block, "DTUSER");
    const amtRaw = extractTag(block, "TRNAMT");
    const memo = extractTag(block, "MEMO") || extractTag(block, "NAME") || "";
    const fitid = extractTag(block, "FITID");
    const date = dateRaw ? parseOfxDate(dateRaw) : null;
    const amt = amtRaw ? parseFloat(amtRaw.replace(",", ".")) : NaN;
    if (!date || isNaN(amt) || !memo) continue;
    const description = memo.trim();
    const cls = classify(description, amt);
    const absAmt = Math.abs(amt);
    out.push({
      date,
      description,
      amount: absAmt,
      type: cls.type,
      externalId: fitid,
      isPix: cls.isPix,
      categorySuggestion: cls.category,
      dedupHash: fitid ? `fit:${fitid}` : hashKey(date, absAmt, description),
    });
  }
  return out;
}

// ---------- CSV ----------
export function parseCsvStatement(text: string): ParsedStatementTxn[] {
  const sep = detectSeparator(text);
  const rows = parseCsv(text, sep);
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.toLowerCase().trim());

  const findIdx = (...keys: string[]) =>
    header.findIndex((h) => keys.some((k) => h.includes(k)));

  const idxDate = findIdx("data", "date");
  const idxDesc = findIdx("descri", "histor", "memo", "lan");
  const idxAmt = findIdx("valor", "amount", "montante");
  const idxId = findIdx("identif", "fitid", "id transac", "transaction id");

  if (idxDate < 0 || idxDesc < 0 || idxAmt < 0) return [];

  const out: ParsedStatementTxn[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const date = parseDate(r[idxDate] ?? "");
    const amt = parseAmount(r[idxAmt] ?? "");
    const desc = (r[idxDesc] ?? "").trim();
    if (!date || amt === null || !desc) continue;
    const externalId = idxId >= 0 ? (r[idxId] ?? "").trim() || null : null;
    const cls = classify(desc, amt);
    const absAmt = Math.abs(amt);
    out.push({
      date,
      description: desc,
      amount: absAmt,
      type: cls.type,
      externalId,
      isPix: cls.isPix,
      categorySuggestion: cls.category,
      dedupHash: externalId ? `ext:${externalId}` : hashKey(date, absAmt, desc),
    });
  }
  return out;
}

// ---------- XLSX ----------
export function parseXlsxStatement(buf: ArrayBuffer): ParsedStatementTxn[] {
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
  if (rows.length < 2) return [];

  const header = (rows[0] as string[]).map((h) => String(h ?? "").toLowerCase().trim());
  const findIdx = (...keys: string[]) =>
    header.findIndex((h) => keys.some((k) => h.includes(k)));

  const idxDate = findIdx("data", "date");
  const idxDesc = findIdx("descri", "histor", "memo", "lan");
  const idxAmt = findIdx("valor", "amount", "montante");
  const idxId = findIdx("identif", "fitid", "id transac");

  if (idxDate < 0 || idxDesc < 0 || idxAmt < 0) return [];

  const out: ParsedStatementTxn[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] as unknown[];
    if (!r || r.length === 0) continue;
    const dateRaw = String(r[idxDate] ?? "");
    const date = parseDate(dateRaw);
    const amt = parseAmount(String(r[idxAmt] ?? ""));
    const desc = String(r[idxDesc] ?? "").trim();
    if (!date || amt === null || !desc) continue;
    const externalId = idxId >= 0 ? String(r[idxId] ?? "").trim() || null : null;
    const cls = classify(desc, amt);
    const absAmt = Math.abs(amt);
    out.push({
      date,
      description: desc,
      amount: absAmt,
      type: cls.type,
      externalId,
      isPix: cls.isPix,
      categorySuggestion: cls.category,
      dedupHash: externalId ? `ext:${externalId}` : hashKey(date, absAmt, desc),
    });
  }
  return out;
}

// ---------- Entrypoint ----------
export async function parseStatementFile(
  file: File,
): Promise<{ format: StatementFormat; txns: ParsedStatementTxn[] }> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".ofx") || name.endsWith(".qfx")) {
    const text = await file.text();
    return { format: "ofx", txns: parseOfx(text) };
  }
  if (name.endsWith(".csv") || name.endsWith(".txt")) {
    const text = await file.text();
    return { format: "csv", txns: parseCsvStatement(text) };
  }
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const buf = await file.arrayBuffer();
    return { format: "xlsx", txns: parseXlsxStatement(buf) };
  }
  throw new Error("Formato não suportado. Use OFX, CSV ou XLSX.");
}
