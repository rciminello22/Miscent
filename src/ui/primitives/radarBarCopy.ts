/**
 * UX-03 · el valor accesible de la barra del radar (lector de pantalla).
 * TS puro: se testea en node.
 *
 * Son las cifras en palabras, nunca porcentajes (P3): "Gastado $X, Comprometido
 * $Y, de $Z registrados". No nombra Sin asignar a propósito: esa cifra nunca va
 * sin su ayuda (CA-01) y la dice la fila de abajo.
 */

import { formatPesos } from '@/lib/format';

export function radarBarValueText(input: {
  registeredIncome: number;
  spent: number;
  committed: number;
}): string {
  const { registeredIncome, spent, committed } = input;

  // CA-03 · sin ingresos registrados no se calcula nada.
  if (!(registeredIncome > 0)) return 'Sin ingresos registrados: todavía no se calcula';

  const head = `Gastado ${formatPesos(spent, { sign: 'never' })}, Comprometido ${formatPesos(committed, { sign: 'never' })}`;
  const income = formatPesos(registeredIncome, { sign: 'never' });

  // N-08 · lo asignado supera los ingresos: se dice sin alarma.
  return spent + committed > registeredIncome
    ? `${head}, por encima de los ${income} registrados`
    : `${head}, de ${income} registrados`;
}
