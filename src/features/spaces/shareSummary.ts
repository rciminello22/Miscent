/**
 * Should 3 · el resumen del espacio como texto, para compartir (WhatsApp).
 *
 * Se lee FUERA de la app, por el otro miembro o por quien sea: va en tercera
 * persona y con los nombres. "Martina te debe" en el teléfono de Martina
 * diría lo contrario de lo que es.
 *
 * Solo lo que los dos ya ven en el espacio (§12): el saldo, el mes y lo
 * cargado. Nunca un medio de pago (C-05): esta función ni lo recibe.
 */

import type { IsoDate } from '@domain/calendar';
import type { Pesos } from '@domain/money';
import { formatDayMonth, formatPesos } from '@/lib/format';

const MAX_LINES = 15;

const pesos = (amount: Pesos) => formatPesos(amount, { sign: 'never' });

export function spaceSummaryText(input: {
  spaceName: string;
  monthName: string;
  myName: string;
  otherName: string;
  /** Visto por quien comparte: positivo, el otro le debe. */
  balance: { amount: Pesos; settled: boolean };
  month: { total: Pesos; mine: { put: Pesos; share: Pesos }; other: { put: Pesos; share: Pesos } };
  /** Lo del mes que ya pasó, del más reciente al más viejo. */
  expenses: readonly { date: IsoDate; label: string; amount: Pesos; payerName: string }[];
  payments: readonly { date: IsoDate; fromName: string; toName: string; amount: Pesos }[];
}): string {
  const { myName, otherName, balance, month } = input;
  const lines: string[] = [`${input.spaceName} · ${input.monthName}`, ''];

  lines.push(
    balance.settled
      ? 'Están a mano.'
      : balance.amount > 0
        ? `${otherName} le debe ${pesos(balance.amount)} a ${myName}.`
        : `${myName} le debe ${pesos(balance.amount)} a ${otherName}.`,
  );

  if (month.total > 0) {
    lines.push(
      '',
      `Gastos compartidos de ${input.monthName} hasta hoy: ${pesos(month.total)}`,
      `· ${myName} puso ${pesos(month.mine.put)} (su parte, ${pesos(month.mine.share)})`,
      `· ${otherName} puso ${pesos(month.other.put)} (su parte, ${pesos(month.other.share)})`,
    );
  }

  if (input.expenses.length > 0) {
    lines.push('', 'Lo que se cargó:');
    for (const item of input.expenses.slice(0, MAX_LINES)) {
      lines.push(`${formatDayMonth(item.date)} · ${item.label} · ${pesos(item.amount)} · pagó ${item.payerName}`);
    }
    if (input.expenses.length > MAX_LINES) lines.push(`y ${input.expenses.length - MAX_LINES} más`);
  }

  if (input.payments.length > 0) {
    lines.push('', 'Pagos entre ellos:');
    for (const item of input.payments) {
      lines.push(`${formatDayMonth(item.date)} · ${item.fromName} le pagó ${pesos(item.amount)} a ${item.toName}`);
    }
  }

  return lines.join('\n');
}
