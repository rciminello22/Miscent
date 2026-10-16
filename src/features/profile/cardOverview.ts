/**
 * Tarjetas desde Perfil (P24, §22). TS puro: la puerta de cada tarjeta, su
 * detalle y la regla de cuándo se puede eliminar.
 *
 * La tarjeta es un medio para organizar compromisos, no una cuenta (T-01): acá
 * nunca hay número, límite, pago mínimo ni intereses. Y se ve solo en lo
 * personal (C-05).
 */

import { monthOf, type Month } from '@domain/calendar';
import type { Pesos } from '@domain/money';
import type { PersonalExpansion } from '@domain/occurrences';
import type { PaymentMethod, PersonalFacts } from '@domain/types';
import { upcomingFrom, type UpcomingPayment } from '@domain/upcoming';
import { formatMonth, formatPaymentWhen } from '@/lib/format';
import { paymentLabel } from '@/features/upcoming/paymentLabel';
import {
  paymentDetail,
  type DetailGroup,
  type DetailGroupKind,
} from '@/features/upcoming/statementDetail';

/* ── La lista y el detalle ────────────────────────────────────────────────── */

/** Los próximos resúmenes de UNA tarjeta, desde hoy y en orden de fecha. */
export function cardStatements(
  payments: readonly UpcomingPayment[],
  cardId: string,
  today: string,
): UpcomingPayment[] {
  return upcomingFrom(
    payments.filter((payment) => payment.kind === 'card-statement' && payment.cardId === cardId),
    today,
  );
}

/**
 * La puerta de cada tarjeta: su próximo resumen estimado (N-10). T-02 · una
 * fecha de "Más o menos" lleva "~" y "(aprox.)"; T-05 · sin día, el mes.
 */
export function cardDoorLine(
  next: UpcomingPayment | null,
  formatAmount: (amount: Pesos) => string,
): string {
  if (next == null) return 'Sin resumen por venir';

  const when = formatPaymentWhen({ date: next.date, month: next.month, approx: next.dateApprox });
  // El rótulo corto de N-10, sin repetir el nombre de la tarjeta (el título de la puerta).
  const label = paymentLabel({ label: '', isEstimate: true }).replace(/^ · /, '');
  return [when, next.dateApprox ? `${label} (aprox.)` : label, formatAmount(next.amount)].join(' · ');
}

export type StatementBar = {
  month: Month;
  date: string | null;
  amount: Pesos;
  /** Respecto del mayor de las barras: la más alta es 1. */
  ratio: number;
};

/** Las barras de los próximos vencimientos, proporcionales entre sí. */
export function statementBars(statements: readonly UpcomingPayment[], count: number): StatementBar[] {
  const shown = statements.slice(0, count);
  const max = Math.max(0, ...shown.map((statement) => statement.amount));

  return shown.map((statement) => ({
    month: statement.month,
    date: statement.date,
    amount: statement.amount,
    ratio: max > 0 ? statement.amount / max : 0,
  }));
}

export type CardGroupDoor = {
  kind: DetailGroupKind;
  title: string;
  count: number;
  subtotal: Pesos;
};

/** Todo lo de los próximos resúmenes, agrupado como el detalle de un resumen. */
function mergedGroups(statements: readonly UpcomingPayment[]): DetailGroup[] {
  const [first] = statements;
  if (first == null) return [];

  const merged: UpcomingPayment = {
    ...first,
    items: statements.flatMap((statement) => statement.items),
  };
  return paymentDetail(merged).groups;
}

/**
 * Las puertas Compras, Cuotas y Fijos de la tarjeta: todo lo que hay en sus
 * próximos resúmenes. Las vacías no van.
 */
export function cardGroupDoors(statements: readonly UpcomingPayment[]): CardGroupDoor[] {
  return mergedGroups(statements).map((group) => ({
    kind: group.kind,
    title: group.title,
    count: group.lines.length,
    subtotal: group.subtotal,
  }));
}

/** El N3 de una puerta: sus líneas, por el total que se paga (§7.3). */
export function cardGroup(
  statements: readonly UpcomingPayment[],
  kind: DetailGroupKind,
): DetailGroup | null {
  return mergedGroups(statements).find((group) => group.kind === kind) ?? null;
}

/** El cierre y el vencimiento como pastillas de la cabecera. T-02 · T-05. */
export function cardDayPills(card: PaymentMethod): [string, string] {
  const pill = (
    verb: string,
    noun: string,
    day: number | null,
    approx: boolean,
  ): string => {
    if (day == null) return `${noun} sin dato`;
    return approx ? `${verb} el ~${day} · aprox.` : `${verb} el ${day}`;
  };

  return [
    pill('Cierra', 'Cierre', card.closingDay, card.closingApprox),
    pill('Vence', 'Vencimiento', card.dueDay, card.dueApprox),
  ];
}

/* ── Eliminar (P24) ───────────────────────────────────────────────────────── */

export type CardRetentionReason =
  | { kind: 'purchases'; count: number; untilMonth: Month }
  | { kind: 'installments'; plans: number; untilMonth: Month }
  | { kind: 'fixed'; labels: string[] }
  | { kind: 'statement'; untilMonth: Month };

function planKey(occurrenceId: string): string {
  return occurrenceId.replace(/:q\d+$/, '');
}

function latest(months: readonly Month[]): Month {
  return [...months].sort().slice(-1)[0] ?? '';
}

/**
 * P24 · una tarjeta con pagos por venir no se elimina. Tiene pagos por venir si
 * le quedan cuotas, fijos activos, compras cuyo resumen todavía no venció o un
 * resumen declarado sin vencer.
 *
 * "Todavía no venció" se mide por MES: un resumen que vence este mes cuenta
 * hasta fin de mes. Sin una tarjeta, esas compras pasan a contarse al contado
 * en su mes de compra; esperar a que el mes termine garantiza que lo único que
 * se mueve es un mes que ya pasó y no se ve en ninguna pantalla.
 */
export function cardRetention(
  facts: PersonalFacts,
  expansion: PersonalExpansion,
  cardId: string,
  today: string,
): { retained: boolean; reasons: CardRetentionReason[] } {
  const current = monthOf(today);
  const mine = expansion.occurrences.filter(
    (occurrence) =>
      occurrence.payerIsMe &&
      occurrence.cardId === cardId &&
      !occurrence.id.startsWith('statement:') &&
      occurrence.month >= current,
  );

  const reasons: CardRetentionReason[] = [];

  const purchases = mine.filter(
    (occurrence) => occurrence.installment == null && !occurrence.isRecurrence,
  );
  if (purchases.length > 0) {
    reasons.push({
      kind: 'purchases',
      count: purchases.length,
      untilMonth: latest(purchases.map((occurrence) => occurrence.month)),
    });
  }

  const installments = mine.filter((occurrence) => occurrence.installment != null);
  if (installments.length > 0) {
    reasons.push({
      kind: 'installments',
      plans: new Set(installments.map((occurrence) => planKey(occurrence.id))).size,
      untilMonth: latest(installments.map((occurrence) => occurrence.month)),
    });
  }

  // Fijos personales con esta tarjeta que siguen vigentes, y los compartidos que
  // paga el usuario con ella (esos salen de las ocurrencias).
  const fixed = new Set<string>();
  for (const recurrence of facts.recurrences) {
    if (recurrence.kind !== 'expense' || recurrence.spaceId != null) continue;
    if (recurrence.paymentMethodId !== cardId) continue;
    if (recurrence.endMonth != null && recurrence.endMonth < current) continue;
    fixed.add(recurrence.description ?? recurrence.category);
  }
  for (const occurrence of mine) {
    if (occurrence.isRecurrence && occurrence.spaceId != null) fixed.add(occurrence.label);
  }
  if (fixed.size > 0) reasons.push({ kind: 'fixed', labels: [...fixed] });

  const declared = facts.declaredStatements.filter(
    (statement) => statement.paymentMethodId === cardId && monthOf(statement.dueDate) >= current,
  );
  if (declared.length > 0) {
    reasons.push({
      kind: 'statement',
      untilMonth: latest(declared.map((statement) => monthOf(statement.dueDate))),
    });
  }

  return { retained: reasons.length > 0, reasons };
}

/** Qué la retiene y hasta cuándo, una línea por motivo. */
export function retentionLines(reasons: readonly CardRetentionReason[], today: Month): string[] {
  return reasons.map((reason) => {
    switch (reason.kind) {
      case 'purchases':
        return `Tiene ${reason.count === 1 ? '1 compra' : `${reason.count} compras`} en un resumen que todavía no venció, hasta ${formatMonth(reason.untilMonth, today)}.`;
      case 'installments':
        return `Tiene ${reason.plans === 1 ? '1 compra' : `${reason.plans} compras`} en cuotas, hasta ${formatMonth(reason.untilMonth, today)}.`;
      case 'fixed':
        return reason.labels.length === 1
          ? `Tiene un fijo activo: ${reason.labels[0]}.`
          : `Tiene fijos activos: ${reason.labels.join(', ')}.`;
      case 'statement':
        return `Tiene un resumen pendiente que declaraste, hasta ${formatMonth(reason.untilMonth, today)}.`;
    }
  });
}

/** La confirmación cuando no hay nada por venir. */
export function deleteConfirmation(name: string): { title: string; message: string } {
  return {
    title: `¿Eliminar ${name}?`,
    message:
      'Sus compras pasadas quedan en Movimientos, sin tarjeta. Tus meses pasados no cambian.',
  };
}
