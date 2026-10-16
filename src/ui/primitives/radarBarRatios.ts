/**
 * §15 · las proporciones de la barra del radar. TS puro: se testea en node.
 */

export type RadarBarRatios = {
  /** Fracción del recipiente (los ingresos registrados) que es Gastado. */
  spent: number;
  /** Fracción del recipiente que es Comprometido. */
  committed: number;
  /** Lo que queda vacío: Sin asignar. 0 si lo asignado alcanza o supera los ingresos. */
  unassigned: number;
  /** N-08 · lo asignado supera los ingresos registrados: lo de más sale del recipiente. */
  exceeds: boolean;
};

/**
 * CA-03 · "sin ingresos registrados no se calcula Sin asignar". Con ingresos en
 * 0 cualquier gasto superaría la base y la barra se dibujaba 100% llena, que
 * dice "todo asignado" cuando lo correcto es "no se sabe". Devuelve `null`:
 * quien dibuja deja el track neutro, sin segmentos.
 *
 * Los ingresos registrados son el RECIPIENTE y las fracciones son suyas. N-08 ·
 * si lo asignado los supera, el recipiente queda lleno (Gastado primero, después
 * Comprometido hasta donde entra) y lo que no entra sale a un tramo aparte, a
 * escala: ver `radarBarTail`.
 */
export function radarBarRatios(input: {
  registeredIncome: number;
  spent: number;
  committed: number;
}): RadarBarRatios | null {
  const { registeredIncome, spent, committed } = input;
  if (!(registeredIncome > 0)) return null;

  const spentIn = Math.min(spent, registeredIncome);
  const committedIn = Math.min(committed, registeredIncome - spentIn);

  return {
    spent: spentIn / registeredIncome,
    committed: committedIn / registeredIncome,
    unassigned: Math.max(1 - (spent + committed) / registeredIncome, 0),
    exceeds: spent + committed > registeredIncome,
  };
}

/** El hueco entre el recipiente y el tramo de más, en px. */
export const TAIL_GAP = 3;
/** El tramo de más nunca mide menos que esto, para que se vea que algo sale. */
export const TAIL_MIN_WIDTH = 6;

export type RadarBarTail = {
  /** Ancho del tramo de más, en px. */
  width: number;
  /** Hueco entre el recipiente y el tramo, en px. */
  gap: number;
  /** El tramo a escala medía menos que el mínimo y se dibuja con el mínimo. */
  atMinimum: boolean;
  /** Cuánto se pasa, en pesos. La etiqueta lleva siempre esta cifra exacta. */
  amount: number;
};

/**
 * N-08 · el tramo de más, a ESCALA. Recipiente y tramo comparten el mismo
 * "pesos por px": el ancho de la barra (menos el hueco) representa todo lo
 * asignado. Con $35.000 sobre $1.235.000 mide unos 8px de 293.
 *
 * `width` es el ancho medido de la barra; con 0 (todavía sin medir) se usa el
 * mínimo. Devuelve `null` si no hay exceso o no hay ingresos (CA-03).
 */
export function radarBarTail(
  input: { registeredIncome: number; spent: number; committed: number },
  width: number,
): RadarBarTail | null {
  const { registeredIncome, spent, committed } = input;
  if (!(registeredIncome > 0)) return null;

  const assigned = spent + committed;
  const amount = assigned - registeredIncome;
  if (!(amount > 0)) return null;

  if (!(width > 0)) {
    return { width: TAIL_MIN_WIDTH, gap: TAIL_GAP, atMinimum: true, amount };
  }

  const usable = Math.max(width - TAIL_GAP, 0);
  const scaled = (amount / assigned) * usable;
  const atMinimum = scaled < TAIL_MIN_WIDTH;

  return {
    // Nunca más que el espacio que hay, aunque la barra sea diminuta.
    width: Math.min(Math.max(scaled, TAIL_MIN_WIDTH), usable),
    gap: TAIL_GAP,
    atMinimum,
    amount,
  };
}

/**
 * UX-03 · dónde va la separación entre segmentos. Solo entre segmentos con
 * ancho: un separador junto a uno vacío dibujaría una raya suelta.
 */
export function radarBarSeparators(ratios: RadarBarRatios | null): {
  spentCommitted: boolean;
  assignedUnassigned: boolean;
} {
  if (ratios == null) return { spentCommitted: false, assignedUnassigned: false };
  return {
    spentCommitted: ratios.spent > 0 && ratios.committed > 0,
    assignedUnassigned: ratios.spent + ratios.committed > 0 && ratios.unassigned > 0,
  };
}
