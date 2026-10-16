/**
 * UX-10 · §23.1 · §33 · N-08 · el "Sin asignar" de un mes futuro. TS puro.
 *
 * Es el mismo riesgo que en Inicio (D1): una cifra grande que se lee como plata
 * disponible. Por eso lleva su ayuda, y en negativo no se muestra "−$X" sino la
 * frase de N-08 (misma construcción que RADAR_COPY.exceeds, con "previstos").
 */

import type { FutureMonth } from '@domain/future';

export const FUTURE_COPY = {
  unassigned: {
    label: 'Sin asignar',
    /** §33 · "Sin asignar · según tus ingresos previstos". */
    help: 'todavía sin destino, según tus ingresos previstos',
  },
  /** CA-38 · el ingreso previsto del mes, a la vista bajo la cifra comprometida. */
  incomePlanned: 'Ingreso previsto',
  /** N-08 adaptada a un mes futuro. Sin alarma. */
  exceeds: 'Tus gastos y compromisos superan tus ingresos previstos por',
  /** §23.1 · sin ingreso previsto no se calcula. */
  noIncome: 'Sin ingreso registrado',
} as const;

export type BreakdownRow = { key: string; label: string; amount: number; note: string | null };

/**
 * §23.1 · el desglose al tocar el mes: Fijos · Cuotas · Tarjetas (el resumen
 * estimado de cada una) · De tus espacios (tu parte). Lente "tu parte" (§7.3).
 * Lo que está en cero no se muestra. Una tarjeta que ya no existe es "Tarjeta":
 * nunca su id.
 */
export function breakdownRows(
  breakdown: FutureMonth['breakdown'],
  cardNames: ReadonlyMap<string, string>,
): BreakdownRow[] {
  const rows: BreakdownRow[] = [
    { key: 'fixed', label: 'Fijos', amount: breakdown.fixed, note: null },
    { key: 'installments', label: 'Cuotas', amount: breakdown.installments, note: null },
    ...[...breakdown.cards]
      .sort((a, b) => b.amount - a.amount)
      .map((card) => ({
        key: `card:${card.cardId}`,
        label: cardNames.get(card.cardId) ?? 'Tarjeta',
        amount: card.amount,
        note: 'resumen estimado' as string | null,
      })),
    { key: 'spaces', label: 'De tus espacios', amount: breakdown.fromSpaces, note: 'tu parte' },
  ];

  return rows.filter((row) => row.amount > 0);
}

export type FutureUnassignedCopy =
  | { kind: 'unassigned'; label: string; help: string; amount: number }
  | { kind: 'exceeds'; text: string; amount: number }
  | { kind: 'noIncome'; text: string };

/** `unassigned` es el de `FutureMonth`: `null` cuando no hay ingreso previsto. */
export function futureUnassignedCopy(unassigned: number | null): FutureUnassignedCopy {
  if (unassigned == null) return { kind: 'noIncome', text: FUTURE_COPY.noIncome };

  if (unassigned < 0) {
    return { kind: 'exceeds', text: FUTURE_COPY.exceeds, amount: -unassigned };
  }

  return {
    kind: 'unassigned',
    label: FUTURE_COPY.unassigned.label,
    help: FUTURE_COPY.unassigned.help,
    amount: unassigned,
  };
}
