/**
 * SA-05 · P6 · la foto que se llevó quien salió de un espacio
 * (former_memberships, 0018) → una membresía más de su cuenta personal, con
 * la fecha de salida.
 *
 * El dominio ya sabe qué hacer con `leftOn`: los meses pasados quedan como
 * estaban, sus cuotas compartidas siguen en Futuro ("Casa · ya no sos
 * miembro") y los fijos se cortan.
 *
 * La foto la arma el servidor con las mismas filas que lee la app, así que se
 * mapea con los mismos mappers. Una foto mal formada falla en vez de cambiar
 * un radar en silencio. TS puro: se testea en node.
 */

import type { PersonalFacts, Slot } from '@domain/types';
import type { Database, Json } from './database.types';
import { toSharedPaymentDetail, toSpaceFacts } from './mappers';

type Tables = Database['public']['Tables'];
type Row<T extends keyof Tables> = Tables[T]['Row'];

function fail(): never {
  throw new Error('No pudimos leer un espacio del que saliste.');
}

function list<T>(value: unknown): T[] {
  if (!Array.isArray(value)) fail();
  return value as T[];
}

export function toFormerMembership(row: {
  slot: number;
  left_at: string;
  snapshot: Json;
}): PersonalFacts['spaces'][number] {
  const snapshot = row.snapshot;
  if (snapshot == null || typeof snapshot !== 'object' || Array.isArray(snapshot)) fail();
  const space = snapshot.space;
  if (space == null || typeof space !== 'object' || Array.isArray(space)) fail();

  // En la foto no viaja el user_id de nadie (0018): el lugar es lo que importa.
  const members = list<Omit<Row<'space_members'>, 'user_id'>>(snapshot.members).map((member) => ({
    ...member,
    user_id: null,
  }));

  return {
    facts: toSpaceFacts({
      space: space as unknown as Row<'spaces'>,
      members: members as Row<'space_members'>[],
      expenses: list<Row<'shared_expenses'>>(snapshot.expenses),
      recurrences: list<Row<'recurrences'>>(snapshot.recurrences),
      overrides: list<Row<'recurrence_overrides'>>(snapshot.overrides),
      payments: list<Row<'member_payments'>>(snapshot.payments),
    }),
    mySlot: (row.slot === 1 ? 1 : 2) as Slot,
    paymentDetails: list<Row<'shared_payment_details'>>(snapshot.payment_details).map(toSharedPaymentDetail),
    // SA-05 · desde cuándo dejan de contar los fijos.
    leftOn: row.left_at.slice(0, 10),
    // Ya no revisa nada: no ve lo que cambia después (SA-02).
    reviews: [],
    deletions: [],
  };
}
