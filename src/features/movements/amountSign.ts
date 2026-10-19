import type { Pesos } from '@domain/money';
import type { MovementRow } from './buildMovementList';

/**
 * 15 · la regla de signos de toda la app.
 *
 * Todo monto que es un MOVIMIENTO de plata lleva signo: "−" si sale, "+" si
 * entra. Solo lo que entra lleva color (`brand`); lo que sale va en texto
 * normal, nunca en rojo. No llevan signo: el saldo, los totales del radar,
 * Próximos pagos, el resumen estimado, Futuro y el total gris "de $100.000".
 *
 * Un pago entre miembros es cuestión de dirección para QUIEN MIRA: "Martina te
 * pagó" entra para vos y es la fila que ve Martina al revés.
 */

export type AmountSign = 'out' | 'in';

/** Qué clase de movimiento es un monto, para el signo y para el lector de pantalla. */
export type SignedKind = 'expense' | 'income' | 'payment-received' | 'payment-sent';

export function signOf(kind: SignedKind): AmountSign {
  return kind === 'income' || kind === 'payment-received' ? 'in' : 'out';
}

/** El tipo de una fila de Movimientos. */
export function signedKindOf(row: Pick<MovementRow, 'kind' | 'paymentDirection'>): SignedKind {
  switch (row.kind) {
    case 'personal-income':
      return 'income';
    case 'member-payment':
      return row.paymentDirection === 'received' ? 'payment-received' : 'payment-sent';
    default:
      return 'expense';
  }
}

/** El signo de una fila de Movimientos. */
export function rowSign(row: Pick<MovementRow, 'kind' | 'paymentDirection'>): AmountSign {
  return signOf(signedKindOf(row));
}

/**
 * Lo que lee el lector de pantalla en lugar de "−$4.500": las palabras, nunca
 * "menos" ni "más".
 */
export function amountSpeech(
  kind: SignedKind,
  amount: Pesos,
  formatAmount: (amount: Pesos) => string,
): string {
  const figure = formatAmount(amount);
  switch (kind) {
    case 'income':
      return `ingreso de ${figure}`;
    case 'payment-received':
      return `te pagaron ${figure}`;
    case 'payment-sent':
      return `pagaste ${figure}`;
    default:
      return `gasto de ${figure}`;
  }
}
