/**
 * Lectura de los hechos de una cuenta personal.
 *
 * Trae HECHOS, nunca cifras calculadas. El radar, Futuro, Próximos pagos y el
 * saldo salen del dominio a partir de esto (§7.4).
 *
 * Nada acá filtra por usuario a mano: eso lo hace RLS. Si una query devuelve
 * una fila, es porque Postgres decidió que este usuario puede verla.
 */

import type { PersonalFacts, Slot } from '@domain/types';
import { supabase } from '../supabase';
import {
  toDeclaredStatement,
  toPaymentMethod,
  toPersonalMovement,
  toRecurrence,
  toRecurrenceOverride,
  toSharedPaymentDetail,
  toSpaceFacts,
} from '../mappers';
import { ownActiveMemberships } from '../memberships';

export async function fetchPersonalFacts(userId: string): Promise<PersonalFacts> {
  const [methods, movements, recurrences, statements, memberships] = await Promise.all([
    supabase.from('payment_methods').select('*').eq('archived', false),
    supabase.from('personal_movements').select('*').order('date', { ascending: false }),
    supabase.from('recurrences').select('*'),
    supabase.from('declared_statements').select('*'),
    supabase.from('space_members').select('space_id, slot, user_id, status'),
  ]);

  throwIfError(methods.error, 'medios de pago');
  throwIfError(movements.error, 'movimientos');
  throwIfError(recurrences.error, 'fijos');
  throwIfError(statements.error, 'resúmenes declarados');
  throwIfError(memberships.error, 'espacios');

  const recurrenceRows = recurrences.data ?? [];
  const overrides = await fetchOverrides(recurrenceRows.map((row) => row.id));

  // K9 · la parte de cada espacio llega al radar calculada, nunca copiada.
  // Solo con las filas PROPIAS: con las del otro, el radar sumaba su parte.
  const spaces = await Promise.all(
    ownActiveMemberships(memberships.data ?? [], userId).map((membership) =>
      fetchMembership(membership.spaceId, membership.slot),
    ),
  );

  return {
    userId,
    paymentMethods: (methods.data ?? []).map(toPaymentMethod),
    movements: (movements.data ?? []).map(toPersonalMovement),
    // Los recurrentes personales son los que NO pertenecen a un espacio; los
    // compartidos llegan dentro de cada membresía, como hechos del espacio.
    recurrences: recurrenceRows.filter((row) => row.space_id == null).map(toRecurrence),
    overrides,
    declaredStatements: (statements.data ?? []).map(toDeclaredStatement),
    spaces,
  };
}

async function fetchMembership(
  spaceId: string,
  mySlot: Slot,
): Promise<PersonalFacts['spaces'][number]> {
  const [space, members, expenses, recurrences, payments, details, myMember] = await Promise.all([
    supabase.from('spaces').select('*').eq('id', spaceId).single(),
    supabase.from('space_members').select('*').eq('space_id', spaceId),
    supabase.from('shared_expenses').select('*').eq('space_id', spaceId),
    supabase.from('recurrences').select('*').eq('space_id', spaceId),
    supabase.from('member_payments').select('*').eq('space_id', spaceId),
    // PR-02 · RLS solo devuelve los detalles de pago del propio usuario.
    supabase.from('shared_payment_details').select('*').eq('space_id', spaceId),
    supabase.from('space_members').select('left_at').eq('space_id', spaceId).eq('slot', mySlot).single(),
  ]);

  throwIfError(space.error, 'espacio');
  throwIfError(members.error, 'miembros');
  throwIfError(expenses.error, 'gastos compartidos');
  throwIfError(recurrences.error, 'fijos compartidos');
  throwIfError(payments.error, 'pagos entre miembros');
  // Sin los detalles, los gastos que pagó con tarjeta no llegan a su resumen.
  throwIfError(details.error, 'medios de pago de los gastos compartidos');
  // Sin left_at, SA-05 no sabe desde cuándo dejar de contar los fijos.
  throwIfError(myMember.error, 'espacios');

  const recurrenceRows = recurrences.data ?? [];
  const overrideRows = await fetchOverrideRows(recurrenceRows.map((row) => row.id));

  return {
    facts: toSpaceFacts({
      space: space.data!,
      members: members.data ?? [],
      expenses: expenses.data ?? [],
      recurrences: recurrenceRows,
      overrides: overrideRows,
      payments: payments.data ?? [],
    }),
    mySlot,
    paymentDetails: (details.data ?? []).map(toSharedPaymentDetail),
    // SA-05 · si salió, sus cuotas compartidas siguen pero los fijos no.
    leftOn: myMember.data?.left_at?.slice(0, 10) ?? null,
  };
}

/**
 * Las filas crudas, porque `toSpaceFacts` hace el mapeo él mismo. Devolver
 * acá los tipos del dominio obligaría a mapear dos veces, y el tipado lo
 * detecta.
 */
export async function fetchOverrideRows(recurrenceIds: readonly string[]) {
  if (recurrenceIds.length === 0) return [];
  const { data, error } = await supabase
    .from('recurrence_overrides')
    .select('*')
    .in('recurrence_id', [...recurrenceIds]);

  throwIfError(error, 'ajustes de un mes');
  return data ?? [];
}

async function fetchOverrides(recurrenceIds: readonly string[]) {
  return (await fetchOverrideRows(recurrenceIds)).map(toRecurrenceOverride);
}

/**
 * Toda lectura mira su error. Un `data ?? []` sin esto convierte una falla de
 * red en "no hay nada": un saldo en cero o un Futuro vacío, sin aviso.
 */
export function throwIfError(error: { message: string } | null, what: string): void {
  if (error != null) {
    throw new Error(`No pudimos leer tus ${what}.`);
  }
}
