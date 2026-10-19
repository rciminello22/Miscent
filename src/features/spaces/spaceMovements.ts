import { addDays, parseDate, type IsoDate } from '@domain/calendar';
import type { SpaceOccurrence } from '@domain/occurrences';
import type { MemberPayment, Slot } from '@domain/types';
import { formatDayMonth, formatLongDate } from '@/lib/format';

/**
 * Los movimientos del espacio (§24 / §25): gastos Y pagos entre miembros, por
 * fecha. TS puro: los usan la puerta de Movimientos, su pantalla y la de
 * Pendientes.
 */

export type SpaceMovement =
  | { kind: 'occurrence'; date: IsoDate; occurrence: SpaceOccurrence }
  | { kind: 'payment'; date: IsoDate; payment: MemberPayment };

/**
 * Solo lo que ya pasó, igual que el saldo (S-02): lo que viene está en "Se
 * vienen este mes" y en los próximos meses del Detalle del mes. Del más
 * reciente al más viejo.
 */
export function buildSpaceMovements(input: {
  occurrences: readonly SpaceOccurrence[];
  payments: readonly MemberPayment[];
  today: IsoDate;
}): SpaceMovement[] {
  const expenses: SpaceMovement[] = input.occurrences
    .filter((occurrence) => occurrence.balanceDate <= input.today)
    .map((occurrence) => ({ kind: 'occurrence', date: occurrence.balanceDate, occurrence }));
  const payments: SpaceMovement[] = input.payments
    .filter((payment) => payment.date <= input.today)
    .map((payment) => ({ kind: 'payment', date: payment.date, payment }));

  // `sort` es estable: a igual fecha se respeta el orden de entrada.
  return [...expenses, ...payments].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/**
 * Opción B · la marca de "para revisar" va UNA vez por registro, en su
 * ocurrencia más reciente: un fijo tiene una por mes, y marcarlas todas es ruido.
 */
export function taggedOccurrenceIds(
  movements: readonly SpaceMovement[],
  pendingSourceIds: { has(sourceId: string): boolean },
): Set<string> {
  const tagged = new Set<string>();
  const seen = new Set<string>();
  for (const movement of movements) {
    if (movement.kind !== 'occurrence') continue;
    const { sourceId, id } = movement.occurrence;
    if (!pendingSourceIds.has(sourceId) || seen.has(sourceId)) continue;
    seen.add(sourceId);
    tagged.add(id);
  }
  return tagged;
}

/** Agrupa por día conservando el orden en que vienen (ya ordenados por fecha). */
export function groupMovementsByDay(
  movements: readonly SpaceMovement[],
): { date: IsoDate; movements: SpaceMovement[] }[] {
  const groups: { date: IsoDate; movements: SpaceMovement[] }[] = [];
  for (const movement of movements) {
    const last = groups[groups.length - 1];
    if (last != null && last.date === movement.date) last.movements.push(movement);
    else groups.push({ date: movement.date, movements: [movement] });
  }
  return groups;
}

/** El encabezado de cada día: "Hoy", "Ayer" o "8 de octubre" (con el año si es otro). */
export function dayHeading(date: IsoDate, today: IsoDate): string {
  if (date === today) return 'Hoy';
  if (date === addDays(today, -1)) return 'Ayer';
  const year = parseDate(date).year;
  const text = formatLongDate(date);
  return year === parseDate(today).year ? text : `${text} de ${year}`;
}

/** La línea de la puerta de Movimientos: "12 · último: Supermercado, hoy". */
export function movementsDoorCaption(input: {
  count: number;
  last: { label: string; date: IsoDate } | null;
  today: IsoDate;
}): string {
  if (input.count === 0 || input.last == null) return 'Todavía no hay movimientos';

  let when = formatDayMonth(input.last.date);
  if (input.last.date === input.today) when = 'hoy';
  else if (input.last.date === addDays(input.today, -1)) when = 'ayer';

  return `${input.count} · último: ${input.last.label}, ${when}`;
}

/** El título de un pago entre miembros, sin signos de deuda. */
export function paymentTitle(payment: MemberPayment, mySlot: Slot, otherName: string): string {
  return payment.fromSlot === mySlot ? 'Tu pago' : `Pago de ${otherName}`;
}

/**
 * 15 · el título de un pago en la lista del espacio, sin la cifra: el monto va
 * aparte, con su signo ("+$20.000" / "−$20.000").
 */
export function paymentRowTitle(payment: MemberPayment, mySlot: Slot, otherName: string): string {
  return payment.fromSlot === mySlot ? `Le pagaste a ${otherName}` : `${otherName} te pagó`;
}

/** 15 · entra o sale según QUIEN MIRA: el mismo pago lo ve el otro al revés. */
export function paymentDirectionOf(payment: MemberPayment, mySlot: Slot): 'received' | 'sent' {
  return payment.toSlot === mySlot ? 'received' : 'sent';
}

/** P-04 · dentro del espacio, la segunda línea de todo pago entre miembros. */
export const PAYMENT_CAPTION = 'Entre ustedes · no cambia tu radar';

/**
 * 15 · la cifra de un gasto en la lista del espacio: TU PARTE arriba (K9) y el
 * total en gris, sin signo ("−$50.000" y "de $100.000"). Lo mismo que dice
 * Movimientos: el listado no puede decir otra cosa en un lado y en el otro.
 */
export function occurrenceFigures(
  occurrence: SpaceOccurrence,
  mySlot: Slot,
): { amount: number; ofTotal: number | null } {
  const mine = mySlot === 1 ? occurrence.shares.slot1 : occurrence.shares.slot2;
  return { amount: mine, ofTotal: mine === occurrence.amount ? null : occurrence.amount };
}

/**
 * K3 · quién cargó y quién editó un registro. Un registro de antes de guardar
 * quién lo cargó no se inventa.
 */
export function authorshipLine(
  author: { createdBySlot: Slot | null; updatedBySlot: Slot | null },
  mySlot: Slot,
  otherName: string,
): string | null {
  if (author.createdBySlot == null) return null;

  const created = author.createdBySlot === mySlot ? 'Lo cargaste vos' : `Lo cargó ${otherName}`;
  if (author.updatedBySlot == null || author.updatedBySlot === author.createdBySlot) return created;

  const edited = author.updatedBySlot === mySlot ? 'lo editaste vos' : `lo editó ${otherName}`;
  return `${created} · ${edited}`;
}

/** Los pagos no se editan: solo quién los registró. */
export function paymentAuthorshipLine(recordedBySlot: Slot, mySlot: Slot, otherName: string): string {
  return recordedBySlot === mySlot ? 'Lo registraste vos' : `Lo registró ${otherName}`;
}
