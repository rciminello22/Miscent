/**
 * Reparto de gastos compartidos. C-03, C-04, P3.
 *
 * P3 cerró la discusión: 50/50 o personalizado POR MONTO. Sin porcentajes en
 * la interfaz. La app puede calcular proporciones internamente (Q-09), pero
 * nunca las pide ni las muestra.
 *
 * Invariante que no se negocia (C-02): las dos partes suman EXACTAMENTE el
 * total. La base de datos lo garantiza con un CHECK; acá lo garantizamos al
 * calcular.
 */

import { halve, type Pesos } from './money';
import type { Slot, Split } from './types';

export type Shares = { slot1: Pesos; slot2: Pesos };

export function resolveShares(total: Pesos, split: Split): Shares {
  if (split.mode === 'even') return halve(total);

  const { shareSlot1, shareSlot2 } = split;
  if (shareSlot1 + shareSlot2 !== total) {
    throw new Error(
      `C-02 violado: las partes ($${shareSlot1} + $${shareSlot2}) no suman el total ($${total}).`,
    );
  }
  if (shareSlot1 < 0 || shareSlot2 < 0) {
    throw new Error('Una parte no puede ser negativa.');
  }
  return { slot1: shareSlot1, slot2: shareSlot2 };
}

/**
 * H-04 / H-05 · un reparto personalizado son dos montos que el usuario
 * escribió para UN total. Si el total cambia después (corregir el monto,
 * "Terminar ahora"), esas partes ya no suman y C-02 se rompe. Esta función
 * deriva el reparto para el total nuevo, en la misma proporción (como F-04 y
 * Q-09): el slot 1 se redondea y el 2 es el resto, así que siempre suma exacto.
 *
 * Las pantallas guardan el reparto que escribió el usuario y le aplican esto
 * al mostrar y al guardar: si el total pasa por 0 y vuelve, la proporción
 * original sigue ahí.
 */
export function fitSplitToTotal(split: Split, total: Pesos): Split {
  if (split.mode === 'even') return split;
  const base = split.shareSlot1 + split.shareSlot2;
  if (base === total) return split;
  // Sin proporción de la que partir (las dos partes en 0): a la mitad.
  const slot1 = base === 0 ? halve(total).slot1 : Math.round((total * split.shareSlot1) / base);
  return { mode: 'custom', shareSlot1: slot1, shareSlot2: total - slot1 };
}

export function shareOf(shares: Shares, slot: Slot): Pesos {
  return slot === 1 ? shares.slot1 : shares.slot2;
}

export function otherSlot(slot: Slot): Slot {
  return slot === 1 ? 2 : 1;
}

/**
 * Q-09 · reparto personalizado en cuotas: el usuario indica el reparto sobre
 * el TOTAL y cada cuota se divide en la misma proporción.
 *
 * El redondeo se ajusta en la primera cuota (Q-09), igual que el monto de la
 * cuota (Q-01). Garantiza tres cosas a la vez:
 *   1. cada cuota: parte1 + parte2 = monto de la cuota
 *   2. Σ parte1 de todas las cuotas = parte1 del total
 *   3. Σ parte2 de todas las cuotas = parte2 del total
 */
export function splitInstallmentShares(
  installmentAmounts: readonly Pesos[],
  total: Pesos,
  split: Split,
): Shares[] {
  const totalShares = resolveShares(total, split);
  const count = installmentAmounts.length;
  if (count === 0) return [];

  const ratio = total === 0 ? 0 : totalShares.slot1 / total;

  // Las cuotas 2..n se calculan por proporción; la primera absorbe el resto,
  // de modo que la suma cierre exacta contra la parte del total.
  const tailShares: Pesos[] = [];
  for (let index = 1; index < count; index++) {
    tailShares.push(Math.round(installmentAmounts[index]! * ratio));
  }
  const tailSum = tailShares.reduce((acc, value) => acc + value, 0);
  const firstSlot1 = totalShares.slot1 - tailSum;

  const first = installmentAmounts[0]!;
  if (firstSlot1 < 0 || firstSlot1 > first) {
    // Caso degenerado (montos de cuota muy desparejos). Repartimos la primera
    // cuota con la misma proporción y dejamos el ajuste donde quepa.
    const fallback = Math.min(Math.max(Math.round(first * ratio), 0), first);
    return rebalance(installmentAmounts, totalShares, [fallback, ...tailShares]);
  }

  return installmentAmounts.map((amount, index) => {
    const slot1 = index === 0 ? firstSlot1 : tailShares[index - 1]!;
    return { slot1, slot2: amount - slot1 };
  });
}

/**
 * Último recurso: corrige la diferencia acumulada repartiéndola de a un peso
 * sobre las cuotas que tengan margen, para no romper los invariantes.
 */
function rebalance(
  installmentAmounts: readonly Pesos[],
  totalShares: Shares,
  slot1PerInstallment: readonly Pesos[],
): Shares[] {
  const slot1 = [...slot1PerInstallment];
  let diff = totalShares.slot1 - slot1.reduce((acc, value) => acc + value, 0);

  for (let index = 0; index < slot1.length && diff !== 0; index++) {
    const amount = installmentAmounts[index]!;
    const current = slot1[index]!;
    const step = diff > 0 ? Math.min(diff, amount - current) : Math.max(diff, -current);
    slot1[index] = current + step;
    diff -= step;
  }

  return installmentAmounts.map((amount, index) => ({
    slot1: slot1[index]!,
    slot2: amount - slot1[index]!,
  }));
}
