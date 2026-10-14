/**
 * Espacios compartidos.
 *
 * Todo lo de acá lo ven los DOS miembros, salvo `shared_payment_details`, que
 * RLS filtra por slot (C-05): cada uno ve únicamente con qué pagó él.
 *
 * Las operaciones que validan una regla que un cliente podría saltearse van
 * por RPC: crear espacio (P5), invitar (K6) y aceptar (P4). El resto son
 * escrituras simples con RLS.
 */

import { planInstallments } from '@domain/installments';
import type { IsoDate, Month } from '@domain/calendar';
import type { Pesos } from '@domain/money';
import type {
  Category,
  PaymentMethod,
  Review,
  Slot,
  SpaceFacts,
  Split,
} from '@domain/types';
import { supabase } from '../supabase';
import { installmentColumns, splitColumns, toReview, toSpaceFacts } from '../mappers';
import { ownActiveMemberships } from '../memberships';
import { fetchOverrideRows, throwIfError } from './personal';
import { cleanDescription } from './mutations';

export type SpaceSummary = {
  id: string;
  name: string;
  mySlot: Slot;
  otherMemberName: string;
  /** E-02 · el lugar del otro puede existir solo como nombre. */
  otherHasAccess: boolean;
  /** SA-02 / K4 · "Martina · ex miembro". */
  otherIsFormer: boolean;
};

/** §14 · la lista de Compartidos. Con uno solo, la app entra directo. */
export async function fetchMySpaces(): Promise<SpaceSummary[]> {
  const { data: auth } = await supabase.auth.getSession();
  const userId = auth.session?.user.id;
  if (userId == null) return [];

  const { data, error } = await supabase
    .from('space_members')
    .select('space_id, slot, user_id, status, spaces(id, name)');

  if (error != null) throw new Error('No pudimos leer tus espacios.');

  // Solo las filas PROPIAS: la RLS devuelve también la del otro miembro, y
  // cuando el otro entraba cada espacio aparecía dos veces.
  const rows = data ?? [];
  const names = new Map(rows.map((row) => [row.space_id, row.spaces?.name ?? 'Espacio']));

  const summaries = await Promise.all(
    ownActiveMemberships(rows, userId).map(async (membership) => {
      const { data: members } = await supabase
        .from('space_members')
        .select('slot, display_name, status')
        .eq('space_id', membership.spaceId);

      const other = (members ?? []).find((member) => member.slot !== membership.slot);

      return {
        id: membership.spaceId,
        name: names.get(membership.spaceId) ?? 'Espacio',
        mySlot: membership.slot as Slot,
        otherMemberName: other?.display_name ?? '',
        otherHasAccess: other?.status === 'active',
        otherIsFormer: other?.status === 'former',
      };
    }),
  );

  return summaries;
}

export async function fetchSpaceFacts(
  spaceId: string,
): Promise<{ facts: SpaceFacts; mySlot: Slot; reviews: Review[] }> {
  const [space, members, expenses, recurrences, payments, me, reviews] = await Promise.all([
    supabase.from('spaces').select('*').eq('id', spaceId).single(),
    supabase.from('space_members').select('*').eq('space_id', spaceId).order('slot'),
    supabase.from('shared_expenses').select('*').eq('space_id', spaceId),
    supabase.from('recurrences').select('*').eq('space_id', spaceId),
    supabase.from('member_payments').select('*').eq('space_id', spaceId),
    supabase.rpc('app_my_slot', { target_space_id: spaceId }),
    // Opción B · la RLS devuelve solo las revisiones propias.
    supabase.from('record_reviews').select('*').eq('space_id', spaceId),
  ]);

  if (space.error != null || space.data == null) {
    throw new Error('No pudimos abrir este espacio.');
  }
  throwIfError(members.error, 'miembros');
  throwIfError(expenses.error, 'gastos compartidos');
  throwIfError(recurrences.error, 'fijos compartidos');
  throwIfError(payments.error, 'pagos entre miembros');
  throwIfError(reviews.error, 'revisiones');
  // Nunca suponer el lugar: con el slot equivocado, el saldo sale invertido y
  // "tu parte" es la del otro (K9).
  if (me.error != null || me.data == null) throw new Error('No pudimos abrir este espacio.');

  const recurrenceRows = recurrences.data ?? [];
  // F-03 · sin los ajustes, "Este mes fue distinto" se perdería en silencio.
  const overrides = await fetchOverrideRows(recurrenceRows.map((row) => row.id));

  return {
    facts: toSpaceFacts({
      space: space.data,
      members: members.data ?? [],
      expenses: expenses.data ?? [],
      recurrences: recurrenceRows,
      overrides,
      payments: payments.data ?? [],
    }),
    mySlot: me.data as Slot,
    reviews: (reviews.data ?? []).map((row) => toReview(row)),
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Escrituras                                                               */
/* ────────────────────────────────────────────────────────────────────────── */

/** A-06 / P5 · la RPC rechaza al usuario sin cuenta personal (CA-47). */
export async function createSpace(input: {
  name: string;
  otherMemberName: string;
  initialBalance?: Pesos;
  initialBalanceFavors?: 'me' | 'other';
}): Promise<string> {
  const { data, error } = await supabase.rpc('app_create_space', {
    space_name: input.name.trim(),
    other_member_name: input.otherMemberName.trim(),
    initial_balance: input.initialBalance ?? 0,
    initial_balance_favors: input.initialBalanceFavors ?? 'me',
  });

  if (error != null) {
    // CA-47 · el mensaje de P5 viene de la base, para no duplicar la regla.
    throw new Error(
      error.message.includes('P5')
        ? 'Para crear un espacio necesitás tu cuenta personal.'
        : 'No pudimos crear el espacio.',
    );
  }
  return data as string;
}

export async function renameSpace(spaceId: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('spaces')
    .update({ name: name.trim() })
    .eq('id', spaceId);

  if (error != null) throw new Error('No pudimos cambiar el nombre.');
}

export type NewSharedExpense = {
  spaceId: string;
  amount: Pesos;
  date: IsoDate;
  category: Category;
  description: string | null;
  /** G-06 · quién fue DECLARADO como pagador. */
  payerSlot: Slot;
  /** P3 · 50/50 o personalizado por monto. */
  split: Split;
  mySlot: Slot;
  installmentCount: number | null;
  pinnedFirstMonth: Month | null;
  /**
   * C-05 · con qué pagó. Es un detalle PRIVADO y solo se guarda si el pagador
   * es el propio usuario: nadie puede declarar con qué pagó el otro.
   */
  myPaymentMethod: PaymentMethod | null;
};

export async function createSharedExpense(input: NewSharedExpense): Promise<string> {
  const iPaid = input.payerSlot === input.mySlot;

  // Q-02 / Q-03 · el cronograma lo decide el dominio. Para una compra en
  // cuotas que pagó el OTRO miembro, no hay tarjeta conocida (C-05), así que
  // cae en Q-03: un mes después, el mismo día.
  const plan =
    input.installmentCount != null && input.installmentCount >= 2
      ? planInstallments({
          purchaseDate: input.date,
          count: input.installmentCount,
          card: iPaid && input.myPaymentMethod?.kind === 'card' ? input.myPaymentMethod : null,
          pinnedFirstMonth: input.pinnedFirstMonth,
        })
      : null;

  const { data, error } = await supabase
    .from('shared_expenses')
    .insert({
      space_id: input.spaceId,
      amount: input.amount,
      date: input.date,
      category: input.category,
      description: input.description,
      payer_slot: input.payerSlot,
      ...splitColumns(input.amount, input.split),
      ...installmentColumns(plan),
      // K3 · la autoría se registra y RLS no deja falsearla.
      created_by_slot: input.mySlot,
      updated_by_slot: input.mySlot,
    })
    .select('id')
    .single();

  if (error != null) throw new Error('No pudimos guardar el gasto.');

  // C-05 · el medio de pago, solo si lo pagó el propio usuario.
  if (iPaid && input.myPaymentMethod != null) {
    const detail = await supabase.from('shared_payment_details').insert({
      source_id: data.id,
      space_id: input.spaceId,
      slot: input.mySlot,
      payment_method_id: input.myPaymentMethod.id,
    });
    // O todo o nada: sin el medio, el gasto no llega al resumen de la tarjeta,
    // y dejarlo guardado invita a tocar Guardar otra vez y duplicarlo.
    if (detail.error != null) {
      await supabase.from('shared_expenses').delete().eq('id', data.id);
      throw new Error('No pudimos guardar el gasto.');
    }
  }

  return data.id;
}

/** X-02 / K3 · los dos miembros con acceso eliminan cualquier registro. */
export async function deleteSharedExpense(id: string): Promise<void> {
  const { error } = await supabase.from('shared_expenses').delete().eq('id', id);
  if (error != null) throw new Error('No pudimos eliminar el gasto.');
}

/** §21 · fijo compartido: cada mes es una ocurrencia compartida (F-04). */
export async function createSharedRecurrence(input: {
  spaceId: string;
  amount: Pesos;
  category: Category;
  dayOfMonth: number;
  startMonth: Month;
  payerSlot: Slot;
  split: Split;
  myPaymentMethodId: string | null;
  mySlot: Slot;
  description?: string | null;
}): Promise<string> {
  const { data, error } = await supabase
    .from('recurrences')
    .insert({
      kind: 'expense',
      amount: input.amount,
      category: input.category,
      description: cleanDescription(input.description),
      day_of_month: input.dayOfMonth,
      start_month: input.startMonth,
      end_month: null,
      owner_user_id: null,
      space_id: input.spaceId,
      payer_slot: input.payerSlot,
      ...splitColumns(input.amount, input.split),
      // El medio de pago de un fijo compartido también es privado de quien
      // paga, así que va en shared_payment_details y no en esta columna.
      payment_method_id: null,
    })
    .select('id')
    .single();

  if (error != null) throw new Error('No pudimos guardar el fijo compartido.');

  if (input.payerSlot === input.mySlot && input.myPaymentMethodId != null) {
    const detail = await supabase.from('shared_payment_details').insert({
      source_id: data.id,
      space_id: input.spaceId,
      slot: input.mySlot,
      payment_method_id: input.myPaymentMethodId,
    });
    // O todo o nada, igual que en createSharedExpense.
    if (detail.error != null) {
      await supabase.from('recurrences').delete().eq('id', data.id);
      throw new Error('No pudimos guardar el fijo compartido.');
    }
  }

  return data.id;
}

/** P-01 a P-04 · un pago entre miembros es una declaración. */
export async function createMemberPayment(input: {
  spaceId: string;
  fromSlot: Slot;
  toSlot: Slot;
  amount: Pesos;
  date: IsoDate;
  mySlot: Slot;
}): Promise<string> {
  const { data, error } = await supabase
    .from('member_payments')
    .insert({
      space_id: input.spaceId,
      from_slot: input.fromSlot,
      to_slot: input.toSlot,
      amount: input.amount,
      date: input.date,
      recorded_by_slot: input.mySlot,
    })
    .select('id')
    .single();

  if (error != null) throw new Error('No pudimos registrar el pago.');
  return data.id;
}

/**
 * §26 (Should) · el creador quita el acceso de quien entró por un enlace
 * reenviado. El lugar vuelve a "sin acceso" y se puede invitar de nuevo. Lo
 * controla el servidor: solo funciona para quien creó el espacio.
 */
export async function removeMemberAccess(spaceId: string): Promise<void> {
  const { error } = await supabase.rpc('app_remove_member_access', {
    target_space_id: spaceId,
  });
  if (error != null) throw new Error('No pudimos quitar el acceso.');
}

/**
 * SA-04 · "¿Lo seguís pagando vos?". Pasarlo a mis fijos (keep) crea el fijo
 * personal y marca la decisión en UNA transacción del servidor: con dos
 * escrituras, reintentar después de una falla duplicaba el alquiler.
 */
export async function resolveStoppedRecurrence(
  recurrenceId: string,
  keep: boolean,
): Promise<string | null> {
  const { data, error } = await supabase.rpc('app_resolve_stopped_recurrence', {
    target_recurrence_id: recurrenceId,
    keep,
  });
  if (error != null) {
    // Ya resuelto en otro teléfono: no es un error para quien lo ve.
    if (error.code === '23505') return null;
    throw new Error('No pudimos guardar lo que decidiste.');
  }
  return data ?? null;
}

/**
 * Opción B · "Está bien": marca como revisado lo que cargó el otro. Solo por
 * la función del servidor: nadie marca en nombre del otro.
 */
export async function markReviewed(spaceId: string, sourceIds: readonly string[]): Promise<void> {
  if (sourceIds.length === 0) return;
  const { error } = await supabase.rpc('app_mark_reviewed', {
    target_space_id: spaceId,
    source_ids: [...sourceIds],
  });
  if (error != null) throw new Error('No pudimos marcarlo como revisado.');
}

export async function deleteMemberPayment(id: string): Promise<void> {
  const { error } = await supabase.from('member_payments').delete().eq('id', id);
  if (error != null) throw new Error('No pudimos eliminar el pago.');
}

/** E-07 · saldo inicial, visible y editable por los dos. */
export async function setInitialBalance(
  spaceId: string,
  amount: Pesos,
  favors: 'slot1' | 'slot2',
): Promise<void> {
  const { error } = await supabase
    .from('spaces')
    .update({ initial_balance: favors === 'slot1' ? Math.abs(amount) : -Math.abs(amount) })
    .eq('id', spaceId);

  if (error != null) throw new Error('No pudimos guardar el saldo inicial.');
}
