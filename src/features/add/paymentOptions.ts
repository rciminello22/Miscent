import type { PaymentMethod, PaymentMethodKind } from '@domain/types';

/**
 * §17 campo 7 · "efectivo, débito, billetera, transferencia, otro o una
 * tarjeta". TS puro: se testea en node.
 *
 * Hasta el 11/10 el selector mostraba solo los medios cargados, y el único
 * paso que carga medios es el de tarjetas: no había forma de decir "lo pagué
 * con la billetera". Con "último usado", después del primer gasto con tarjeta
 * todos salían con tarjeta, e iban al Comprometido del mes del vencimiento en
 * vez de al Gastado de hoy.
 *
 * Los cuatro al contado se ofrecen siempre. El que todavía no existe se crea
 * la primera vez que se elige (`methodId: null`).
 */

export const CASH_LIKE: readonly { kind: PaymentMethodKind; name: string }[] = [
  { kind: 'cash', name: 'Efectivo' },
  { kind: 'debit', name: 'Débito' },
  { kind: 'wallet', name: 'Billetera' },
  { kind: 'transfer', name: 'Transferencia' },
];

export type PaymentOption = {
  key: string;
  kind: PaymentMethodKind;
  name: string;
  /** `null` → todavía no existe: se crea al elegirlo. */
  methodId: string | null;
};

export function paymentOptions(methods: readonly PaymentMethod[]): PaymentOption[] {
  const used = new Set<string>();
  const existing = (method: PaymentMethod): PaymentOption => {
    used.add(method.id);
    return { key: method.id, kind: method.kind, name: method.name, methodId: method.id };
  };

  const cashLike = CASH_LIKE.map(({ kind, name }) => {
    const method = methods.find((item) => item.kind === kind);
    return method != null ? existing(method) : { key: `new:${kind}`, kind, name, methodId: null };
  });

  const others = methods.filter((item) => item.kind !== 'card' && !used.has(item.id)).map(existing);
  const cards = methods.filter((item) => item.kind === 'card').map(existing);

  return [...cashLike, ...others, ...cards];
}
