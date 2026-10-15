/**
 * §15 · las proporciones de la barra del radar. TS puro: se testea en node.
 */

export type RadarBarRatios = {
  /** Fracción de la barra que es Gastado. */
  spent: number;
  /** Fracción que es Comprometido. */
  committed: number;
  /** Lo que queda vacío: Sin asignar. 0 si lo asignado alcanza o supera los ingresos. */
  unassigned: number;
  /** Dónde caen los ingresos registrados (1 = al final). Sirve para la marca de N-08. */
  incomeMark: number;
  /** N-08 · lo asignado supera los ingresos registrados. */
  exceeds: boolean;
};

/**
 * CA-03 · "sin ingresos registrados no se calcula Sin asignar". Con ingresos en
 * 0 cualquier gasto superaría la base y la barra se dibujaba 100% llena, que
 * dice "todo asignado" cuando lo correcto es "no se sabe". Devuelve `null`:
 * quien dibuja deja el track neutro, sin segmentos.
 *
 * N-08 · si lo asignado supera los ingresos, la base pasa a ser lo asignado: la
 * barra se llena entera y la marca queda en el punto de los ingresos.
 */
export function radarBarRatios(input: {
  registeredIncome: number;
  spent: number;
  committed: number;
}): RadarBarRatios | null {
  const { registeredIncome, spent, committed } = input;
  if (!(registeredIncome > 0)) return null;

  const assigned = spent + committed;
  const base = Math.max(registeredIncome, assigned);

  return {
    spent: spent / base,
    committed: committed / base,
    unassigned: Math.max(1 - assigned / base, 0),
    incomeMark: registeredIncome / base,
    exceeds: assigned > registeredIncome,
  };
}
