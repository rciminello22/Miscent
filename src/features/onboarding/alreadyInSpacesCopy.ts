import type { Pesos } from '@domain/money';
import { formatPesos } from '@/lib/format';

/**
 * El texto de la prevención de duplicados (§11 paso 3, CA-09). TS puro: se
 * testea en node. "Tu parte", nunca "te corresponde" (§11 de HANDOFF).
 */

type InSpace = { spaceName: string; myShare: Pesos };

/** CA-09 · "Ya en Casa · tu parte $250.000". */
export function alreadyInLine(item: InSpace): string {
  return `Ya en ${item.spaceName} · tu parte ${formatPesos(item.myShare)}`;
}

/** §11 paso 3 · "Alquiler ya está en Casa (tu parte $250.000). ¿Es otro alquiler?" */
export function anotherOneQuestion(
  label: string,
  question: string,
  matches: readonly InSpace[],
): string {
  const where = matches
    .map((item) => `en ${item.spaceName} (tu parte ${formatPesos(item.myShare)})`)
    .join(' y ');
  return `${label} ya está ${where}. ${question}`;
}

/** §13 O3 paso 4 · "Heladera · Casa · faltan 6 cuotas de $100.000 · tu parte $50.000". */
export function installmentsInSpaceLine(item: {
  label: string;
  spaceName: string;
  remaining: number;
  installmentAmount: Pesos;
  myShare: Pesos;
}): string {
  const pending =
    item.remaining === 1
      ? `falta 1 cuota de ${formatPesos(item.installmentAmount)}`
      : `faltan ${item.remaining} cuotas de ${formatPesos(item.installmentAmount)}`;
  return [item.label, item.spaceName, pending, `tu parte ${formatPesos(item.myShare)}`].join(' · ');
}
