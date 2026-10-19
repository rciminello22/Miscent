import { isSameMonth, type IsoDate, type Month } from '@domain/calendar';
import { resolveCardPayment } from '@domain/cards';
import { installmentAmounts } from '@domain/installments';
import type { Pesos } from '@domain/money';
import { pendingReview } from '@domain/review';
import { resolveShares, shareOf, splitInstallmentShares } from '@domain/split';
import type { Category, PaymentMethod, PersonalFacts } from '@domain/types';
import { reviewTag } from '@/features/spaces/reviewCopy';
import { spaceContext } from '@/features/spaces/departureCopy';

/**
 * §16 · la lista de Movimientos.
 *
 * Acá se juntan tres cosas que en el modelo viven separadas, y el criterio de
 * unión lo da la spec:
 *
 *   - gastos e ingresos personales
 *   - gastos COMPARTIDOS, con "Casa · pagó Martina" y el monto principal igual
 *     a **tu parte**, con el total en gris ("de $100.000")
 *   - pagos entre miembros, con la nota "no cambia tu radar" (P-04)
 *
 * Dos reglas que son fáciles de violar sin darse cuenta:
 *
 * 1. **Se listan HECHOS, no ocurrencias.** §16: "Compra en cuotas: una sola
 *    vez, en su fecha de compra". Las cuotas se ven mes a mes en Futuro.
 * 2. **De un gasto compartido, el monto principal es TU PARTE** (K9, §7.3
 *    lente "tu parte"). El total va en gris porque es contexto, no la cifra
 *    que te toca.
 */

export type MovementRow = {
  id: string;
  kind: 'personal-expense' | 'personal-income' | 'shared-expense' | 'member-payment';
  label: string;
  date: IsoDate;
  /** La cifra principal: de un gasto compartido es TU parte (K9). */
  amount: Pesos;
  /** §16 · el total del gasto compartido, "de $100.000", en gris. */
  total: Pesos | null;
  /** §16 · "Casa · pagó Martina" */
  context: string | null;
  /** La categoría, que da el ícono de la fila. `null` en un pago entre miembros. */
  category: Category | null;
  /** "Casa" o "Casa · ya no sos miembro". `null` en lo personal. */
  spaceName: string | null;
  /** "pagó vos" / "pagó Martina". `null` si no es un gasto compartido. */
  payerLabel: string | null;
  /** §16 · "1 pago · se paga en noviembre", "6 cuotas de $30.000", "Ingreso registrado". */
  effect: string | null;
  /** Qué clase de efecto es, para elegir su ícono. `method` es solo el nombre del medio. */
  effectKind: 'installments' | 'card' | 'income' | 'method' | null;
  /** §12 · el ícono de una o dos personas en cada fila. */
  audience: { kind: 'private' } | { kind: 'shared'; otherMemberName: string };
  spaceId: string | null;
  /** P-04 · un pago entre miembros no cambia el radar, y se dice. */
  note: string | null;
  /** Solo los hechos propios se pueden eliminar desde acá. */
  deletable: boolean;
  /** Opción B · "Lo cargó Martina · para revisar". `null` si no hay nada que revisar. */
  reviewTag: string | null;
  /** SA-05 · de un espacio del que ya saliste: no se puede abrir (SA-02). */
  formerSpace: boolean;
};

export type MovementFilter = 'all' | 'personal' | string;

function cardEffect(
  method: PaymentMethod | undefined,
  date: IsoDate,
  monthName: (month: Month) => string,
): string | null {
  if (method == null || method.kind !== 'card') return null;
  const schedule = resolveCardPayment(method, date);
  // Siempre dicho igual: "1 pago · se paga en noviembre" (las cuotas, "6 cuotas de $30.000").
  return `1 pago · se paga en ${monthName(schedule.month)}`;
}

export function buildMovementList(args: {
  facts: PersonalFacts;
  month: Month;
  /** Se inyecta para que este módulo no dependa del formato. */
  monthName: (month: Month) => string;
  formatAmount: (amount: Pesos) => string;
}): MovementRow[] {
  const { facts, month, monthName, formatAmount } = args;
  const rows: MovementRow[] = [];

  /* ── Personales ───────────────────────────────────────────────────────── */

  for (const movement of facts.movements) {
    if (!isSameMonth(movement.date, month)) continue;

    const method = facts.paymentMethods.find((item) => item.id === movement.paymentMethodId);

    let effect: string | null = null;
    let effectKind: MovementRow['effectKind'] = null;
    if (movement.kind === 'income') {
      effect = 'Ingreso registrado';
      effectKind = 'income';
    } else if (movement.installments != null) {
      const [first] = installmentAmounts(movement.amount, movement.installments.count);
      effect = `${movement.installments.count} cuotas de ${formatAmount(first ?? 0)}`;
      effectKind = 'installments';
    } else {
      const onCard = cardEffect(method, movement.date, monthName);
      effect = onCard ?? method?.name ?? null;
      effectKind = onCard != null ? 'card' : method != null ? 'method' : null;
    }

    rows.push({
      id: `movement:${movement.id}`,
      kind: movement.kind === 'income' ? 'personal-income' : 'personal-expense',
      label: movement.description ?? movement.category,
      date: movement.date,
      amount: movement.amount,
      total: null,
      context: null,
      category: movement.category,
      spaceName: null,
      payerLabel: null,
      effect,
      effectKind,
      audience: { kind: 'private' },
      spaceId: null,
      note: null,
      deletable: true,
      // Lo propio nunca es para revisar.
      reviewTag: null,
      formerSpace: false,
    });
  }

  /* ── Compartidos ──────────────────────────────────────────────────────── */

  for (const membership of facts.spaces) {
    const { facts: spaceFacts, mySlot } = membership;
    const other = spaceFacts.space.members.find((member) => member.slot !== mySlot)!;
    // SA-05 · "Casa · ya no sos miembro" si salió.
    const spaceName = spaceContext(spaceFacts.space.name, membership.leftOn != null);
    const formerSpace = membership.leftOn != null;
    // Opción B · lo que cargó el otro y todavía no revisé.
    const pending = pendingReview(spaceFacts, mySlot, membership.reviews);
    const tagFor = (sourceId: string) => {
      const reason = pending.get(sourceId);
      return reason == null ? null : reviewTag(other.displayName, reason);
    };

    for (const expense of spaceFacts.expenses) {
      // §16 · el gasto aparece UNA vez, en su fecha de compra.
      if (!isSameMonth(expense.date, month)) continue;

      const shares = resolveShares(expense.amount, expense.split);
      const myShare = shareOf(shares, mySlot);
      const iPaid = expense.payerSlot === mySlot;

      // C-05 · el medio de pago solo lo conozco si lo pagué yo.
      const detail = iPaid
        ? membership.paymentDetails.find(
            (item) => item.sourceId === expense.id && item.slot === mySlot,
          )
        : undefined;
      const method = facts.paymentMethods.find((item) => item.id === detail?.paymentMethodId);

      let effect: string | null = null;
      let effectKind: MovementRow['effectKind'] = null;
      if (expense.installments != null) {
        // K9 · la cifra principal es tu parte, así que la cuota también: la
        // misma división por cuota que usa el dominio (Q-09 / CA-51).
        const count = expense.installments.count;
        const amounts = installmentAmounts(expense.amount, count);
        const [firstShares] = splitInstallmentShares(amounts, expense.amount, expense.split);
        const mine = firstShares == null ? 0 : shareOf(firstShares, mySlot);
        effect = `${count} cuotas de ${formatAmount(mine)}`;
        effectKind = 'installments';
      } else if (iPaid) {
        effect = cardEffect(method, expense.date, monthName);
        effectKind = effect != null ? 'card' : null;
      }
      const payerLabel = `pagó ${iPaid ? 'vos' : other.displayName}`;

      rows.push({
        id: `shared:${expense.id}`,
        kind: 'shared-expense',
        label: expense.description ?? expense.category,
        date: expense.date,
        // K9 · la cifra principal es tu parte.
        amount: myShare,
        total: expense.amount,
        // §16 · "Casa · pagó Martina"
        context: `${spaceName} · ${payerLabel}`,
        category: expense.category,
        spaceName,
        payerLabel,
        effect,
        effectKind,
        audience: { kind: 'shared', otherMemberName: other.displayName },
        spaceId: spaceFacts.space.id,
        note: null,
        deletable: false,
        reviewTag: tagFor(expense.id),
        formerSpace,
      });
    }

    /* §16 · "Casa · Martina te pagó $20.000" con "no cambia tu radar". */
    for (const payment of spaceFacts.payments) {
      if (!isSameMonth(payment.date, month)) continue;

      const received = payment.toSlot === mySlot;

      rows.push({
        id: `payment:${payment.id}`,
        kind: 'member-payment',
        label: received
          ? `${other.displayName} te pagó`
          : `Le pagaste a ${other.displayName}`,
        date: payment.date,
        amount: payment.amount,
        total: null,
        context: spaceName,
        category: null,
        spaceName,
        payerLabel: null,
        effect: null,
        effectKind: null,
        audience: { kind: 'shared', otherMemberName: other.displayName },
        spaceId: spaceFacts.space.id,
        // P-04 · la nota que evita el malentendido.
        note: 'no cambia tu radar',
        deletable: false,
        reviewTag: tagFor(payment.id),
        formerSpace,
      });
    }
  }

  return rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/**
 * §16 · "Filtros: Todos · Personales · uno por espacio". Con `day`, además, solo
 * los registros de esa fecha: el mini calendario abre la lista de un día y el
 * filtro se compone con el segmentado.
 */
export function filterMovements(
  rows: readonly MovementRow[],
  filter: MovementFilter,
  day?: IsoDate | null,
): MovementRow[] {
  const ofDay = day == null ? rows : rows.filter((row) => row.date === day);
  if (filter === 'all') return [...ofDay];
  if (filter === 'personal') return ofDay.filter((row) => row.spaceId == null);
  // Todos los espacios juntos (la puerta que los resume, con dos o más).
  if (filter === 'shared') return ofDay.filter((row) => row.spaceId != null);
  return ofDay.filter((row) => row.spaceId === filter);
}

/** Los espacios que aparecen en el mes, para armar los chips de filtro. */
export function spacesInMonth(
  facts: PersonalFacts,
  month: Month,
): { id: string; name: string }[] {
  return facts.spaces
    .filter((membership) => {
      const hasExpense = membership.facts.expenses.some((expense) =>
        isSameMonth(expense.date, month),
      );
      const hasPayment = membership.facts.payments.some((payment) =>
        isSameMonth(payment.date, month),
      );
      const hasRecurrence = membership.facts.recurrences.some(
        (recurrence) => recurrence.startMonth <= month,
      );
      return hasExpense || hasPayment || hasRecurrence;
    })
    .map((membership) => ({
      id: membership.facts.space.id,
      name: membership.facts.space.name,
    }));
}
