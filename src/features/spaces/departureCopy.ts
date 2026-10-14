import type { Pesos } from '@domain/money';
import { formatPesos } from '@/lib/format';

/**
 * SA-04 · §27 · el texto de la pregunta sobre cada fijo detenido por una
 * salida. TS puro: se testea en node.
 *
 * El nombre del fijo va entre comillas y no con artículo: "el alquiler", "la
 * luz", "las expensas"… con un fijo propio ("Monotributo") no hay forma de
 * acertar el género.
 */

export function stoppedQuestion(args: {
  label: string;
  otherName: string;
  /** Sin cuenta personal no hay "mis fijos" (A-05). */
  canKeep: boolean;
}): string {
  const base = `"${args.label}" era compartido con ${args.otherName}`;
  return args.canKeep ? `${base}. ¿Lo seguís pagando vos?` : `${base} y dejó de serlo cuando salió.`;
}

/** Caso 13 · pasa a sus fijos por el TOTAL: se dice antes de elegir. */
export function keepDetail(amount: Pesos): string {
  return `En tus fijos cuenta entero: ${formatPesos(amount)} por mes.`;
}

/** La pista en Inicio, porque es ahí donde se nota que el número bajó. */
export function pendingFixedLine(count: number): string {
  return count === 1 ? 'Hay 1 fijo para revisar' : `Hay ${count} fijos para revisar`;
}
