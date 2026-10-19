import type { IsoDate } from '@domain/calendar';
import { installmentAmounts } from '@domain/installments';
import type { Pesos } from '@domain/money';
import { resolveShares, shareOf, splitInstallmentShares } from '@domain/split';
import type { PaymentMethod, PersonalFacts } from '@domain/types';
import { formatLongDate, formatPesos } from '@/lib/format';
import { spaceContext } from '@/features/spaces/departureCopy';
import { dateWithYear } from './incomeDetail';
import type { Fact } from './installmentsCycle';

/**
 * SA-02 · SA-05 · P6 · el detalle de solo lectura de un registro de un espacio
 * del que saliste. TS puro.
 *
 * Muestra SOLO lo que quedó en la foto que la persona se llevó al salir
 * (`former_memberships`): el título, su parte, el total, la fecha, el espacio y
 * las cuotas. Nada posterior a la salida y nada del otro miembro que no esté en
 * la foto. El medio de pago, únicamente si es el propio (C-05).
 *
 * No hay Editar ni Eliminar: sacar algo del historial se decide aparte.
 */

export type FormerHistoryDetail = {
  kind: 'expense' | 'payment';
  title: string;
  /** "Con gonzalo · ya no sos miembro". */
  context: string;
  /** La cifra grande: TU parte de un gasto (K9), o el monto de un pago. */
  amount: Pesos;
  /** `out` sale ("−"), `in` entra ("+"). */
  sign: 'in' | 'out';
  /** El total del gasto, en gris. `null` si es igual a tu parte o si es un pago. */
  ofTotal: Pesos | null;
  facts: Fact[];
  /** "Saliste de Con gonzalo: este gasto quedó en tu historial." */
  note: string;
};

type Membership = PersonalFacts['spaces'][number];

export function buildFormerHistoryDetail(args: {
  membership: Membership;
  /** El id del gasto o del pago, sin el prefijo de la fila. */
  sourceId: string;
  paymentMethods: readonly PaymentMethod[];
  today: IsoDate;
  /** El rótulo de una categoría o descripción tal como lo muestra la lista. */
  labelOf: (raw: string) => string;
}): FormerHistoryDetail | null {
  const { membership, sourceId, paymentMethods, today, labelOf } = args;
  // Solo de un espacio del que saliste: del resto, el detalle es el del espacio.
  if (membership.leftOn == null) return null;

  const { facts, mySlot } = membership;
  const spaceName = facts.space.name;
  const context = spaceContext(spaceName, true);
  const other = facts.space.members.find((member) => member.slot !== mySlot);

  const expense = facts.expenses.find((item) => item.id === sourceId);
  if (expense != null) {
    const shares = resolveShares(expense.amount, expense.split);
    const mine = shareOf(shares, mySlot);
    const raw = expense.description?.trim() || expense.category || null;

    const rows: Fact[] = [
      { label: 'Fecha', value: dateWithYear(expense.date, today) },
      { label: 'Espacio', value: spaceName },
      { label: 'Tu parte', value: formatPesos(mine, { sign: 'out' }) },
    ];
    if (expense.amount !== mine) {
      rows.push({ label: 'Total del gasto', value: formatPesos(expense.amount) });
    }
    if (expense.installments != null) {
      // K9 · la misma división por cuota que usa la lista (Q-09 / CA-51).
      const count = expense.installments.count;
      const amounts = installmentAmounts(expense.amount, count);
      const [first] = splitInstallmentShares(amounts, expense.amount, expense.split);
      rows.push({
        label: 'Cuotas',
        value: `${count} cuotas de ${formatPesos(first == null ? 0 : shareOf(first, mySlot))}`,
      });
    }
    // C-05 · el medio es privado de quien pagó: solo si pagaste vos, y el tuyo.
    if (expense.payerSlot === mySlot) {
      const detail = membership.paymentDetails.find(
        (item) => item.sourceId === expense.id && item.slot === mySlot,
      );
      const method = paymentMethods.find((item) => item.id === detail?.paymentMethodId);
      if (method != null) rows.push({ label: 'Medio', value: method.name });
    }

    return {
      kind: 'expense',
      title: raw == null ? `Gasto del ${formatLongDate(expense.date)}` : labelOf(raw),
      context,
      amount: mine,
      sign: 'out',
      ofTotal: expense.amount !== mine ? expense.amount : null,
      facts: rows,
      note: `Saliste de ${spaceName}: este gasto quedó en tu historial.`,
    };
  }

  const payment = facts.payments.find((item) => item.id === sourceId);
  if (payment != null) {
    const received = payment.toSlot === mySlot;
    const otherName = other?.displayName ?? 'la otra persona';

    return {
      kind: 'payment',
      title: received ? `${otherName} te pagó` : `Le pagaste a ${otherName}`,
      context,
      amount: payment.amount,
      sign: received ? 'in' : 'out',
      ofTotal: null,
      facts: [
        { label: 'Fecha', value: dateWithYear(payment.date, today) },
        { label: 'Espacio', value: spaceName },
      ],
      note: `Saliste de ${spaceName}: este pago quedó en tu historial.`,
    };
  }

  return null;
}
