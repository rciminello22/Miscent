import type { IsoDate } from '@domain/calendar';
import type { Pesos } from '@domain/money';
import { calculateSharedBalance, type SharedBalance } from '@domain/shared-balance';
import type { Category, SharedExpense, Slot, SpaceFacts, Split } from '@domain/types';
import { balanceSentence } from './balanceCopy';

/**
 * UX-27 · §17 "Compartido → 'Con esto, Martina te debe $20.000'". TS puro.
 *
 * Es el saldo RESULTANTE, calculado por el dominio, nunca la diferencia entre
 * lo que pusieron (CA-25).
 */

/** "Con esto, Martina te debe $20.000." · "Con esto, le debés $20.000 a Martina." */
export function afterSavingSentence(balance: SharedBalance): string {
  const sentence = balanceSentence(balance);
  // El nombre propio conserva su mayúscula; "Le debés" y "Están" siguen a la coma.
  const tail = sentence.startsWith(balance.otherMemberName)
    ? sentence
    : `${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}`;
  return `Con esto, ${tail}.`;
}

/**
 * El aviso de un gasto compartido que se acaba de guardar. Devuelve `null`
 * cuando el gasto NO cambia el saldo hoy, y entonces el aviso queda como estaba
 * (`effect` ya dice cuándo cambia):
 *   · un fijo (cada mes es otra ocurrencia)
 *   · una compra en cuotas: P2, la deuda se genera cuota por cuota
 *   · una fecha futura: S-02, el saldo cuenta lo que ya llegó a su fecha
 *   · un gasto que deja el saldo igual (todo es parte de quien lo pagó)
 *
 * P19 · un gasto puntual con tarjeta SÍ mueve el saldo en la fecha de compra.
 */
export function savedBalanceDetail(args: {
  facts: SpaceFacts;
  mySlot: Slot;
  today: IsoDate;
  draft: {
    amount: Pesos;
    date: IsoDate;
    category: Category;
    payerSlot: Slot;
    split: Split;
    installmentCount: number | null;
    repeats: boolean;
  };
}): string | null {
  const { facts, mySlot, today, draft } = args;

  if (draft.repeats) return null;
  if (draft.installmentCount != null && draft.installmentCount >= 2) return null;
  if (draft.date > today) return null;

  const expense: SharedExpense = {
    id: 'saved-draft',
    spaceId: facts.space.id,
    amount: draft.amount,
    date: draft.date,
    category: draft.category,
    description: null,
    payerSlot: draft.payerSlot,
    split: draft.split,
    installments: null,
    createdBySlot: mySlot,
    updatedBySlot: mySlot,
    updatedAt: '',
    createdAt: '',
  };

  const before = calculateSharedBalance(facts, mySlot, today);
  const after = calculateSharedBalance(
    { ...facts, expenses: [...facts.expenses, expense] },
    mySlot,
    today,
  );

  if (after.amount === before.amount) return null;
  return afterSavingSentence(after);
}

/**
 * El saldo reemplaza al efecto: para un gasto puntual el efecto solo decía que
 * "el saldo entre ustedes cambia hoy", y ahora se dice cómo queda.
 */
export function savedDetail(balance: string | null, effect: string | null): string | null {
  return balance ?? effect;
}
