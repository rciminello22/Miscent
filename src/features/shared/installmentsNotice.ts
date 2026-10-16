import { monthOf, type IsoDate, type Month } from '@domain/calendar';
import { installmentAmounts } from '@domain/installments';
import type { Pesos } from '@domain/money';
import { formatMonth } from '@/lib/format';

/**
 * §17 · el aviso al guardar una compra en cuotas: dónde aterrizó. TS puro.
 *
 * La primera cuota puede caer el mes que viene, y como lo gastado de este mes
 * no cambia (CA-53), sin este aviso parece que no pasó nada. No toca
 * N-02/N-03: solo lo dice, y deja ir a Futuro con ese mes elegido.
 */
export type InstallmentsNotice = { detail: string; month: Month };

export function installmentsNotice(args: {
  /** El total de la compra (la cuota es del total: tu parte la cuenta Futuro). */
  total: Pesos;
  count: number | null;
  /** El mes de la primera cuota, del plan que calculó el dominio. */
  firstMonth: Month | null;
  today: IsoDate;
  formatAmount: (amount: Pesos) => string;
}): InstallmentsNotice | null {
  const { count, firstMonth } = args;
  if (count == null || count < 2 || firstMonth == null) return null;

  // Q-01 · el redondeo va en la primera cuota: es la que se nombra.
  const [first = 0] = installmentAmounts(args.total, count);

  return {
    detail: `${count} cuotas de ${args.formatAmount(first)} · la primera suma a ${formatMonth(firstMonth, monthOf(args.today))}`,
    month: firstMonth,
  };
}
