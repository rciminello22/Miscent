/**
 * Edición y eliminación. X-01 a X-09, Q-07, F-03.
 *
 * X-01 es el principio que ordena todo el archivo: "editar un hecho recalcula
 * todo lo que depende de él". Como las ocurrencias, el radar y el saldo NO se
 * guardan (§7.4), eso sale gratis: alcanza con escribir el hecho nuevo y
 * volver a leer. No hay nada que migrar ni recalcular a mano.
 */

import { endInstallmentsNow, planInstallments } from '@domain/installments';
import type { IsoDate, Month } from '@domain/calendar';
import type { Pesos } from '@domain/money';
import type {
  Category,
  InstallmentPlan,
  PaymentMethod,
  PersonalMovement,
  Recurrence,
  SharedExpense,
  Slot,
  Split,
} from '@domain/types';
import { changeAmountFrom } from '@domain/fixedChanges';
import { supabase } from '../supabase';
import { installmentColumns, splitColumns } from '../mappers';
import { fromPastTerms } from '../pastTerms';

/* ────────────────────────────────────────────────────────────────────────── */
/*  Movimientos personales                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

export type MovementEdit = {
  amount: Pesos;
  date: IsoDate;
  category: Category;
  description: string | null;
  paymentMethod: PaymentMethod | null;
  installmentCount: number | null;
  pinnedFirstMonth: Month | null;
};

/**
 * X-04 · editar una compra en cuotas REGENERA sus cuotas.
 *
 * El cronograma se le vuelve a pedir al dominio con los datos nuevos, en vez
 * de parchear el plan viejo: si cambió el medio de pago, Q-02 y Q-03 dan
 * cronogramas distintos, y mantener el anterior dejaría cuotas en meses que
 * ya no corresponden.
 */
export async function updatePersonalMovement(
  id: string,
  input: MovementEdit,
): Promise<void> {
  const plan =
    input.installmentCount != null && input.installmentCount >= 2
      ? planInstallments({
          purchaseDate: input.date,
          count: input.installmentCount,
          card: input.paymentMethod?.kind === 'card' ? input.paymentMethod : null,
          pinnedFirstMonth: input.pinnedFirstMonth,
        })
      : null;

  const { error } = await supabase
    .from('personal_movements')
    .update({
      amount: input.amount,
      date: input.date,
      category: input.category,
      description: input.description,
      payment_method_id: input.paymentMethod?.id ?? null,
      ...installmentColumns(plan),
    })
    .eq('id', id);

  if (error != null) throw new Error('No pudimos guardar los cambios.');
}

/**
 * Q-07 / X-06 · "Terminar ahora": conserva las cuotas pasadas y elimina las
 * futuras.
 *
 * Es distinto de eliminar la compra: §20 lo plantea para cuando la compra
 * existió de verdad pero se dejó de pagar (se devolvió el producto, se
 * canceló el plan). Eliminar, en cambio, es para cuando fue un error de
 * carga, y ahí sí desaparece todo (X-06: "Fue un error").
 */
export async function endInstallmentsNowMovement(
  movement: PersonalMovement,
  today: IsoDate,
): Promise<void> {
  if (movement.installments == null) return;

  const result = endInstallmentsNow(movement.amount, movement.installments, today);

  // Si no pasó ninguna cuota, "terminar ahora" equivale a eliminar la compra.
  if (result.plan.count === 0) {
    await deletePersonalMovementById(movement.id);
    return;
  }

  const { error } = await supabase
    .from('personal_movements')
    .update({
      amount: result.total,
      ...installmentColumns(result.plan),
    })
    .eq('id', movement.id);

  if (error != null) throw new Error('No pudimos terminar las cuotas.');
}

export async function deletePersonalMovementById(id: string): Promise<void> {
  const { error } = await supabase.from('personal_movements').delete().eq('id', id);
  if (error != null) throw new Error('No pudimos eliminar el movimiento.');
}

/**
 * X-07 · cambiar el destino, de personal a un espacio.
 *
 * "Solo lo puede hacer quien lo cargó, con confirmación de audiencia." Lo
 * primero lo garantiza RLS (un movimiento personal solo lo ve su dueño); lo
 * segundo es de la interfaz, porque el dato pasa a ser visible para otra
 * persona y eso §32 lo clasifica como "rompe privacidad" si ocurre por error.
 *
 * No es un UPDATE: son dos tablas distintas, con dueños distintos. El gasto
 * personal se borra y nace un gasto compartido.
 */
export async function movePersonalToSpace(args: {
  movement: PersonalMovement;
  spaceId: string;
  mySlot: Slot;
  split: Split;
  /** C-05 · el medio de pago sigue siendo privado de quien pagó. */
  keepPaymentMethod: boolean;
}): Promise<string> {
  const { movement, spaceId, mySlot, split, keepPaymentMethod } = args;

  const { data, error } = await supabase
    .from('shared_expenses')
    .insert({
      space_id: spaceId,
      amount: movement.amount,
      date: movement.date,
      category: movement.category,
      description: movement.description,
      // Quien cambia el destino es quien lo cargó, así que pagó él.
      payer_slot: mySlot,
      ...splitColumns(movement.amount, split),
      ...installmentColumns(movement.installments),
      created_by_slot: mySlot,
      updated_by_slot: mySlot,
    })
    .select('id')
    .single();

  if (error != null) throw new Error('No pudimos moverlo al espacio.');

  if (keepPaymentMethod && movement.paymentMethodId != null) {
    const detail = await supabase.from('shared_payment_details').insert({
      source_id: data.id,
      space_id: spaceId,
      slot: mySlot,
      payment_method_id: movement.paymentMethodId,
    });
    // O todo o nada: el personal todavía no se borró, así que deshacer el
    // compartido deja todo como estaba.
    if (detail.error != null) {
      await supabase.from('shared_expenses').delete().eq('id', data.id);
      throw new Error('No pudimos moverlo al espacio.');
    }
  }

  await deletePersonalMovementById(movement.id);
  return data.id;
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Gastos compartidos                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

export type SharedExpenseEdit = {
  amount: Pesos;
  date: IsoDate;
  category: Category;
  description: string | null;
  payerSlot: Slot;
  split: Split;
  installmentCount: number | null;
  mySlot: Slot;
  myPaymentMethod: PaymentMethod | null;
  spaceId: string;
};

/** SY-02 · el gasto que se estaba editando ya no existe. */
export class SharedExpenseDeletedError extends Error {
  constructor() {
    super('Este gasto ya no existe.');
    this.name = 'SharedExpenseDeletedError';
  }
}

/**
 * SY-02 · quién eliminó un gasto compartido, según el registro que deja el
 * trigger de la base. `null` si no hay registro: no se inventa a nadie.
 */
export async function fetchSharedExpenseDeletion(
  sourceId: string,
): Promise<{ deletedBySlot: Slot } | null> {
  const { data } = await supabase
    .from('deleted_shared_records')
    .select('deleted_by_slot')
    .eq('source_id', sourceId)
    .maybeSingle();

  if (data == null) return null;
  return { deletedBySlot: data.deleted_by_slot === 1 ? 1 : 2 };
}

/** X-02 / K3 · los dos miembros editan, y se registra el último editor. */
export async function updateSharedExpense(
  id: string,
  input: SharedExpenseEdit,
): Promise<void> {
  const iPaid = input.payerSlot === input.mySlot;

  const plan =
    input.installmentCount != null && input.installmentCount >= 2
      ? planInstallments({
          purchaseDate: input.date,
          count: input.installmentCount,
          card: iPaid && input.myPaymentMethod?.kind === 'card' ? input.myPaymentMethod : null,
        })
      : null;

  const { data, error } = await supabase
    .from('shared_expenses')
    .update({
      amount: input.amount,
      date: input.date,
      category: input.category,
      description: input.description,
      payer_slot: input.payerSlot,
      ...splitColumns(input.amount, input.split),
      ...installmentColumns(plan),
      updated_by_slot: input.mySlot,
    })
    .eq('id', id)
    .select('id');

  if (error != null) throw new Error('No pudimos guardar los cambios.');

  // SY-02 · un UPDATE sobre una fila que ya no existe NO es un error para
  // Postgres: actualiza cero filas y responde OK. Sin este control, la
  // pantalla creía haber guardado y el detalle de pago quedaba huérfano.
  if (data.length === 0) throw new SharedExpenseDeletedError();

  // C-05 · el detalle de pago sigue a quien pagó: si ahora pagó el otro, el
  // medio propio deja de tener sentido y se borra. Lo mismo si pagó él y
  // destildó el medio: sin medio es al contado, y la tarjeta vieja no puede
  // seguir llevándose el gasto a su resumen.
  const detail =
    !iPaid || input.myPaymentMethod == null
      ? await supabase
          .from('shared_payment_details')
          .delete()
          .eq('source_id', id)
          .eq('slot', input.mySlot)
      : await supabase.from('shared_payment_details').upsert({
          source_id: id,
          space_id: input.spaceId,
          slot: input.mySlot,
          payment_method_id: input.myPaymentMethod.id,
        });

  // El gasto ya quedó guardado; volver a guardar es seguro (es un update).
  if (detail.error != null) {
    throw new Error('Guardamos los cambios, pero no con qué lo pagaste. Probá guardar de nuevo.');
  }
}

async function spaceIdOf(sharedExpenseId: string): Promise<string | null> {
  const { data } = await supabase
    .from('shared_expenses')
    .select('space_id')
    .eq('id', sharedExpenseId)
    .maybeSingle();

  return data?.space_id ?? null;
}

/** Q-07 aplicado a una compra compartida en cuotas. */
export async function endSharedInstallmentsNow(
  expense: SharedExpense,
  today: IsoDate,
  mySlot: Slot,
): Promise<void> {
  if (expense.installments == null) return;

  const result = endInstallmentsNow(expense.amount, expense.installments, today);

  if (result.plan.count === 0) {
    const { error } = await supabase.from('shared_expenses').delete().eq('id', expense.id);
    if (error != null) throw new Error('No pudimos terminar las cuotas.');
    return;
  }

  const { error } = await supabase
    .from('shared_expenses')
    .update({
      amount: result.total,
      // C-02 · el reparto se recalcula sobre el total nuevo.
      ...splitColumns(result.total, expense.split),
      ...installmentColumns(result.plan),
      updated_by_slot: mySlot,
    })
    .eq('id', expense.id);

  if (error != null) throw new Error('No pudimos terminar las cuotas.');
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  F-03 · recurrentes                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * F-03 · "Cambiar desde este mes".
 *
 * Cambia el monto del recurrente hacia adelante. Los meses anteriores quedan
 * como estaban, porque ya ocurrieron: cambiarlos reescribiría el pasado y el
 * radar de un mes cerrado dejaría de coincidir con lo que el usuario vio.
 */
export async function changeRecurrenceAmount(
  recurrence: Recurrence,
  amount: Pesos,
  fromMonth: Month,
): Promise<void> {
  const next = changeAmountFrom(recurrence, amount, fromMonth);

  // Un solo update: el monto nuevo y los tramos de antes cambian juntos o no
  // cambia ninguno. Por separado, una falla a mitad reescribía el pasado.
  const { error } = await supabase
    .from('recurrences')
    .update({
      amount: next.amount,
      past_terms: fromPastTerms(next.pastTerms),
      // F-04 · en un compartido personalizado, las partes nuevas en proporción.
      ...(next.split != null ? splitColumns(next.amount, next.split) : {}),
    })
    .eq('id', recurrence.id);

  if (error != null) throw new Error('No pudimos cambiar el monto.');
}

/**
 * F-03 · "Este mes fue distinto".
 *
 * El caso de uso que la spec nombra: luz, gas, ingresos variables. Es lo que
 * hace usable un fijo que nunca sale igual dos meses seguidos, sin obligar a
 * cambiar el monto base.
 *
 * F-04 · en un fijo compartido con reparto personalizado, las partes del mes
 * ajustado se recalculan en la misma proporción. Eso lo hace el dominio al
 * expandir (`proportionalShares`), no hace falta guardarlo.
 */
export async function setMonthOverride(
  recurrenceId: string,
  month: Month,
  amount: Pesos,
): Promise<void> {
  const { error } = await supabase
    .from('recurrence_overrides')
    .upsert({ recurrence_id: recurrenceId, month, amount });

  if (error != null) throw new Error('No pudimos guardar el monto de este mes.');
}

export async function clearMonthOverride(
  recurrenceId: string,
  month: Month,
): Promise<void> {
  const { error } = await supabase
    .from('recurrence_overrides')
    .delete()
    .eq('recurrence_id', recurrenceId)
    .eq('month', month);

  if (error != null) throw new Error('No pudimos volver al monto habitual.');
}

/** F-03 · "Dejar de pagarlo desde…". */
export async function stopRecurrenceFrom(
  recurrenceId: string,
  lastMonth: Month,
): Promise<void> {
  const { error } = await supabase
    .from('recurrences')
    .update({ end_month: lastMonth })
    .eq('id', recurrenceId);

  if (error != null) throw new Error('No pudimos dejar de registrarlo.');
}

/** F-03 · "Corregir": el día del mes y la categoría. */
export async function correctRecurrence(
  recurrenceId: string,
  input: { dayOfMonth?: number; category?: Category; paymentMethodId?: string | null },
): Promise<void> {
  const { error } = await supabase
    .from('recurrences')
    .update({
      ...(input.dayOfMonth != null ? { day_of_month: input.dayOfMonth } : {}),
      ...(input.category != null ? { category: input.category } : {}),
      ...(input.paymentMethodId !== undefined
        ? { payment_method_id: input.paymentMethodId }
        : {}),
    })
    .eq('id', recurrenceId);

  if (error != null) throw new Error('No pudimos guardar los cambios.');
}

export async function deleteRecurrenceById(recurrenceId: string): Promise<void> {
  const { error } = await supabase.from('recurrences').delete().eq('id', recurrenceId);
  if (error != null) throw new Error('No pudimos eliminar el fijo.');
}
