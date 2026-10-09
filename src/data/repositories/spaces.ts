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
  Slot,
  SpaceFacts,
  Split,
} from '@domain/types';
import { supabase } from '../supabase';
import { installmentColumns, splitColumns, toSpaceFacts } from '../mappers';

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
  const { data, error } = await supabase
    .from('space_members')
    .select('space_id, slot, spaces(id, name)')
    .eq('status', 'active');

  if (error != null) throw new Error('No pudimos leer tus espacios.');

  const summaries = await Promise.all(
    (data ?? []).map(async (membership) => {
      const { data: members } = await supabase
        .from('space_members')
        .select('slot, display_name, status')
        .eq('space_id', membership.space_id);

      const other = (members ?? []).find((member) => member.slot !== membership.slot);

      return {
        id: membership.space_id,
        name: membership.spaces?.name ?? 'Espacio',
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
): Promise<{ facts: SpaceFacts; mySlot: Slot }> {
  const [space, members, expenses, recurrences, payments, me] = await Promise.all([
    supabase.from('spaces').select('*').eq('id', spaceId).single(),
    supabase.from('space_members').select('*').eq('space_id', spaceId).order('slot'),
    supabase.from('shared_expenses').select('*').eq('space_id', spaceId),
    supabase.from('recurrences').select('*').eq('space_id', spaceId),
    supabase.from('member_payments').select('*').eq('space_id', spaceId),
    supabase.rpc('app_my_slot', { target_space_id: spaceId }),
  ]);

  if (space.error != null || space.data == null) {
    throw new Error('No pudimos abrir este espacio.');
  }

  const recurrenceRows = recurrences.data ?? [];
  const overrides =
    recurrenceRows.length === 0
      ? []
      : ((
          await supabase
            .from('recurrence_overrides')
            .select('*')
            .in(
              'recurrence_id',
              recurrenceRows.map((row) => row.id),
            )
        ).data ?? []);

  return {
    facts: toSpaceFacts({
      space: space.data,
      members: members.data ?? [],
      expenses: expenses.data ?? [],
      recurrences: recurrenceRows,
      overrides,
      payments: payments.data ?? [],
    }),
    mySlot: (me.data ?? 1) as Slot,
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
    await supabase.from('shared_payment_details').insert({
      source_id: data.id,
      space_id: input.spaceId,
      slot: input.mySlot,
      payment_method_id: input.myPaymentMethod.id,
    });
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
}): Promise<string> {
  const { data, error } = await supabase
    .from('recurrences')
    .insert({
      kind: 'expense',
      amount: input.amount,
      category: input.category,
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
    await supabase.from('shared_payment_details').insert({
      source_id: data.id,
      space_id: input.spaceId,
      slot: input.mySlot,
      payment_method_id: input.myPaymentMethodId,
    });
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
}): Promise<void> {
  const { error } = await supabase.from('member_payments').insert({
    space_id: input.spaceId,
    from_slot: input.fromSlot,
    to_slot: input.toSlot,
    amount: input.amount,
    date: input.date,
    recorded_by_slot: input.mySlot,
  });

  if (error != null) throw new Error('No pudimos registrar el pago.');
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
