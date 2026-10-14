/**
 * Mapeo entre las filas de Postgres y los hechos del dominio.
 *
 * Este archivo es la única frontera entre los dos mundos, y existe por una
 * razón concreta: el dominio no sabe que hay una base de datos. Sus tipos
 * hablan de meses como "2026-10" y de slots 1 y 2, no de `month_text` ni de
 * `smallint`. Si el dominio importara los tipos generados de Supabase,
 * cambiar una columna rompería las reglas de negocio.
 *
 * La conversión es casi trivial a propósito: el esquema se diseñó para que lo
 * sea (ver supabase/migrations/..._schema.sql).
 */

import type { Database } from './database.types';
import { toPastTerms } from './pastTerms';
import type {
  DeclaredStatement,
  DeletedRecord,
  InstallmentPlan,
  Member,
  MemberPayment,
  PaymentMethod,
  PersonalMovement,
  Recurrence,
  RecurrenceOverride,
  Review,
  SharedExpense,
  SharedPaymentDetail,
  Slot,
  Space,
  SpaceFacts,
  Split,
} from '@domain/types';

type Tables = Database['public']['Tables'];
type Row<T extends keyof Tables> = Tables[T]['Row'];

function toSlot(value: number): Slot {
  if (value !== 1 && value !== 2) {
    // E-01 · el esquema lo garantiza con un CHECK; si llega otra cosa, es un bug.
    throw new Error(`Slot inválido: ${value}. Un espacio tiene exactamente dos.`);
  }
  return value;
}

export function toPaymentMethod(row: Row<'payment_methods'>): PaymentMethod {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    closingDay: row.closing_day,
    dueDay: row.due_day,
  };
}

export function toDeclaredStatement(row: Row<'declared_statements'>): DeclaredStatement {
  return {
    id: row.id,
    paymentMethodId: row.payment_method_id,
    amount: row.amount,
    dueDate: row.due_date,
  };
}

/** Q · el plan de cuotas es un hecho persistido, no un cálculo (ver Q-04). */
function toInstallmentPlan(row: {
  installments_count: number | null;
  first_installment_month: string | null;
  installment_impact_day: number | null;
  installments_approximate: boolean;
}): InstallmentPlan | null {
  if (row.installments_count == null || row.first_installment_month == null) return null;

  return {
    count: row.installments_count,
    firstMonth: row.first_installment_month,
    impactDay: row.installment_impact_day,
    approximate: row.installments_approximate,
  };
}

export function toPersonalMovement(row: Row<'personal_movements'>): PersonalMovement {
  return {
    id: row.id,
    kind: row.kind,
    amount: row.amount,
    date: row.date,
    category: row.category,
    description: row.description,
    paymentMethodId: row.payment_method_id,
    installments: toInstallmentPlan(row),
  };
}

/** C-03 / P3 · 50/50 o personalizado por monto. Sin porcentajes. */
function toSplit(row: {
  split_mode: 'even' | 'custom';
  share_slot_1: number | null;
  share_slot_2: number | null;
}): Split {
  if (row.split_mode === 'even') return { mode: 'even' };
  return {
    mode: 'custom',
    shareSlot1: row.share_slot_1 ?? 0,
    shareSlot2: row.share_slot_2 ?? 0,
  };
}

export function toSharedExpense(row: Row<'shared_expenses'>): SharedExpense {
  return {
    id: row.id,
    spaceId: row.space_id,
    amount: row.amount,
    date: row.date,
    category: row.category,
    description: row.description,
    payerSlot: toSlot(row.payer_slot),
    split: toSplit(row),
    installments: toInstallmentPlan(row),
    createdBySlot: toSlot(row.created_by_slot),
    updatedBySlot: toSlot(row.updated_by_slot),
    updatedAt: row.updated_at,
  };
}

/** Opción B · lo que revisó el usuario. La RLS devuelve solo las suyas. */
export function toReview(row: Row<'record_reviews'>): Review {
  return { sourceId: row.source_id, reviewedAt: row.reviewed_at };
}

/** Opción B · el rastro de lo que se eliminó en un espacio (trigger de la base). */
export function toDeletedRecord(row: Row<'deleted_shared_records'>): DeletedRecord {
  return {
    sourceId: row.source_id,
    // El CHECK de la base garantiza que es uno de estos tres.
    kind: row.kind === 'recurrence' || row.kind === 'payment' ? row.kind : 'expense',
    deletedBySlot: toSlot(row.deleted_by_slot),
    deletedAt: row.deleted_at,
    amount: row.amount,
    occurredOn: row.occurred_on,
    category: row.category,
    description: row.description,
    fromSlot: row.from_slot == null ? null : toSlot(row.from_slot),
    createdBySlot: row.created_by_slot == null ? null : toSlot(row.created_by_slot),
    recordCreatedAt: row.record_created_at,
  };
}

export function toRecurrence(row: Row<'recurrences'>): Recurrence {
  return {
    id: row.id,
    kind: row.kind,
    amount: row.amount,
    category: row.category,
    description: row.description,
    dayOfMonth: row.day_of_month,
    startMonth: row.start_month,
    endMonth: row.end_month,
    ownerUserId: row.owner_user_id,
    spaceId: row.space_id,
    paymentMethodId: row.payment_method_id,
    payerSlot: row.payer_slot == null ? null : toSlot(row.payer_slot),
    stoppedByDepartureOn: row.stopped_by_departure_on,
    createdBySlot: row.created_by_slot == null ? null : toSlot(row.created_by_slot),
    pastTerms: toPastTerms(row.past_terms),
    // El CHECK de la base garantiza que es uno de estos dos, o null.
    departureResolution:
      row.departure_resolution === 'moved' || row.departure_resolution === 'ended'
        ? row.departure_resolution
        : null,
    split:
      row.split_mode == null
        ? null
        : toSplit({
            split_mode: row.split_mode,
            share_slot_1: row.share_slot_1,
            share_slot_2: row.share_slot_2,
          }),
  };
}

export function toRecurrenceOverride(row: Row<'recurrence_overrides'>): RecurrenceOverride {
  return {
    recurrenceId: row.recurrence_id,
    month: row.month,
    amount: row.amount,
  };
}

export function toMember(row: Row<'space_members'>): Member {
  return {
    slot: toSlot(row.slot),
    userId: row.user_id,
    displayName: row.display_name,
    status: row.status,
    isCreator: row.is_creator,
  };
}

export function toSpace(row: Row<'spaces'>, members: readonly Member[]): Space {
  const slot1 = members.find((member) => member.slot === 1);
  const slot2 = members.find((member) => member.slot === 2);

  if (slot1 == null || slot2 == null) {
    throw new Error(`El espacio ${row.id} no tiene sus dos miembros (E-01).`);
  }

  return {
    id: row.id,
    name: row.name,
    members: [slot1, slot2],
    initialBalance: row.initial_balance,
  };
}

export function toMemberPayment(row: Row<'member_payments'>): MemberPayment {
  return {
    id: row.id,
    spaceId: row.space_id,
    fromSlot: toSlot(row.from_slot),
    toSlot: toSlot(row.to_slot),
    amount: row.amount,
    date: row.date,
    recordedBySlot: toSlot(row.recorded_by_slot),
  };
}

export function toSharedPaymentDetail(row: Row<'shared_payment_details'>): SharedPaymentDetail {
  return {
    sourceId: row.source_id,
    slot: toSlot(row.slot),
    paymentMethodId: row.payment_method_id,
  };
}

export function toSpaceFacts(args: {
  space: Row<'spaces'>;
  members: readonly Row<'space_members'>[];
  expenses: readonly Row<'shared_expenses'>[];
  recurrences: readonly Row<'recurrences'>[];
  overrides: readonly Row<'recurrence_overrides'>[];
  payments: readonly Row<'member_payments'>[];
}): SpaceFacts {
  return {
    space: toSpace(args.space, args.members.map(toMember)),
    expenses: args.expenses.map(toSharedExpense),
    recurrences: args.recurrences.map(toRecurrence),
    overrides: args.overrides.map(toRecurrenceOverride),
    payments: args.payments.map(toMemberPayment),
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Dominio → base                                                           */
/* ────────────────────────────────────────────────────────────────────────── */

/** Las columnas de cuotas, que son las mismas en gastos personales y compartidos. */
export function installmentColumns(plan: InstallmentPlan | null) {
  return {
    installments_count: plan?.count ?? null,
    first_installment_month: plan?.firstMonth ?? null,
    installment_impact_day: plan?.impactDay ?? null,
    installments_approximate: plan?.approximate ?? false,
  };
}

/** C-02 · las partes se guardan explícitas y el CHECK de la base las valida. */
export function splitColumns(amount: number, split: Split) {
  if (split.mode === 'even') {
    const slot1 = Math.round(amount / 2);
    return {
      split_mode: 'even' as const,
      share_slot_1: slot1,
      share_slot_2: amount - slot1,
    };
  }
  return {
    split_mode: 'custom' as const,
    share_slot_1: split.shareSlot1,
    share_slot_2: split.shareSlot2,
  };
}
