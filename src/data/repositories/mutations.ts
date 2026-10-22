/**
 * Escrituras.
 *
 * Un detalle que importa: el plan de cuotas y el mes de pago NO se calculan
 * acá a mano. Se le piden al dominio (`planInstallments`, que implementa Q-02
 * y Q-03 sobre T-03) y recién después se guardan. Así la regla vive en UN solo
 * lugar y es la misma que validan los tests de §29.1.
 */

import { hasInstallmentPlan, planInstallments } from '@domain/installments';
import type { IsoDate, Month } from '@domain/calendar';
import type { Category, InstallmentPlan, PaymentMethod, PaymentMethodKind, Slot, Split } from '@domain/types';
import type { Pesos } from '@domain/money';
import { supabase } from '../supabase';
import { newId } from '../ids';
import { isMissingFunction } from '../pendingMigration';
import { rpcWithNulls } from '../rpc';
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
  /**
   * El id que generó el formulario (`newId`), el mismo en cada reintento: así
   * un doble toque o una respuesta perdida no crea un segundo movimiento.
   */
  id?: string;
};

export async function createPersonalMovement(
  userId: string,
  input: NewPersonalMovement,
): Promise<string> {
  // Q-02 / Q-03 · el cronograma lo decide el dominio, no esta función.
  const plan = hasInstallmentPlan(input.installmentCount)
    ? planInstallments({
        purchaseDate: input.date,
        count: input.installmentCount,
        card: input.paymentMethod?.kind === 'card' ? input.paymentMethod : null,
        pinnedFirstMonth: input.pinnedFirstMonth,
      })
    : null;

  // Upsert por el id del formulario: el reintento pisa la misma fila, con lo
  // último que tenía el formulario.
  const { data, error } = await supabase
    .from('personal_movements')
    .upsert({
      id: input.id ?? newId(),
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
 * P24 · eliminar una tarjeta es MARCARLA (`deleted_at`), no borrar la fila: si
 * se borrara, sus compras en 1 pago quedarían sin tarjeta y pasarían de
 * Comprometido a Gastado, reescribiendo meses que ya pasaron. Marcada
 * desaparece de las listas y de los selectores, y el historial se sigue
 * calculando con ella. La regla de CUÁNDO se puede (`cardRetention`) la aplica
 * la pantalla: la base no la sabe.
 */
export async function deletePaymentMethod(id: string): Promise<void> {
  const { error } = await supabase
    .from('payment_methods')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error != null) throw new Error('No pudimos eliminar la tarjeta.');
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

/**
 * O3 paso 4 · todo lo que ya debía con UNA tarjeta al activar la cuenta: el
 * resumen pendiente (T-07), las cuotas en curso (Q-06) y los consumos desde el
 * último cierre (T-08).
 *
 * H-01 · se guarda en una transacción y REEMPLAZA lo que este mismo paso había
 * guardado para esa tarjeta: continuar dos veces, volver atrás y seguir, o
 * reintentar después de una falla dejan una sola vez cada cosa.
 */
export type CardDebt = {
  cardId: string;
  /** T-07 · `null` si pagó el último resumen. */
  pending: { amount: Pesos; dueDate: IsoDate } | null;
  /** Q-06 · cada compra, ya con el plan de las cuotas que faltan. */
  purchases: { remainingTotal: Pesos; description: string | null; plan: InstallmentPlan }[];
  /** T-08 · 0 si no gastó nada desde el cierre. */
  recentSpending: Pesos;
  today: IsoDate;
};

export async function saveCardDebt(userId: string, debt: CardDebt): Promise<void> {
  const { error } = await rpcWithNulls<null>('app_save_card_debt', {
    p_card_id: debt.cardId,
    p_pending_amount: debt.pending?.amount ?? 0,
    p_pending_due_date: debt.pending?.dueDate ?? null,
    p_purchases: debt.purchases.map((purchase) => ({
      amount: purchase.remainingTotal,
      description: cleanDescription(purchase.description),
      count: purchase.plan.count,
      first_month: purchase.plan.firstMonth,
      impact_day: purchase.plan.impactDay,
      approximate: purchase.plan.approximate,
    })),
    p_recent_amount: debt.recentSpending,
    p_today: debt.today,
  });

  if (error == null) return;
  if (!isMissingFunction(error)) throw new Error('No pudimos guardarlo.');

  // Sin la 0022 todavía: el camino de antes, que no se puede deshacer a mitad.
  await saveCardDebtWithoutTransaction(userId, debt);
}

async function saveCardDebtWithoutTransaction(userId: string, debt: CardDebt): Promise<void> {
  if (debt.pending != null) {
    await createDeclaredStatement(userId, { paymentMethodId: debt.cardId, ...debt.pending });
  }
  const rows = [
    ...debt.purchases.map((purchase) => ({
      user_id: userId,
      kind: 'expense' as const,
      amount: purchase.remainingTotal,
      date: debt.today,
      category: 'otros' as const,
      description: cleanDescription(purchase.description),
      payment_method_id: debt.cardId,
      ...installmentColumns(purchase.plan),
    })),
    ...(debt.recentSpending > 0
      ? [
          {
            user_id: userId,
            kind: 'expense' as const,
            amount: debt.recentSpending,
            date: debt.today,
            category: 'otros' as const,
            description: 'Consumos previos (aprox.)',
            payment_method_id: debt.cardId,
            ...installmentColumns(null),
          },
        ]
      : []),
  ];
  if (rows.length === 0) return;
  const { error } = await supabase.from('personal_movements').insert(rows);
  if (error != null) throw new Error('No pudimos guardar las cuotas.');
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
  /** El id del formulario, el mismo en cada reintento (ver `NewPersonalMovement`). */
  id?: string;
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
    .upsert({
      id: input.id ?? newId(),
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
