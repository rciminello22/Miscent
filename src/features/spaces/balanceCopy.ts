import type { SharedBalance } from '@domain/shared-balance';
import type { SpaceMonth } from '@domain/shared-balance';
import { formatPesos } from '@/lib/format';

/**
 * El lenguaje del saldo compartido. §24 y §33.
 *
 * Tres frases, y ninguna es intercambiable:
 *   "Martina te debe $X"      · el otro le debe al usuario
 *   "Le debés $X a Martina"   · el usuario le debe al otro
 *   "Están a mano"            · S-06, saldo cero
 *
 * §4.13 · "Neutral entre las personas. Lo compartido es una conversación, no
 * una cobranza." De ahí que no haya ni un "pendiente", ni un "vencido", ni un
 * signo de alerta: son dos personas que comparten gastos, no un cobrador y un
 * deudor.
 *
 * Este es el ÚNICO lugar de la app donde la palabra "saldo" está permitida
 * (§7.2), y por eso el archivo vive bajo features/spaces: el lint de CA-00
 * solo la autoriza en esa ruta.
 */

export function balanceSentence(balance: SharedBalance): string {
  if (balance.settled) return 'Están a mano';

  return balance.amount > 0
    ? `${balance.otherMemberName} te debe ${formatPesos(balance.amount, { sign: 'never' })}`
    : `Le debés ${formatPesos(balance.amount, { sign: 'never' })} a ${balance.otherMemberName}`;
}

/**
 * La misma frase de `balanceSentence`, partida para el N1 del espacio: lo que
 * se lee, la cifra en su propia línea (es la que se ajusta si es grande) y, si
 * hace falta, a quién. Unidas con espacios dan exactamente `balanceSentence`.
 */
export type BalanceLines = { lead: string; amount: number | null; tail: string | null };

export function balanceLines(balance: SharedBalance): BalanceLines {
  if (balance.settled) return { lead: 'Están a mano', amount: null, tail: null };

  return balance.amount > 0
    ? { lead: `${balance.otherMemberName} te debe`, amount: balance.amount, tail: null }
    : { lead: 'Le debés', amount: -balance.amount, tail: `a ${balance.otherMemberName}` };
}

/**
 * §25 · un pago entre miembros, en segunda persona. G-06: "pagó" es lo
 * declarado, la app no verifica la transferencia.
 */
export function paymentSentence(
  payment: { fromSlot: 1 | 2; toSlot: 1 | 2; amount: number },
  viewerSlot: 1 | 2,
  otherName: string,
): string {
  const amount = formatPesos(payment.amount, { sign: 'never' });
  return payment.fromSlot === viewerSlot
    ? `Le pagaste ${amount} a ${otherName}`
    : `${otherName} te pagó ${amount}`;
}

/**
 * S-05 · "[Miembro] puso $X de más".
 *
 * Nunca se muestra la diferencia entre lo que pusieron como si fuera la deuda:
 * son dos cifras distintas, y confundirlas es el error que CA-25 prueba.
 */
export function putExtraSentence(month: SpaceMonth, when = 'Este mes'): string | null {
  if (month.viewerPutExtra === 0) return null;

  return month.viewerPutExtra > 0
    ? `${when} pusiste ${formatPesos(month.viewerPutExtra, { sign: 'never' })} de más.`
    : `${when} ${month.other.name} puso ${formatPesos(month.viewerPutExtra, { sign: 'never' })} de más.`;
}

/** §24 · el puente con el mes anterior: "Venían de septiembre: …". */
export function previousMonthSentence(
  month: SpaceMonth,
  previousMonthName: string,
): string | null {
  if (month.previousBalance == null || month.previousBalance === 0) return null;

  const amount = formatPesos(month.previousBalance, { sign: 'never' });

  return month.previousBalance > 0
    ? `Venían de ${previousMonthName}: ${month.other.name} había puesto ${amount} de menos.`
    : `Venían de ${previousMonthName}: ${month.other.name} había puesto ${amount} de más.`;
}

/**
 * §25 · aviso de adelanto. Aparece cuando el saldo favorece a quien todavía
 * tiene cuotas compartidas por vencer: sin esta aclaración, el número parece
 * una deuda cuando en realidad es un adelanto.
 */
export function prepaidInstallmentsSentence(
  balance: SharedBalance,
  pendingForOther: number,
): string | null {
  if (pendingForOther <= 0) return null;
  if (balance.amount >= 0) return null;

  const prepaid = Math.min(-balance.amount, pendingForOther);
  if (prepaid <= 0) return null;

  return `${balance.otherMemberName} adelantó ${formatPesos(prepaid, { sign: 'never' })} de cuotas que todavía no vencieron.`;
}

/**
 * P6 · el saldo de un espacio del que el usuario salió, tal como estaba al
 * salir. En pasado: es una foto. Lo que cambió después (las cuotas que
 * siguen, SA-03) lo ve quien se quedó.
 */
export function departureBalanceSentence(balance: SharedBalance): string {
  if (balance.settled) return 'Al salir, estaban a mano.';

  return balance.amount > 0
    ? `Al salir, ${balance.otherMemberName} te debía ${formatPesos(balance.amount, { sign: 'never' })}.`
    : `Al salir, le debías ${formatPesos(balance.amount, { sign: 'never' })} a ${balance.otherMemberName}.`;
}
