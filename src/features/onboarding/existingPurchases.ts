import type { Month } from '@domain/calendar';
import { planExistingInstallments } from '@domain/installments';
import type { Pesos } from '@domain/money';
import type { InstallmentPlan } from '@domain/types';

/**
 * §13 O3 paso 4 · Q-06 · las compras en cuotas que ya figuran en el último
 * resumen de una tarjeta. Pueden ser varias. TS puro: se testea en node.
 */

export type ExistingPurchase = {
  /** Solo para la lista en pantalla. */
  key: string;
  description: string;
  installmentAmount: Pesos;
  /** "Vas por la cuota k…" */
  paidCount: number | null;
  /** "…de un total de n" */
  totalCount: number | null;
};

export function emptyPurchase(key: string): ExistingPurchase {
  return { key, description: '', installmentAmount: 0, paidCount: null, totalCount: null };
}

/** Lo que se guarda: una compra en cuotas con las n − k que faltan. */
export type PurchaseToSave = {
  description: string;
  remainingTotal: Pesos;
  plan: InstallmentPlan;
};

/**
 * Las compras completas, listas para guardar. Una a medio completar no se
 * guarda: es mejor que falte a que se invente una cuota.
 */
export function purchasesToSave(
  purchases: readonly ExistingPurchase[],
  context: { lastStatementMonth: Month; impactDay: number | null },
): PurchaseToSave[] {
  return purchases.flatMap((purchase) => {
    const { installmentAmount, paidCount, totalCount } = purchase;
    if (installmentAmount <= 0 || paidCount == null || totalCount == null) return [];
    if (totalCount <= paidCount) return [];

    const existing = planExistingInstallments({
      installmentAmount,
      paidCount,
      totalCount,
      lastStatementMonth: context.lastStatementMonth,
      impactDay: context.impactDay,
    });

    const description = purchase.description.trim();
    return [
      {
        description: description === '' ? 'Cuotas en curso' : description,
        remainingTotal: existing.remainingTotal,
        plan: existing.plan,
      },
    ];
  });
}
