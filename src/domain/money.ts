/**
 * Dinero. G-02: moneda única (pesos), montos enteros.
 *
 * Todo monto es un entero de pesos. Nunca float, nunca centavos: la spec
 * define montos enteros y los repartos deben sumar exactamente el total.
 */

export type Pesos = number;

/**
 * Lo máximo que se puede escribir en un campo de monto. La base guarda
 * `integer` (hasta 2.147.483.647): el tope deja margen para sumar varios
 * montos sin desbordar.
 */
export const MAX_AMOUNT: Pesos = 999_999_999;

/**
 * Lo que pasa al escribir en un campo de monto. `raw` es el texto que dejó el
 * teclado (con los puntos del formato); `current` es lo que había.
 *
 * Si el número nuevo pasa de MAX_AMOUNT, el tecleo se ignora: queda `current`
 * (no se borra lo escrito) y `capped` pide mostrar el aviso. Borrar siempre anda.
 */
export function typeAmount(raw: string, current: Pesos): { amount: Pesos; capped: boolean } {
  const digits = raw.replace(/\D/g, '').replace(/^0+/, '');
  if (digits === '') return { amount: 0, capped: false };
  // Más de diez cifras ya pasa del tope y evita perder precisión en Number().
  if (digits.length > 10 || Number(digits) > MAX_AMOUNT) {
    return { amount: current, capped: true };
  }
  return { amount: Number(digits), capped: false };
}

export function isValidAmount(value: unknown): value is Pesos {
  return typeof value === 'number' && Number.isInteger(value) && Number.isFinite(value);
}

/** Suma defensiva: cualquier no-entero es un bug, no un dato. */
export function sum(amounts: readonly Pesos[]): Pesos {
  let total = 0;
  for (const amount of amounts) {
    if (!isValidAmount(amount)) {
      throw new Error(`Monto no entero en una suma de pesos: ${String(amount)}`);
    }
    total += amount;
  }
  return total;
}

/**
 * Reparte un total en `parts` montos enteros que suman exactamente el total.
 * El resto se concentra en el PRIMER elemento (Q-01: "redondeo en la primera").
 */
export function distribute(total: Pesos, parts: number): Pesos[] {
  if (parts < 1) throw new Error(`Cantidad de partes inválida: ${parts}`);
  const base = Math.floor(total / parts);
  const remainder = total - base * parts;
  return Array.from({ length: parts }, (_, index) => (index === 0 ? base + remainder : base));
}

/**
 * C-03 · reparto 50/50: la parte del slot 1 se redondea y la del slot 2 es el
 * resto, para que las dos sumen siempre el total. La convención de redondeo es
 * fija (slot 1 absorbe el peso impar) porque los dos miembros tienen que ver
 * exactamente el mismo número.
 */
export function halve(total: Pesos): { slot1: Pesos; slot2: Pesos } {
  const slot1 = Math.round(total / 2);
  return { slot1, slot2: total - slot1 };
}
