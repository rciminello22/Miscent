/**
 * Escrituras.
 *
 * Un detalle que importa: el plan de cuotas y el mes de pago NO se calculan
 * acá a mano. Se le piden al dominio (`planInstallments`, que implementa Q-02
 * y Q-03 sobre T-03) y recién después se guardan. Así la regla vive en UN solo
 * lugar y es la misma que validan los tests de §29.1.
 */

import { planInstallments } from '@domain/installments';
import type { IsoDate, Month } from '@domain/calendar';
import type { Category, PaymentMethod, PaymentMethodKind, Slot, Split } from '@domain/types';
import type { Pesos } from '@domain/money';
import { supabase } from '../supabase';
import { cardDayColumns, installmentColumns, recurrenceDayColumns, splitColumns } from '../mappers';

/* ────────────────────────────────────────────────────────────────────────── */
/*  Movimientos personales                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

export type NewPersonalMovement = {
  kind: 'expense' | 'income';
  amount: Pesos;
  date: IsoDate;
  category: Category;
  description: string | null;
  paymentMethod: PaymentMethod | null;
  /** §17 campo 8 · cantidad de cuotas, o `null` si es un solo pago. */
  installmentCount: number | null;
  /** Q-04 · el mes de la primera cuota se puede fijar a mano. */
  pinnedFirstMonth: Month | null;
};

export async function createPersonalMovement(
  userId: string,
  input: NewPersonalMovement,
): Promise<string> {
  // Q-02 / Q-03 · el cronograma lo decide el dominio, no esta función.
  const plan =
    input.installmentCount != null && input.installmentCount >= 2
      ? planInstallments({
          purchaseDate: input.date,
          count: input.installmentCount,
          card: input.paymentMethod?.kind === 'card' ? input.paymentMethod : null,
          pinnedFirstMonth: input.pinnedFirstMonth,
        })
      : null;

  const { data, error } = await supabase
    .from('personal_movements')
    .insert({
      user_id: userId,
      kind: input.kind,
      amount: input.amount,
      date: input.date,
      category: input.category,
      description: input.description,
      // Los ingresos no llevan medio de pago ni cuotas (lo valida un CHECK).
      payment_method_id: input.kind === 'income' ? null : (input.paymentMethod?.id ?? null),
      ...(input.kind === 'income' ? installmentColumns(null) : installmentColumns(plan)),
    })
    .select('id')
    .single();

  if (error != null) throw new Error('No pudimos guardar el movimiento.');
  return data.id;
}

export async function deletePersonalMovement(id: string): Promise<void> {
  const { error } = await supabase.from('personal_movements').delete().eq('id', id);
  if (error != null) throw new Error('No pudimos eliminar el movimiento.');
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Medios de pago y tarjetas (T-01, T-02)                                   */
/* ────────────────────────────────────────────────────────────────────────── */

export type NewPaymentMethod = {
  kind: PaymentMethodKind;
  name: string;
  /** T-02 · `null` es "No sé" y activa el modo aproximado (T-05). */
  closingDay: number | null;
  dueDay: number | null;
  /** T-02 · el día salió de un "Más o menos" (2, 15 o 28). */
  closingApprox?: boolean;
  dueApprox?: boolean;
};

export async function createPaymentMethod(
  userId: string,
  input: NewPaymentMethod,
): Promise<string> {
  const { data, error } = await supabase
    .from('payment_methods')
    .insert({
      user_id: userId,
      kind: input.kind,
      name: input.name.trim(),
      // El esquema solo acepta días en tarjetas.
      ...cardDayColumns(
        input.kind === 'card'
          ? input
          : { closingDay: null, dueDay: null },
      ),
    })
    .select('id')
    .single();

  if (error != null) {
    throw new Error(
      input.kind === 'card' ? 'No pudimos guardar la tarjeta.' : 'No pudimos guardar el medio de pago.',
    );
  }
  return data.id;
}

export async function updatePaymentMethod(
  id: string,
  input: Partial<NewPaymentMethod>,
): Promise<void> {
  const { error } = await supabase
    .from('payment_methods')
    .update({
      ...(input.name != null ? { name: input.name.trim() } : {}),
      // Al editar, un día exacto apaga la marca de aproximado que tenía.
      ...cardDayColumns(input, { clearOnExact: true }),
    })
    .eq('id', id);

  if (error != null) throw new Error('No pudimos guardar los cambios.');
}

/**
 * T-07 · resumen pendiente declarado al activar la cuenta personal.
 * "Resumen ya cerrado que el usuario declara sin pagar" — NO es deuda
 * bancaria real.
 */
export async function createDeclaredStatement(
  userId: string,
  input: { paymentMethodId: string; amount: Pesos; dueDate: IsoDate },
): Promise<void> {
  const { error } = await supabase.from('declared_statements').insert({
    user_id: userId,
    payment_method_id: input.paymentMethodId,
    amount: input.amount,
    due_date: input.dueDate,
  });

  if (error != null) throw new Error('No pudimos guardar el resumen pendiente.');
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Recurrentes · "Fijos" (§21)                                              */
/* ────────────────────────────────────────────────────────────────────────── */

export type NewRecurrence = {
  kind: 'expense' | 'income';
  amount: Pesos;
  category: Category;
  /** `null` ("No sé") solo en un ingreso personal. */
  dayOfMonth: number | null;
  /** El día salió de un "Más o menos" (2, 15 o 28). */
  dayApprox?: boolean;
  startMonth: Month;
  endMonth: Month | null;
  paymentMethodId: string | null;
  /** "Luz", "Monotributo". Vacío → se muestra por su categoría. */
  description?: string | null;
  /** Solo si es del espacio. */
  spaceId?: string | null;
  payerSlot?: Slot | null;
  split?: Split | null;
};

/** El CHECK de la base no acepta texto vacío: vacío es `null`. */
export function cleanDescription(description: string | null | undefined): string | null {
  const trimmed = description?.trim() ?? '';
  return trimmed === '' ? null : trimmed.slice(0, 140);
}

export async function createRecurrence(
  userId: string,
  input: NewRecurrence,
): Promise<string> {
  const shared = input.spaceId != null;

  const { data, error } = await supabase
    .from('recurrences')
    .insert({
      kind: input.kind,
      amount: input.amount,
      category: input.category,
      description: cleanDescription(input.description),
      ...recurrenceDayColumns({ dayOfMonth: input.dayOfMonth, dayApprox: input.dayApprox }),
      start_month: input.startMonth,
      end_month: input.endMonth,
      // El esquema exige exactamente uno de los dos (CHECK personal_xor_shared).
      owner_user_id: shared ? null : userId,
      space_id: input.spaceId ?? null,
      payment_method_id: input.paymentMethodId,
      payer_slot: input.payerSlot ?? null,
      ...(shared && input.split != null
        ? splitColumns(input.amount, input.split)
        : { split_mode: null, share_slot_1: null, share_slot_2: null }),
    })
    .select('id')
    .single();

  if (error != null) throw new Error('No pudimos guardar el fijo.');
  return data.id;
}

/** F-03 · "Este mes fue distinto": luz, gas, ingresos variables. */
export async function setRecurrenceOverride(
  recurrenceId: string,
  month: Month,
  amount: Pesos,
): Promise<void> {
  const { error } = await supabase
    .from('recurrence_overrides')
    .upsert({ recurrence_id: recurrenceId, month, amount });

  if (error != null) throw new Error('No pudimos guardar el monto de este mes.');
}

/** F-03 · "Dejar de pagarlo desde…". */
export async function stopRecurrence(recurrenceId: string, lastMonth: Month): Promise<void> {
  const { error } = await supabase
    .from('recurrences')
    .update({ end_month: lastMonth })
    .eq('id', recurrenceId);

  if (error != null) throw new Error('No pudimos dejar de registrarlo.');
}

export async function deleteRecurrence(recurrenceId: string): Promise<void> {
  const { error } = await supabase.from('recurrences').delete().eq('id', recurrenceId);
  if (error != null) throw new Error('No pudimos eliminar el fijo.');
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Cuenta personal                                                          */
/* ────────────────────────────────────────────────────────────────────────── */

/** A-02 / K0 · la activación es explícita. A-04 · no cambia nada más. */
export async function activatePersonalAccount(): Promise<void> {
  const { error } = await supabase.rpc('app_activate_personal_account');
  if (error != null) throw new Error('No pudimos activar tu cuenta personal.');
}

export async function updateDisplayName(name: string): Promise<void> {
  const { error } = await supabase.auth.getUser().then(async ({ data }) => {
    if (data.user == null) return { error: { message: 'sin sesión' } };
    return supabase.from('profiles').update({ display_name: name.trim() }).eq('id', data.user.id);
  });

  if (error != null) throw new Error('No pudimos guardar tu nombre.');
}

/** Crea el perfil la primera vez que el usuario entra. */
export async function ensureProfile(userId: string, displayName: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, display_name: displayName }, { onConflict: 'id', ignoreDuplicates: true });

  if (error != null) throw new Error('No pudimos crear tu perfil.');
}
