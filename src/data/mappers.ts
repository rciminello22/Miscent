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

import { resolveShares } from '@domain/split';
import type { Database } from './database.types';
import { toPastTerms } from './pastTerms';
import type {
  CardDaysVersion,
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

/**
 * Migración 0020 · los días que tuvo una tarjeta antes de una corrección. Un día
 * `null` ("No sé") nunca es aproximado, igual que en la tarjeta.
 */
export function toCardDaysVersion(row: Row<'payment_method_days'>): CardDaysVersion {
  return {
    closingDay: row.closing_day,
    dueDay: row.due_day,
    closingApprox: row.closing_day != null && row.closing_day_approx,
    dueApprox: row.due_day != null && row.due_day_approx,
    until: row.valid_until,
  };
}

/**
 * `versions` son las filas de `payment_method_days` de ESTA tarjeta. Sin ellas (la
 * tabla no existe todavía, o la tarjeta nunca se corrigió) la tarjeta usa sus
 * días vigentes para todo, como antes de la 0020.
 */
export function toPaymentMethod(
  row: Row<'payment_methods'>,
  versions: readonly Row<'payment_method_days'>[] = [],
): PaymentMethod {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    closingDay: row.closing_day,
    dueDay: row.due_day,
    // Migración 0019. Mientras el remoto no la tenga, la columna llega
    // `undefined`: se toma como día exacto. Y un día `null` ("No sé") nunca es
    // aproximado.
    closingApprox: row.closing_day != null && (row.closing_day_approx ?? false),
    dueApprox: row.due_day != null && (row.due_day_approx ?? false),
    // Migración 0019 (P24). Sin la columna llega `undefined`: no eliminada.
    deleted: row.deleted_at != null,
    ...(versions.length > 0 ? { daysHistory: versions.map(toCardDaysVersion) } : {}),
  };
}

/** Los medios de pago con la historia de días de cada tarjeta (migración 0020). */
export function toPaymentMethods(
  rows: readonly Row<'payment_methods'>[],
  versions: readonly Row<'payment_method_days'>[],
): PaymentMethod[] {
  return rows.map((row) =>
    toPaymentMethod(
      row,
      versions.filter((version) => version.payment_method_id === row.id),
    ),
  );
}

type DayColumns = Record<string, number | boolean | null>;

/**
 * El día y, si corresponde, su marca de aproximado. La marca solo se manda
 * cuando vale true (o, al EDITAR, para apagarla): una columna que el remoto
 * todavía no conoce (migración 0019 sin aplicar) haría fallar el insert, y un
 * día exacto tiene que seguir guardándose.
 */
function dayWithMark(
  columns: DayColumns,
  dayKey: string,
  markKey: string,
  day: number | null | undefined,
  approx: boolean | undefined,
  clearOnExact: boolean,
): void {
  if (day === undefined) return;
  columns[dayKey] = day;
  const marked = day != null && approx === true;
  if (marked || clearOnExact) columns[markKey] = marked;
}

/** T-02 · las columnas de cierre y vencimiento de una tarjeta. */
export function cardDayColumns(
  input: {
    closingDay?: number | null;
    closingApprox?: boolean;
    dueDay?: number | null;
    dueApprox?: boolean;
  },
  options?: { clearOnExact?: boolean },
): DayColumns {
  const columns: DayColumns = {};
  const clear = options?.clearOnExact === true;
  dayWithMark(columns, 'closing_day', 'closing_day_approx', input.closingDay, input.closingApprox, clear);
  dayWithMark(columns, 'due_day', 'due_day_approx', input.dueDay, input.dueApprox, clear);
  return columns;
}

/** El día de un fijo o de un ingreso, y su marca. */
export function recurrenceDayColumns(
  input: { dayOfMonth?: number | null; dayApprox?: boolean },
  options?: { clearOnExact?: boolean },
): DayColumns {
  const columns: DayColumns = {};
  dayWithMark(
    columns,
    'day_of_month',
    'day_approx',
    input.dayOfMonth,
    input.dayApprox,
    options?.clearOnExact === true,
  );
  return columns;
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
    // Sin la 0022 la columna no viene (`undefined`): no es del onboarding.
    fromOnboardingDebt: row.origin === 'onboarding_debt',
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
    createdAt: row.created_at,
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
    // Migración 0019: `undefined` mientras el remoto no la tenga → día exacto.
    dayApprox: row.day_of_month != null && (row.day_approx ?? false),
    startMonth: row.start_month,
    endMonth: row.end_month,
    ownerUserId: row.owner_user_id,
    spaceId: row.space_id,
    paymentMethodId: row.payment_method_id,
    payerSlot: row.payer_slot == null ? null : toSlot(row.payer_slot),
    stoppedByDepartureOn: row.stopped_by_departure_on,
    createdBySlot: row.created_by_slot == null ? null : toSlot(row.created_by_slot),
    updatedBySlot: row.updated_by_slot == null ? null : toSlot(row.updated_by_slot),
    updatedAt: row.updated_at,
    createdAt: row.created_at,
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
    createdAt: row.created_at,
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

/**
 * Corregir los días de una tarjeta: del plan solo cambian el primer mes, el día
 * de impacto y la marca de aproximado. La cantidad de cuotas NO se manda: si
 * otra edición la cambió en el medio, no se pisa.
 */
export function installmentDayColumns(plan: InstallmentPlan) {
  return {
    first_installment_month: plan.firstMonth,
    installment_impact_day: plan.impactDay,
    installments_approximate: plan.approximate,
  };
}

/**
 * C-02 · las partes se guardan explícitas y el CHECK de la base las valida.
 * `resolveShares` las valida ANTES de mandarlas: unas partes que no suman el
 * total (H-05) son un error del que llama, no algo para descubrir en la base.
 */
export function splitColumns(amount: number, split: Split) {
  const shares = resolveShares(amount, split);
  return {
    split_mode: split.mode,
    share_slot_1: shares.slot1,
    share_slot_2: shares.slot2,
  };
}
