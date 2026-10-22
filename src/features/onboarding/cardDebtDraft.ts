import type { IsoDate } from '@domain/calendar';
import type { Pesos } from '@domain/money';
import type { PersonalFacts } from '@domain/types';
import { emptyPurchase, type ExistingPurchase } from './existingPurchases';

/**
 * H-01 · el formulario de "lo que ya debés" de UNA tarjeta.
 *
 * Vive fuera de la pantalla, por usuario y tarjeta, mientras dure la sesión
 * de la app: si la persona vuelve atrás y entra de nuevo al paso, encuentra lo
 * que había escrito. Como guardar REEMPLAZA lo de esa tarjeta
 * (`app_save_card_debt`), continuar otra vez con el mismo formulario deja lo
 * mismo, y no el doble.
 */
export type CardDebtForm = {
  lastPaid: 'yes' | 'no';
  pendingAmount: Pesos;
  /** `null` = no la tocó: vale la que se deduce de la tarjeta. */
  pendingDueDate: IsoDate | null;
  purchases: ExistingPurchase[];
  recentSpending: Pesos;
};

export function emptyCardDebtForm(): CardDebtForm {
  return {
    lastPaid: 'yes',
    pendingAmount: 0,
    pendingDueDate: null,
    purchases: [emptyPurchase('0')],
    recentSpending: 0,
  };
}

const drafts = new Map<string, CardDebtForm>();

export function cardDebtDraftKey(userId: string, cardId: string): string {
  return `${userId}:${cardId}`;
}

export function readCardDebtDraft(key: string): CardDebtForm | null {
  return drafts.get(key) ?? null;
}

export function writeCardDebtDraft(key: string, form: CardDebtForm): void {
  drafts.set(key, form);
}

/** Un formulario que nadie tocó. */
export function isUntouched(form: CardDebtForm): boolean {
  return (
    (form.lastPaid === 'yes' || form.pendingAmount === 0) &&
    form.recentSpending === 0 &&
    form.purchases.every((purchase) => purchase.installmentAmount === 0)
  );
}

/**
 * ¿Este paso ya guardó algo para la tarjeta? Los resúmenes declarados solo los
 * crea este paso (T-07), y las cuotas y consumos llevan su marca (0022).
 */
export function cardDebtAlreadySaved(facts: PersonalFacts, cardId: string): boolean {
  return (
    facts.declaredStatements.some((statement) => statement.paymentMethodId === cardId) ||
    facts.movements.some(
      (movement) => movement.fromOnboardingDebt === true && movement.paymentMethodId === cardId,
    )
  );
}

/**
 * Qué hace "Continuar". Si ya se guardó algo para la tarjeta y el formulario
 * está intacto (se volvió a entrar al paso después de cerrar la app), seguir
 * NO lo borra: lo deja como está. En cualquier otro caso se guarda, y guardar
 * reemplaza.
 */
export function cardDebtContinueAction(args: {
  form: CardDebtForm;
  alreadySaved: boolean;
}): 'save' | 'keep' {
  return args.alreadySaved && isUntouched(args.form) ? 'keep' : 'save';
}
