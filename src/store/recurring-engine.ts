// Fase 1.1 — Motor de Recorrências (edge cases)
// Critérios cobertos:
// - Meses com menos dias: dia 31 em mês de 30 dias → último dia válido (clamp)
// - paused_until: ignora ocorrências enquanto pausada
// - skip_dates: pula ocorrências específicas sem afetar as próximas
import type { Recurring, RecurringFrequency } from "./types";

export const ymd = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

export const parseISO = (iso: string): Date => new Date(iso + "T12:00:00");

const lastDayOfMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

/**
 * Avança a data conforme a frequência. Para 'monthly' e 'yearly', se o dia
 * do mês original (anchorDay) não existir no novo mês (ex.: 31/Fev),
 * retorna o último dia válido (clamp), nunca pula o mês.
 */
export function advanceDate(
  current: Date,
  frequency: RecurringFrequency,
  anchorDay: number,
): Date {
  if (frequency === "daily") {
    const d = new Date(current);
    d.setDate(d.getDate() + 1);
    return d;
  }
  if (frequency === "weekly") {
    const d = new Date(current);
    d.setDate(d.getDate() + 7);
    return d;
  }
  if (frequency === "monthly") {
    const y = current.getFullYear();
    const m = current.getMonth() + 1;
    const ny = m > 11 ? y + 1 : y;
    const nm = m > 11 ? 0 : m;
    const day = Math.min(anchorDay, lastDayOfMonth(ny, nm));
    return new Date(ny, nm, day, 12, 0, 0);
  }
  if (frequency === "yearly") {
    const ny = current.getFullYear() + 1;
    const nm = current.getMonth();
    const day = Math.min(anchorDay, lastDayOfMonth(ny, nm));
    return new Date(ny, nm, day, 12, 0, 0);
  }
  return current;
}

/**
 * Gera a lista de ocorrências de uma recorrência entre [from, to].
 * Aplica todos os edge-cases (clamp, paused_until, skip_dates, end_date).
 */
export function occurrencesBetween(
  rec: Recurring,
  from: Date,
  to: Date,
): string[] {
  if (!rec.active) return [];

  const start = parseISO(rec.startDate);
  const end = rec.endDate ? parseISO(rec.endDate) : null;
  const pausedUntil = rec.pausedUntil ? parseISO(rec.pausedUntil) : null;
  const skipSet = new Set(rec.skipDates ?? []);
  const anchorDay = start.getDate();

  const out: string[] = [];
  let cursor = new Date(start);
  // Avança até alcançar 'from' (sem ultrapassar 'to')
  let safety = 0;
  while (cursor < from && safety++ < 5000) {
    cursor = advanceDate(cursor, rec.frequency, anchorDay);
  }

  safety = 0;
  while (cursor <= to && safety++ < 5000) {
    if (end && cursor > end) break;
    const dateStr = ymd(cursor);
    const skip = skipSet.has(dateStr);
    const paused = pausedUntil && cursor <= pausedUntil;
    if (!skip && !paused) {
      out.push(dateStr);
    }
    cursor = advanceDate(cursor, rec.frequency, anchorDay);
  }
  return out;
}

/**
 * Retorna as próximas N ocorrências a partir de 'from' (default: hoje).
 */
export function nextOccurrences(
  rec: Recurring,
  count: number,
  from: Date = new Date(),
): string[] {
  if (!rec.active) return [];
  const start = parseISO(rec.startDate);
  const end = rec.endDate ? parseISO(rec.endDate) : null;
  const pausedUntil = rec.pausedUntil ? parseISO(rec.pausedUntil) : null;
  const skipSet = new Set(rec.skipDates ?? []);
  const anchorDay = start.getDate();

  const fromMid = new Date(from);
  fromMid.setHours(0, 0, 0, 0);

  let cursor = new Date(start);
  let safety = 0;
  while (cursor < fromMid && safety++ < 10000) {
    cursor = advanceDate(cursor, rec.frequency, anchorDay);
  }

  const out: string[] = [];
  safety = 0;
  while (out.length < count && safety++ < 10000) {
    if (end && cursor > end) break;
    const dateStr = ymd(cursor);
    const skip = skipSet.has(dateStr);
    const paused = pausedUntil && cursor <= pausedUntil;
    if (!skip && !paused) out.push(dateStr);
    cursor = advanceDate(cursor, rec.frequency, anchorDay);
  }
  return out;
}
