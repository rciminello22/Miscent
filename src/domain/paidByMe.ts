/**
 * §5 1º Should · §11 paso 4 · "Pagaste estos gastos de Casa. ¿Con qué?"
 *
 * Un gasto compartido que figura como pagado por el usuario y no tiene medio
 * se trata como al contado (C-05): nunca entra al resumen estimado de su
 * tarjeta ni a sus Próximos pagos. Pasa cuando lo cargó el otro miembro, o
 * cuando lo cargó él mismo siendo invitado, sin cuenta personal.
 *
 * Una vez contestado queda un medio guardado, aunque sea efectivo: así la
 * pregunta no vuelve.
 */

import { addDays, hasPassed, type IsoDate } from './calendar';
import { scheduleInstallments } from './installments';
import type { Pesos } from './money';
import type { Category, PersonalFacts } from './types';

export type PaidByMeItem = {
  expenseId: string;
  description: string | null;
  category: Category;
  amount: Pesos;
  date: IsoDate;
  installmentCount: number | null;
};

/**
 * Hasta dónde vale la pena preguntar por un gasto en un pago. Más atrás, ya
 * pasó por un resumen que se pagó: preguntarlo es ruido.
 */
const ONE_PAYMENT_WINDOW_DAYS = 60;

export function paidByMeWithoutMethod(
  membership: PersonalFacts['spaces'][number],
  today: IsoDate,
  options: {
    /**
     * También lo que cargó él mismo. Solo al activar la cuenta (§11 paso 4):
     * como invitado no podía elegir medio. En el espacio, un gasto propio sin
     * medio fue su elección.
     */
    includeOwn: boolean;
  },
): PaidByMeItem[] {
  const { facts, mySlot, paymentDetails, leftOn } = membership;
  // SA-02 · de un espacio del que salió ya no ve nada.
  if (leftOn != null) return [];

  const withMethod = new Set(
    paymentDetails.filter((detail) => detail.slot === mySlot).map((detail) => detail.sourceId),
  );
  const since = addDays(today, -ONE_PAYMENT_WINDOW_DAYS);

  return facts.expenses
    .filter((expense) => {
      if (expense.payerSlot !== mySlot || withMethod.has(expense.id)) return false;
      if (!options.includeOwn && expense.createdBySlot === mySlot) return false;

      // En cuotas: mientras quede alguna por delante.
      if (expense.installments != null) {
        return scheduleInstallments(expense.amount, expense.installments).some(
          (installment) => installment.date == null || !hasPassed(installment.date, today),
        );
      }
      return expense.date >= since;
    })
    .map((expense) => ({
      expenseId: expense.id,
      description: expense.description,
      category: expense.category,
      amount: expense.amount,
      date: expense.date,
      installmentCount: expense.installments?.count ?? null,
    }));
}
