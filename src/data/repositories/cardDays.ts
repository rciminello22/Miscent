/**
 * Corregir los días de una tarjeta: la tarjeta y los planes de cuotas que se
 * mueven con ella (§22, T-06).
 *
 * ATOMICIDAD. Son varias escrituras (una por compra en cuotas, más la tarjeta) y
 * supabase-js no tiene transacciones desde el cliente. Se hace así, sin RPC:
 *
 *   1. Primero los planes, UNO por UNO.
 *   2. La tarjeta, AL FINAL.
 *   3. Si algo falla, se deshacen los planes ya escritos, en orden inverso.
 *
 * Por qué ese orden: lo que se calcula como "qué se mueve" sale del plan GUARDADO
 * contra los días nuevos, no contra los días viejos de la tarjeta. Si la tarjeta
 * se escribiera primero y un plan fallara, al reintentar la tarjeta ya tendría
 * los días nuevos y nadie sabría que quedan planes viejos. Con la tarjeta al
 * final, reintentar es seguro: los planes ya escritos no se vuelven a tocar (su
 * plan nuevo ya es igual al guardado) y los que faltan se escriben.
 *
 * RIESGO RESIDUAL. Si falla un plan Y además falla deshacer los anteriores
 * (se cae la red justo en el medio), quedan algunos planes con los días nuevos y
 * la tarjeta con los viejos. No se pierde nada y se arregla guardando de nuevo,
 * y el error lo dice. Una RPC SECURITY DEFINER lo haría imposible, pero exige
 * una migración y abrir una función más; para un usuario que corrige los días
 * de una tarjeta de vez en cuando no justifica ese costo.
 */

import type { PlanWrite } from '@domain/cardDays';
import { reverseWrites } from '@domain/cardDays';
import { supabase } from '../supabase';
import { installmentDayColumns } from '../mappers';
import { updatePaymentMethod, type NewPaymentMethod } from './mutations';

/** Lo que se guarda de la tarjeta: el nombre y los dos días con su marca. */
export type CardEdit = Pick<
  NewPaymentMethod,
  'name' | 'closingDay' | 'closingApprox' | 'dueDay' | 'dueApprox'
>;

/** Escribe un plan. Mira `{ error }`: supabase-js no lanza. */
async function writePlan(write: PlanWrite): Promise<void> {
  const columns = installmentDayColumns(write.plan);

  if (write.source.kind === 'movement') {
    const { error } = await supabase
      .from('personal_movements')
      .update(columns)
      .eq('id', write.source.id);
    if (error != null) throw new Error('No pudimos guardar los cambios.');
    return;
  }

  // La RLS exige que el último editor sea quien escribe.
  const { error } = await supabase
    .from('shared_expenses')
    .update({ ...columns, updated_by_slot: write.source.mySlot })
    .eq('id', write.source.id)
    .select('id');
  // SY-02 · si el gasto ya no existe, el UPDATE responde OK sobre cero filas: no
  // hay nada que mover y no es un error.
  if (error != null) throw new Error('No pudimos guardar los cambios.');
}

/** Deshace los planes ya escritos. `true` si pudo con todos. */
async function rollback(applied: readonly PlanWrite[]): Promise<boolean> {
  let complete = true;
  for (const write of reverseWrites(applied).reverse()) {
    try {
      await writePlan(write);
    } catch {
      complete = false;
    }
  }
  return complete;
}

export async function applyCardDaysChange(args: {
  cardId: string;
  card: CardEdit;
  writes: readonly PlanWrite[];
}): Promise<void> {
  const applied: PlanWrite[] = [];

  try {
    for (const write of args.writes) {
      await writePlan(write);
      applied.push(write);
    }
    await updatePaymentMethod(args.cardId, args.card);
  } catch {
    const restored = await rollback(applied);
    throw new Error(
      restored
        ? 'No pudimos guardar los cambios. No se tocó nada.'
        : 'Se guardó solo una parte de los cambios. Probá guardar de nuevo.',
    );
  }
}

/**
 * Deshacer: vuelven los días anteriores y los planes que se habían movido. Es
 * determinista (lo mismo, al revés) y no restaura lo que se haya editado en el
 * medio: por eso solo se ofrece mientras dura el aviso.
 */
export async function undoCardDaysChange(args: {
  cardId: string;
  previousCard: CardEdit;
  writes: readonly PlanWrite[];
}): Promise<void> {
  await applyCardDaysChange({
    cardId: args.cardId,
    card: args.previousCard,
    writes: reverseWrites(args.writes),
  });
}
