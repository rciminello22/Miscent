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

export async function fetchPersonalFacts(userId: string): Promise<PersonalFacts> {
  const [methods, movements, recurrences, statements, memberships] = await Promise.all([
    supabase.from('payment_methods').select('*').eq('archived', false),
    supabase.from('personal_movements').select('*').order('date', { ascending: false }),
    supabase.from('recurrences').select('*'),
    supabase.from('declared_statements').select('*'),
    supabase.from('space_members').select('space_id, slot').eq('status', 'active'),
  ]);

  throwIfError(methods.error, 'medios de pago');
  throwIfError(movements.error, 'movimientos');
  throwIfError(recurrences.error, 'fijos');
  throwIfError(statements.error, 'resúmenes declarados');
  throwIfError(memberships.error, 'espacios');

  const recurrenceRows = recurrences.data ?? [];
  const overrides = await fetchOverrides(recurrenceRows.map((row) => row.id));

  // K9 · la parte de cada espacio llega al radar calculada, nunca copiada.
  const spaces = await Promise.all(
    (memberships.data ?? []).map((membership) =>
      fetchMembership(membership.space_id, membership.slot as Slot),
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
async function fetchOverrideRows(recurrenceIds: readonly string[]) {
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

function throwIfError(error: { message: string } | null, what: string): void {
  if (error != null) {
    throw new Error(`No pudimos leer tus ${what}.`);
  }
}
