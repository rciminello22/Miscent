/**
 * UX-08 · §23.2 · §4.10 · el detalle del resumen estimado de una tarjeta.
 * TS puro: se testea en node.
 *
 * "Al tocar, el detalle (compras, cuotas, fijos, partes de otros)": cada
 * número se puede abrir y muestra de qué está hecho.
 *
 * Es la lente "lo que vas a pagar" (§7.3): cada ocurrencia va por su TOTAL
 * pagado, con la parte del otro aclarada ("incluye $X de Martina"), y la suma
 * es exactamente la cifra de la fila. Nunca mezcla la lente "tu parte".
 *
 * C-05: las ocurrencias de un resumen son siempre de la tarjeta propia (N-09);
 * del otro miembro solo se muestra su parte y su nombre.
 */

import type { PersonalOccurrence } from '@domain/occurrences';
import type { Pesos } from '@domain/money';
import type { UpcomingPayment } from '@domain/upcoming';
import { formatDayMonth, formatInstallment, formatMonth } from '@/lib/format';

/** N-10 · todo resumen se rotula así, en la fila y en el detalle. */
export const ESTIMATE_NOTE = 'Estimado según lo que registraste';

export type DetailGroupKind = 'purchase' | 'installment' | 'fixed';

export type DetailLine = {
  id: string;
  /** El rótulo crudo (categoría o descripción): la pantalla lo embellece. */
  label: string;
  /** "cuota 3 de 6", o `null`. */
  note: string | null;
  /** El TOTAL pagado de esta ocurrencia. */
  amount: Pesos;
  includesOtherShare: Pesos;
  otherMemberName: string | null;
};

export type DetailGroup = {
  kind: DetailGroupKind;
  title: string;
  lines: DetailLine[];
  subtotal: Pesos;
};

export type PaymentDetail = {
  /** "Visa Galicia · vence 5 nov" · "Visa Galicia · se paga en noviembre". */
  title: string;
  estimateNote: string;
  /** T-05 · la pantalla muestra "Fechas aproximadas". */
  approximate: boolean;
  groups: DetailGroup[];
  /** Igual a la cifra de la fila. */
  total: Pesos;
  /** "incluye $X de Martina" sobre el total; `null` si no hay o hay más de una persona. */
  other: { amount: Pesos; name: string } | null;
};

const GROUPS: { kind: DetailGroupKind; title: string }[] = [
  { kind: 'purchase', title: 'Compras' },
  { kind: 'installment', title: 'Cuotas' },
  { kind: 'fixed', title: 'Fijos' },
];

/** Solo el resumen estimado de una tarjeta se abre: los demás pagos son una sola ocurrencia. */
export function canOpenPayment(payment: UpcomingPayment): boolean {
  return payment.kind === 'card-statement';
}

function groupOf(occurrence: PersonalOccurrence): DetailGroupKind {
  if (occurrence.installment != null) return 'installment';
  if (occurrence.isRecurrence) return 'fixed';
  return 'purchase';
}

function toLine(occurrence: PersonalOccurrence): DetailLine {
  return {
    id: occurrence.id,
    label: occurrence.label,
    note:
      occurrence.installment != null
        ? `cuota ${formatInstallment(occurrence.installment.index, occurrence.installment.count)}`
        : null,
    amount: occurrence.total,
    includesOtherShare: occurrence.otherShare,
    otherMemberName: occurrence.otherMemberName,
  };
}

export function paymentDetail(payment: UpcomingPayment): PaymentDetail {
  // El dominio ya rotula el resumen con el nombre de la tarjeta.
  const card = payment.label;
  const when =
    payment.date != null
      ? `vence ${formatDayMonth(payment.date)}`
      : `se paga en ${formatMonth(payment.month)}`;

  const groups: DetailGroup[] = [];
  for (const { kind, title } of GROUPS) {
    const lines = payment.items
      .filter((occurrence) => groupOf(occurrence) === kind)
      .map(toLine)
      .sort(
        (a, b) =>
          b.amount - a.amount || a.label.localeCompare(b.label, 'es') || a.id.localeCompare(b.id),
      );
    if (lines.length === 0) continue;
    groups.push({
      kind,
      title,
      lines,
      subtotal: lines.reduce((total, line) => total + line.amount, 0),
    });
  }

  const total = groups.reduce((sum, group) => sum + group.subtotal, 0);

  // Una sola persona → "incluye $X de Martina" sobre el total. Con dos distintas,
  // cada línea ya lo dice y atribuir la suma a una sería mentir.
  const names = new Set(
    payment.items
      .filter((occurrence) => occurrence.otherShare > 0 && occurrence.otherMemberName != null)
      .map((occurrence) => occurrence.otherMemberName as string),
  );
  const otherAmount = payment.items.reduce((sum, occurrence) => sum + occurrence.otherShare, 0);
  const [onlyName] = names;
  const other = names.size === 1 && onlyName != null && otherAmount > 0
    ? { amount: otherAmount, name: onlyName }
    : null;

  return {
    title: `${card} · ${when}`,
    estimateNote: ESTIMATE_NOTE,
    approximate: payment.approximate,
    groups,
    total,
    other,
  };
}
