/**
 * La hoja "Se recalculan N pagos…" antes de guardar los días de una tarjeta
 * (§22, T-06). TS puro: el título y una fila "antes → ahora" por pago.
 */

import type { CardDaysChangeItem, CardDaysPlan, PaymentPoint } from '@domain/cardDays';
import type { Month } from '@domain/calendar';
import { formatMonth, formatPaymentWhen } from '@/lib/format';

export type SheetRow = {
  key: string;
  kind: CardDaysChangeItem['kind'];
  /** Una compra de un espacio: lleva otro ícono. */
  shared: boolean;
  title: string;
  caption: string;
};

/** "Se recalculan 3 pagos de noviembre en adelante". Un pago = una compra o un fijo. */
export function sheetTitle(plan: CardDaysPlan, current: Month): string {
  const count = plan.items.length;
  const from = plan.fromMonth ?? current;
  const when = from === current ? 'este mes' : formatMonth(from, current);

  return count === 1
    ? `Se recalcula 1 pago de ${when} en adelante`
    : `Se recalculan ${count} pagos de ${when} en adelante`;
}

function when(point: PaymentPoint): string {
  return formatPaymentWhen({ date: point.date, month: point.month, approx: point.approx });
}

function titleOf(item: CardDaysChangeItem): string {
  const parts = [item.label];
  if (item.spaceName != null) parts.push(item.spaceName);

  if (item.kind === 'installments' && item.installment != null) {
    parts.push(`cuota ${item.installment.index} de ${item.installment.count}`);
  } else {
    parts.push(item.kind === 'fixed' ? 'fijo' : '1 pago');
  }
  return parts.join(' · ');
}

function captionOf(item: CardDaysChangeItem): string {
  const change = `${when(item.before)} → ${when(item.after)}`;
  const follows = item.installment != null && item.installment.index < item.installment.count;
  return follows ? `${change} · las que siguen se mueven igual` : change;
}

export function sheetRows(items: readonly CardDaysChangeItem[]): SheetRow[] {
  return items.map((item) => ({
    key: item.key,
    kind: item.kind,
    shared: item.spaceName != null,
    title: titleOf(item),
    caption: captionOf(item),
  }));
}
