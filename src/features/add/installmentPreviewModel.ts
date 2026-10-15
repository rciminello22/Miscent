import { addMonths } from '@domain/calendar';
import { calculateFuture, previewInstallments, type InstallmentPreview } from '@domain/future';
import { installmentAmounts } from '@domain/installments';
import type { Pesos } from '@domain/money';
import type { PersonalExpansion } from '@domain/occurrences';
import type { InstallmentPlan } from '@domain/types';

/**
 * §17 campo 12 · lo que muestra la vista previa de una compra en cuotas. TS puro.
 *
 * Se arma acá y no dentro del componente para que la pantalla sepa SI hay
 * vista previa: si la hay, ella cuenta el rango de las cuotas y la pantalla
 * no repite el mensaje de efecto (UX-15). Si no la hay (todas las cuotas ya
 * pasaron, o la parte propia es cero), el mensaje de efecto es lo único que se
 * dice.
 */

export type InstallmentPreviewModel = {
  /** Lo que suma por mes (tu parte, si es compartido). */
  perMonth: Pesos;
  /** Solo los meses en los que Comprometido cambia. */
  changed: InstallmentPreview['months'];
};

export function buildInstallmentPreview(args: {
  expansion: PersonalExpansion;
  total: Pesos;
  plan: InstallmentPlan;
  /** K9 · si el gasto es compartido, la fracción del usuario. 1 si es personal. */
  myShareRatio: number;
  today: string;
}): InstallmentPreviewModel | null {
  const { expansion, total, plan, myShareRatio, today } = args;

  const from = addMonths(today.slice(0, 7), 1);
  const before = calculateFuture(expansion, from, 6);
  const firstInstallment = installmentAmounts(total, plan.count)[0] ?? 0;

  const preview = previewInstallments({
    before,
    myShare: Math.round(firstInstallment * myShareRatio),
    firstMonth: plan.firstMonth,
    count: plan.count,
  });

  const changed = preview.months.filter((month) => month.committedAfter !== month.committedBefore);
  if (changed.length === 0) return null;

  return { perMonth: preview.perMonth, changed };
}
