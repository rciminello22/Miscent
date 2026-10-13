/**
 * Fixtures de los casos de §29.1 y §31.
 *
 * Convención fija en todos los tests: Renzo es el slot 1 y Martina el slot 2.
 */

import type {
  DeclaredStatement,
  Member,
  MemberPayment,
  PaymentMethod,
  PersonalFacts,
  PersonalMovement,
  Recurrence,
  RecurrenceOverride,
  SharedExpense,
  SharedPaymentDetail,
  Slot,
  Space,
  SpaceFacts,
  Split,
} from '../types';
import type { IsoDate, Month } from '../calendar';
import type { Pesos } from '../money';
import { planInstallments } from '../installments';

export const RENZO: Slot = 1;
export const MARTINA: Slot = 2;

export const visa: PaymentMethod = {
  id: 'visa',
  kind: 'card',
  name: 'Visa Galicia',
  closingDay: 25,
  dueDay: 5,
};

export const mastercard: PaymentMethod = {
  id: 'master',
  kind: 'card',
  name: 'Mastercard',
  closingDay: 20,
  dueDay: 2,
};

export const debito: PaymentMethod = {
  id: 'debito',
  kind: 'debit',
  name: 'Débito',
  closingDay: null,
  dueDay: null,
};

export const transferencia: PaymentMethod = {
  id: 'transfer',
  kind: 'transfer',
  name: 'Transferencia',
  closingDay: null,
  dueDay: null,
};

function member(slot: Slot, displayName: string, overrides: Partial<Member> = {}): Member {
  return {
    slot,
    userId: `user-${slot}`,
    displayName,
    status: 'active',
    isCreator: slot === 1,
    ...overrides,
  };
}

export function casa(overrides: Partial<Space> = {}): Space {
  return {
    id: 'casa',
    name: 'Casa',
    members: [member(RENZO, 'Renzo'), member(MARTINA, 'Martina')],
    initialBalance: 0,
    ...overrides,
  };
}

export function spaceFacts(overrides: Partial<SpaceFacts> = {}): SpaceFacts {
  return {
    space: casa(),
    expenses: [],
    recurrences: [],
    overrides: [],
    payments: [],
    ...overrides,
  };
}

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export function sharedExpense(args: {
  amount: Pesos;
  date: IsoDate;
  payerSlot: Slot;
  split?: Split;
  category?: SharedExpense['category'];
  description?: string;
  /** Si se pasa, el gasto es en cuotas; la tarjeta define el cronograma (Q-02). */
  installments?: { count: number; card: PaymentMethod | null; pinnedFirstMonth?: Month };
  id?: string;
}): SharedExpense {
  return {
    id: args.id ?? nextId('expense'),
    spaceId: 'casa',
    amount: args.amount,
    date: args.date,
    category: args.category ?? 'supermercado',
    description: args.description ?? null,
    payerSlot: args.payerSlot,
    split: args.split ?? { mode: 'even' },
    installments:
      args.installments == null
        ? null
        : planInstallments({
            purchaseDate: args.date,
            count: args.installments.count,
            card: args.installments.card,
            pinnedFirstMonth: args.installments.pinnedFirstMonth ?? null,
          }),
    createdBySlot: args.payerSlot,
    updatedBySlot: args.payerSlot,
  };
}

export function sharedRecurrence(args: {
  amount: Pesos;
  dayOfMonth: number;
  startMonth: Month;
  payerSlot: Slot;
  split?: Split;
  category?: Recurrence['category'];
  endMonth?: Month | null;
  id?: string;
  paymentMethodId?: string | null;
  description?: string | null;
}): Recurrence {
  return {
    id: args.id ?? nextId('recurrence'),
    kind: 'expense',
    amount: args.amount,
    category: args.category ?? 'alquiler',
    description: args.description ?? null,
    dayOfMonth: args.dayOfMonth,
    startMonth: args.startMonth,
    endMonth: args.endMonth ?? null,
    ownerUserId: null,
    spaceId: 'casa',
    paymentMethodId: args.paymentMethodId ?? null,
    payerSlot: args.payerSlot,
    split: args.split ?? { mode: 'even' },
  };
}

export function personalRecurrence(args: {
  kind: 'expense' | 'income';
  amount: Pesos;
  dayOfMonth: number;
  startMonth: Month;
  category: Recurrence['category'];
  paymentMethodId?: string | null;
  endMonth?: Month | null;
  id?: string;
  description?: string | null;
}): Recurrence {
  return {
    id: args.id ?? nextId('recurrence'),
    kind: args.kind,
    amount: args.amount,
    category: args.category,
    description: args.description ?? null,
    dayOfMonth: args.dayOfMonth,
    startMonth: args.startMonth,
    endMonth: args.endMonth ?? null,
    ownerUserId: 'user-1',
    spaceId: null,
    paymentMethodId: args.paymentMethodId ?? null,
    payerSlot: null,
    split: null,
  };
}

export function movement(args: {
  kind?: 'expense' | 'income';
  amount: Pesos;
  date: IsoDate;
  category?: PersonalMovement['category'];
  paymentMethodId?: string | null;
  description?: string;
  installments?: { count: number; card: PaymentMethod | null; pinnedFirstMonth?: Month };
  id?: string;
}): PersonalMovement {
  return {
    id: args.id ?? nextId('movement'),
    kind: args.kind ?? 'expense',
    amount: args.amount,
    date: args.date,
    category: args.category ?? 'otros',
    description: args.description ?? null,
    paymentMethodId: args.paymentMethodId ?? null,
    installments:
      args.installments == null
        ? null
        : planInstallments({
            purchaseDate: args.date,
            count: args.installments.count,
            card: args.installments.card,
            pinnedFirstMonth: args.installments.pinnedFirstMonth ?? null,
          }),
  };
}

export function memberPayment(args: {
  fromSlot: Slot;
  toSlot: Slot;
  amount: Pesos;
  date: IsoDate;
}): MemberPayment {
  return {
    id: nextId('payment'),
    spaceId: 'casa',
    fromSlot: args.fromSlot,
    toSlot: args.toSlot,
    amount: args.amount,
    date: args.date,
    recordedBySlot: args.fromSlot,
  };
}

/** Hechos de una cuenta personal. Por defecto, la de Renzo. */
export function personalFacts(overrides: Partial<PersonalFacts> = {}): PersonalFacts {
  return {
    userId: 'user-1',
    paymentMethods: [visa, debito, transferencia],
    movements: [],
    recurrences: [],
    overrides: [],
    declaredStatements: [],
    spaces: [],
    ...overrides,
  };
}

/** Membresía de un espacio desde la cuenta personal de un miembro. */
export function membership(args: {
  facts: SpaceFacts;
  mySlot: Slot;
  paymentDetails?: SharedPaymentDetail[];
  leftOn?: IsoDate | null;
}): PersonalFacts['spaces'][number] {
  return {
    facts: args.facts,
    mySlot: args.mySlot,
    paymentDetails: args.paymentDetails ?? [],
    leftOn: args.leftOn ?? null,
  };
}

export function paidWith(sourceId: string, slot: Slot, paymentMethodId: string): SharedPaymentDetail {
  return { sourceId, slot, paymentMethodId };
}

export function declaredStatement(args: {
  paymentMethodId: string;
  amount: Pesos;
  dueDate: IsoDate;
}): DeclaredStatement {
  return { id: nextId('statement'), ...args };
}

export function override(recurrenceId: string, month: Month, amount: Pesos): RecurrenceOverride {
  return { recurrenceId, month, amount };
}
