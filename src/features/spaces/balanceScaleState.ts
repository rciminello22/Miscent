import type { SharedBalance } from '@domain/shared-balance';
import type { MemberStatus } from '@domain/types';
import { formatNumber } from '@/lib/format';

/**
 * La balanza del espacio (la forma visual del saldo). TS puro, con test.
 *
 * Dibuja el MISMO escalar que la frase de `balanceSentence`: el de
 * `calculateSharedBalance`, que sí descuenta los pagos entre miembros. Por eso
 * no contradice a "Están a mano" cuando hubo un pago (P-04): las barras de
 * "puso", que un pago no cambia, viven en el Detalle del mes.
 *
 * Se inclina hacia quien puso de más, con una inclinación FIJA: es un estado
 * (a favor de uno, a favor del otro, nivelada), no una proporción que se pueda
 * leer como porcentaje. Sin rojo y sin flecha: la app no es árbitro (§4.13).
 * Vos siempre a la izquierda. Iniciales, nunca foto ni email (K7).
 */

export type ScalePerson = {
  initial: string;
  /** Lo que se lee debajo del círculo: "Vos" o el nombre del otro. */
  label: string;
  /** Todavía no entró (o ya no está): círculo punteado, sin relleno. */
  dashed: boolean;
};

export type BalanceScaleState = {
  /**
   * El signo de la rotación: -1 baja el lado izquierdo (hacia vos), +1 el
   * derecho (hacia el otro), 0 nivelada.
   */
  direction: -1 | 0 | 1;
  leaning: 'me' | 'other' | null;
  /** "Están a mano": el tilde aparece al nivelarse. */
  showCheck: boolean;
  me: ScalePerson;
  other: ScalePerson;
  /** Las cifras en palabras: "20.000 pesos", sin signo de pesos ni flechas. */
  accessibilityLabel: string;
};

/** La primera letra del nombre en mayúscula; "?" si no hay nombre. */
export function initialOf(name: string): string {
  const first = Array.from(name.trim())[0];
  return first == null ? '?' : first.toLocaleUpperCase('es-AR');
}

export function balanceScaleState(input: {
  balance: SharedBalance;
  myName: string;
  other: { displayName: string; status: MemberStatus };
}): BalanceScaleState {
  const { balance, other } = input;
  const otherName = other.displayName;
  const otherInside = other.status === 'active';

  const direction: -1 | 0 | 1 = balance.settled || balance.amount === 0 ? 0 : balance.amount > 0 ? -1 : 1;

  const amountInWords = `${formatNumber(Math.abs(balance.amount))} pesos`;
  let label: string;
  if (direction === 0) {
    label = 'Balanza nivelada, con una tilde. Están a mano.';
  } else if (direction === -1) {
    label = `Balanza inclinada hacia vos. ${otherName} te debe ${amountInWords}.`;
  } else {
    label = `Balanza inclinada hacia ${otherName}. Le debés ${amountInWords} a ${otherName}.`;
  }

  if (other.status === 'no_access') label += ` ${otherName} todavía no entró.`;
  if (other.status === 'former') label += ` ${otherName} es ex miembro.`;

  return {
    direction,
    leaning: direction === 0 ? null : direction === -1 ? 'me' : 'other',
    showCheck: direction === 0,
    me: { initial: initialOf(input.myName), label: 'Vos', dashed: false },
    other: { initial: initialOf(otherName), label: otherName, dashed: !otherInside },
    accessibilityLabel: label,
  };
}
