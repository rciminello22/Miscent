/**
 * Ocurrencias. §7.2 ("cada salida concreta con fecha") y §7.4.
 *
 * Este es el único lugar donde los hechos se convierten en salidas con fecha.
 * El radar, Futuro, Próximos pagos y el saldo compartido se construyen todos
 * sobre esta expansión: una sola interpretación de las reglas, tres lentes
 * distintas leyéndola.
 *
 * Las ocurrencias NO se persisten nunca (§7.4).
 *
 * §7.3 · las dos lentes:
 *   "tu parte"           → `myShare`, para Gastado / Comprometido / Sin asignar
 *   "lo que vas a pagar" → `total` + `payerIsMe`, para Próximos pagos
 * Nunca se mezclan en una misma cifra.
 */

import {
  addMonths,
  compareMonths,
  dateInMonth,
  lastDayOfMonth,
  monthIndex,
  monthOf,
  parseMonth,
  toIso,
  type IsoDate,
  type Month,
} from './calendar';
import { resolveCardPayment } from './cards';
import { scheduleInstallments } from './installments';
import type { Pesos } from './money';
import { otherSlot, resolveShares, shareOf, splitInstallmentShares, type Shares } from './split';
import type {
  Category,
  DeclaredStatement,
  PaymentMethod,
  PersonalFacts,
  PersonalMovement,
  Recurrence,
  RecurrenceOverride,
  Slot,
  Split,
  SpaceFacts,
} from './types';

export type MonthHorizon = { from: Month; to: Month };

/* ────────────────────────────────────────────────────────────────────────── */
/*  Utilidades comunes                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Cuando el día de impacto no se conoce (tarjeta en modo aproximado, T-05),
 * la ocurrencia se ubica al CIERRE del mes. Es la opción conservadora: una
 * deuda compartida nunca se genera antes de tiempo.
 */
function endOfMonth(month: Month): IsoDate {
  const { year, month: m } = parseMonth(month);
  return toIso(year, m, lastDayOfMonth(year, m));
}

function monthsIn(horizon: MonthHorizon): Month[] {
  const from = monthIndex(horizon.from);
  const to = monthIndex(horizon.to);
  if (to < from) return [];
  return Array.from({ length: to - from + 1 }, (_, index) => addMonths(horizon.from, index));
}

/** Monto de un recurrente en un mes dado, aplicando el ajuste de F-03. */
function recurrenceAmountIn(
  recurrence: Recurrence,
  month: Month,
  overrides: readonly RecurrenceOverride[],
): Pesos {
  const override = overrides.find(
    (item) => item.recurrenceId === recurrence.id && item.month === month,
  );
  return override?.amount ?? recurrence.amount;
}

function recurrenceActiveIn(recurrence: Recurrence, month: Month): boolean {
  if (compareMonths(month, recurrence.startMonth) < 0) return false;
  if (recurrence.endMonth != null && compareMonths(month, recurrence.endMonth) > 0) return false;
  return true;
}

function cardOf(methods: readonly PaymentMethod[], id: string | null): PaymentMethod | null {
  if (id == null) return null;
  const method = methods.find((item) => item.id === id);
  return method != null && method.kind === 'card' ? method : null;
}

/**
 * F-04 · si el monto de un mes cambió ("Este mes fue distinto"), las partes se
 * ajustan en la misma proporción del reparto original.
 */
function proportionalShares(amount: Pesos, baseAmount: Pesos, split: Split): Shares {
  if (split.mode === 'even') return resolveShares(amount, split);
  if (amount === baseAmount) return resolveShares(amount, split);
  const ratio = baseAmount === 0 ? 0.5 : split.shareSlot1 / baseAmount;
  const slot1 = Math.round(amount * ratio);
  return { slot1, slot2: amount - slot1 };
}

function byDate(a: { balanceDate: IsoDate }, b: { balanceDate: IsoDate }): number {
  return a.balanceDate < b.balanceDate ? -1 : a.balanceDate > b.balanceDate ? 1 : 0;
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Lente del espacio                                                        */
/* ────────────────────────────────────────────────────────────────────────── */

export type SpaceOccurrence = {
  id: string;
  sourceId: string;
  sourceKind: 'expense' | 'recurrence';
  label: string;
  category: Category;
  /** Total de esta ocurrencia (un gasto, una cuota, un mes de un fijo). */
  amount: Pesos;
  shares: Shares;
  /** Quién fue DECLARADO como pagador (G-06). */
  payerSlot: Slot;
  /**
   * S-02 · cuándo esta ocurrencia mueve el saldo compartido:
   *   gasto puntual → su fecha de compra, aunque se haya pagado con tarjeta [P19]
   *   cuota         → su fecha de impacto [P2]
   *   fijo          → su día del mes
   */
  balanceDate: IsoDate;
  /** S-04 · el mes del espacio agrupa por esta fecha. */
  month: Month;
  installment: { index: number; count: number } | null;
  isRecurrence: boolean;
};

/** El rango de meses que hace falta recorrer para reconstruir todo el espacio. */
export function spaceHorizon(facts: SpaceFacts, today: IsoDate): MonthHorizon {
  const candidates: Month[] = [monthOf(today)];
  for (const expense of facts.expenses) {
    candidates.push(expense.installments?.firstMonth ?? monthOf(expense.date));
  }
  for (const recurrence of facts.recurrences) candidates.push(recurrence.startMonth);
  for (const payment of facts.payments) candidates.push(monthOf(payment.date));

  const from = [...candidates].sort(compareMonths)[0] ?? monthOf(today);

  // El horizonte se extiende hasta el final de las cuotas ya generadas, para
  // que Futuro vea los compromisos compartidos pendientes (§23.4, SA-03).
  let to = monthOf(today);
  for (const expense of facts.expenses) {
    if (expense.installments == null) continue;
    const last = addMonths(expense.installments.firstMonth, expense.installments.count - 1);
    if (compareMonths(last, to) > 0) to = last;
  }
  return { from, to };
}

function expandSharedExpense(expense: SpaceFacts['expenses'][number]): SpaceOccurrence[] {
  const label = expense.description ?? expense.category;
  const base = {
    sourceId: expense.id,
    sourceKind: 'expense' as const,
    label,
    category: expense.category,
    payerSlot: expense.payerSlot,
    isRecurrence: false,
  };

  if (expense.installments == null) {
    // S-02 / P19 · gasto puntual: mueve el saldo en la FECHA DE COMPRA, aunque
    // se haya pagado con tarjeta y sin importar cuándo vence esa tarjeta.
    return [
      {
        ...base,
        id: `expense:${expense.id}`,
        amount: expense.amount,
        shares: resolveShares(expense.amount, expense.split),
        balanceDate: expense.date,
        month: monthOf(expense.date),
        installment: null,
      },
    ];
  }

  // Q-08 / P2 · cada cuota es una ocurrencia compartida. La deuda se genera
  // cuota por cuota, al llegar la fecha de impacto de cada una. NUNCA se
  // genera la deuda total el día de la compra.
  const scheduled = scheduleInstallments(expense.amount, expense.installments);
  const shares = splitInstallmentShares(
    scheduled.map((item) => item.amount),
    expense.amount,
    expense.split,
  );

  return scheduled.map((item, index) => ({
    ...base,
    id: `expense:${expense.id}:q${item.index}`,
    amount: item.amount,
    shares: shares[index]!,
    balanceDate: item.date ?? endOfMonth(item.month),
    month: item.month,
    installment: { index: item.index, count: item.count },
  }));
}

function expandSharedRecurrence(
  recurrence: Recurrence,
  overrides: readonly RecurrenceOverride[],
  horizon: MonthHorizon,
): SpaceOccurrence[] {
  // §18 · no existen ingresos compartidos.
  if (recurrence.kind !== 'expense') return [];

  const payerSlot = recurrence.payerSlot ?? 1;
  const split: Split = recurrence.split ?? { mode: 'even' };

  return monthsIn(horizon)
    .filter((month) => recurrenceActiveIn(recurrence, month))
    .map((month) => {
      const amount = recurrenceAmountIn(recurrence, month, overrides);
      return {
        id: `recurrence:${recurrence.id}:${month}`,
        sourceId: recurrence.id,
        sourceKind: 'recurrence' as const,
        label: recurrence.category,
        category: recurrence.category,
        amount,
        shares: proportionalShares(amount, recurrence.amount, split),
        payerSlot,
        balanceDate: dateInMonth(month, recurrence.dayOfMonth), // S-02 · su día del mes
        month,
        installment: null,
        isRecurrence: true,
      };
    });
}

export function expandSpaceOccurrences(
  facts: SpaceFacts,
  horizon: MonthHorizon,
): SpaceOccurrence[] {
  const out: SpaceOccurrence[] = [];

  for (const expense of facts.expenses) {
    out.push(...expandSharedExpense(expense));
  }
  for (const recurrence of facts.recurrences) {
    if (recurrence.spaceId == null) continue;
    out.push(...expandSharedRecurrence(recurrence, facts.overrides, horizon));
  }

  return out.sort(byDate);
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Lente personal                                                           */
/* ────────────────────────────────────────────────────────────────────────── */

export type PersonalOccurrence = {
  id: string;
  label: string;
  category: Category;
  /** Monto completo del pago (lente "lo que vas a pagar"). */
  total: Pesos;
  /** K9 · solo la parte que me corresponde (lente "tu parte"). */
  myShare: Pesos;
  /** Parte de otro miembro incluida en lo que pago: "incluye $X de Martina". */
  otherShare: Pesos;
  /** N-02 vs N-03. */
  bucket: 'spent' | 'committed';
  /** Mes del radar al que entra. */
  month: Month;
  /** `null` cuando se conoce el mes y no el día (T-05). */
  paymentDate: IsoDate | null;
  /** N-09 · Próximos pagos solo incluye lo que paga el propio usuario. */
  payerIsMe: boolean;
  /** Tarjeta propia con la que se paga: agrupa el resumen estimado (N-10). */
  cardId: string | null;
  approximate: boolean;
  /** Mes en que se hizo la compra, para "Con tarjeta este mes" (§15). */
  purchaseMonth: Month;
  spaceId: string | null;
  spaceName: string | null;
  otherMemberName: string | null;
  installment: { index: number; count: number } | null;
  isRecurrence: boolean;
  /** SA-05 · "Casa · ya no sos miembro". */
  fromFormerMembership: boolean;
};

export type PersonalIncome = {
  id: string;
  label: string;
  amount: Pesos;
  month: Month;
  date: IsoDate;
  isRecurrence: boolean;
};

export type PersonalExpansion = {
  occurrences: PersonalOccurrence[];
  incomes: PersonalIncome[];
};

/** Valores por defecto de una ocurrencia personal propia (no compartida). */
function ownOccurrence(
  fields: Pick<PersonalOccurrence, 'id' | 'label' | 'category' | 'total' | 'bucket' | 'month'> &
    Partial<PersonalOccurrence>,
): PersonalOccurrence {
  return {
    myShare: fields.total,
    otherShare: 0,
    paymentDate: null,
    payerIsMe: true,
    cardId: null,
    approximate: false,
    purchaseMonth: fields.month,
    spaceId: null,
    spaceName: null,
    otherMemberName: null,
    installment: null,
    isRecurrence: false,
    fromFormerMembership: false,
    ...fields,
  };
}

function expandPersonalMovement(
  movement: PersonalMovement,
  methods: readonly PaymentMethod[],
): PersonalExpansion {
  const label = movement.description ?? movement.category;
  const purchaseMonth = monthOf(movement.date);

  if (movement.kind === 'income') {
    // N-01 · ingresos puntuales con fecha en el mes.
    return {
      occurrences: [],
      incomes: [
        {
          id: `movement:${movement.id}`,
          label,
          amount: movement.amount,
          month: purchaseMonth,
          date: movement.date,
          isRecurrence: false,
        },
      ],
    };
  }

  const card = cardOf(methods, movement.paymentMethodId);

  if (movement.installments != null) {
    // §19 · tarjeta en cuotas, o crédito sin tarjeta en cuotas: cada cuota en
    // su mes, siempre en Comprometido.
    const occurrences = scheduleInstallments(movement.amount, movement.installments).map((item) =>
      ownOccurrence({
        id: `movement:${movement.id}:q${item.index}`,
        label,
        category: movement.category,
        total: item.amount,
        bucket: 'committed',
        month: item.month,
        paymentDate: item.date,
        cardId: card?.id ?? null,
        approximate: item.approximate,
        purchaseMonth,
        installment: { index: item.index, count: item.count },
      }),
    );
    return { occurrences, incomes: [] };
  }

  if (card != null) {
    // CA-53 · una compra con tarjeta en 1 pago NO suma a Gastado del mes de
    // compra: suma a Comprometido del mes de vencimiento.
    const schedule = resolveCardPayment(card, movement.date);
    return {
      occurrences: [
        ownOccurrence({
          id: `movement:${movement.id}`,
          label,
          category: movement.category,
          total: movement.amount,
          bucket: 'committed',
          month: schedule.month,
          paymentDate: schedule.dueDate,
          cardId: card.id,
          approximate: schedule.approximate,
          purchaseMonth,
        }),
      ],
      incomes: [],
    };
  }

  // G-03 · al contado: la fecha de pago es la fecha del gasto → Gastado.
  return {
    occurrences: [
      ownOccurrence({
        id: `movement:${movement.id}`,
        label,
        category: movement.category,
        total: movement.amount,
        bucket: 'spent',
        month: purchaseMonth,
        paymentDate: movement.date,
      }),
    ],
    incomes: [],
  };
}

function expandPersonalRecurrence(
  recurrence: Recurrence,
  overrides: readonly RecurrenceOverride[],
  methods: readonly PaymentMethod[],
  horizon: MonthHorizon,
): PersonalExpansion {
  const card = cardOf(methods, recurrence.paymentMethodId);
  const occurrences: PersonalOccurrence[] = [];
  const incomes: PersonalIncome[] = [];

  for (const month of monthsIn(horizon)) {
    if (!recurrenceActiveIn(recurrence, month)) continue;
    const amount = recurrenceAmountIn(recurrence, month, overrides);
    const date = dateInMonth(month, recurrence.dayOfMonth);

    if (recurrence.kind === 'income') {
      // N-01 · los ingresos recurrentes son la base de "Ingresos registrados"
      // y de "Ingreso previsto".
      incomes.push({
        id: `recurrence:${recurrence.id}:${month}`,
        label: recurrence.category,
        amount,
        month,
        date,
        isRecurrence: true,
      });
      continue;
    }

    // F-01 · con tarjeta, cada ocurrencia entra en el resumen que corresponde.
    const schedule = card != null ? resolveCardPayment(card, date) : null;

    occurrences.push(
      ownOccurrence({
        id: `recurrence:${recurrence.id}:${month}`,
        label: recurrence.category,
        category: recurrence.category,
        total: amount,
        // N-02 · los fijos son Comprometido, también cuando la fecha ya pasó
        // ("Fijo · ya pasó", F-02).
        bucket: 'committed',
        month: schedule?.month ?? month,
        paymentDate: schedule != null ? schedule.dueDate : date,
        cardId: card?.id ?? null,
        approximate: schedule?.approximate ?? false,
        purchaseMonth: month,
        isRecurrence: true,
      }),
    );
  }

  return { occurrences, incomes };
}

/** T-07 · resumen pendiente declarado: entra completo en Comprometido. */
function expandDeclaredStatement(statement: DeclaredStatement): PersonalOccurrence {
  const month = monthOf(statement.dueDate);
  return ownOccurrence({
    id: `statement:${statement.id}`,
    label: 'Resumen pendiente declarado',
    category: 'otros',
    total: statement.amount,
    bucket: 'committed',
    month,
    paymentDate: statement.dueDate,
    cardId: statement.paymentMethodId,
  });
}

/**
 * K9 · proyecta una ocurrencia del espacio a la cuenta personal de un miembro:
 * a su radar llega SOLO su parte.
 *
 * Dónde cae esa parte:
 *   yo pagué con tarjeta  → Comprometido, en el mes del resumen
 *   yo pagué al contado   → Gastado, en la fecha del gasto
 *   pagó el otro, puntual → Gastado en la fecha del gasto (C-05: para mí no
 *                           hay medio de pago, se trata como al contado)
 *   cuota o fijo          → Comprometido, en el mes de la ocurrencia
 *
 * La parte de quien NO pagó se ubica SIEMPRE por la fecha de la ocurrencia del
 * espacio, nunca por el resumen de una tarjeta que no puede ver (PR-02).
 */
function projectSpaceOccurrence(args: {
  occurrence: SpaceOccurrence;
  spaceId: string;
  spaceName: string;
  mySlot: Slot;
  otherMemberName: string;
  card: PaymentMethod | null;
  fromFormerMembership: boolean;
}): PersonalOccurrence {
  const { occurrence, spaceId, spaceName, mySlot, otherMemberName, card, fromFormerMembership } =
    args;

  const payerIsMe = occurrence.payerSlot === mySlot;

  // Una cuota ya trae su fecha de impacto resuelta por Q-02 (que es el
  // vencimiento del resumen cuando se pagó con tarjeta), así que volver a
  // aplicar T-03 acá correría el mes de más. Un fijo, en cambio, cae en su día
  // del mes y SÍ hay que ubicarlo en el resumen que corresponde (F-01).
  const schedule =
    card != null && payerIsMe && occurrence.installment == null
      ? resolveCardPayment(card, occurrence.balanceDate)
      : null;

  let bucket: 'spent' | 'committed';
  let month: Month;
  let paymentDate: IsoDate | null;

  if (occurrence.installment != null) {
    bucket = 'committed';
    month = occurrence.month;
    paymentDate = occurrence.balanceDate;
  } else if (occurrence.isRecurrence) {
    bucket = 'committed';
    month = schedule?.month ?? occurrence.month;
    paymentDate = schedule != null ? schedule.dueDate : occurrence.balanceDate;
  } else if (schedule != null) {
    bucket = 'committed';
    month = schedule.month;
    paymentDate = schedule.dueDate;
  } else {
    bucket = 'spent';
    month = occurrence.month;
    paymentDate = occurrence.balanceDate;
  }

  return {
    id: `space:${spaceId}:${occurrence.id}`,
    label: occurrence.label,
    category: occurrence.category,
    total: occurrence.amount,
    myShare: shareOf(occurrence.shares, mySlot),
    otherShare: shareOf(occurrence.shares, otherSlot(mySlot)),
    bucket,
    month,
    paymentDate,
    payerIsMe,
    cardId: payerIsMe ? (card?.id ?? null) : null,
    approximate: schedule?.approximate ?? false,
    purchaseMonth: occurrence.month,
    spaceId,
    spaceName,
    otherMemberName,
    installment: occurrence.installment,
    isRecurrence: occurrence.isRecurrence,
    fromFormerMembership,
  };
}

function expandMembership(
  membership: PersonalFacts['spaces'][number],
  methods: readonly PaymentMethod[],
  horizon: MonthHorizon,
): PersonalOccurrence[] {
  const { facts, mySlot, paymentDetails, leftOn } = membership;
  const other = facts.space.members.find((member) => member.slot !== mySlot)!;

  return expandSpaceOccurrences(facts, horizon)
    .filter((occurrence) => {
      // SA-03 / SA-04 · al salir, las cuotas ya generadas siguen; los fijos
      // compartidos se detienen desde la salida.
      if (leftOn == null) return true;
      return !(occurrence.isRecurrence && occurrence.balanceDate > leftOn);
    })
    .map((occurrence) =>
      projectSpaceOccurrence({
        occurrence,
        spaceId: facts.space.id,
        spaceName: facts.space.name,
        mySlot,
        otherMemberName: other.displayName,
        card:
          occurrence.payerSlot === mySlot
            ? cardOf(
                methods,
                paymentDetails.find(
                  (detail) =>
                    detail.sourceId === occurrence.sourceId && detail.slot === mySlot,
                )?.paymentMethodId ?? null,
              )
            : null,
        fromFormerMembership: leftOn != null,
      }),
    );
}

export function expandPersonalOccurrences(
  facts: PersonalFacts,
  horizon: MonthHorizon,
): PersonalExpansion {
  const occurrences: PersonalOccurrence[] = [];
  const incomes: PersonalIncome[] = [];

  for (const movement of facts.movements) {
    const expansion = expandPersonalMovement(movement, facts.paymentMethods);
    occurrences.push(...expansion.occurrences);
    incomes.push(...expansion.incomes);
  }

  for (const recurrence of facts.recurrences) {
    if (recurrence.spaceId != null) continue; // los compartidos salen del espacio
    const expansion = expandPersonalRecurrence(
      recurrence,
      facts.overrides,
      facts.paymentMethods,
      horizon,
    );
    occurrences.push(...expansion.occurrences);
    incomes.push(...expansion.incomes);
  }

  for (const statement of facts.declaredStatements) {
    occurrences.push(expandDeclaredStatement(statement));
  }

  for (const membership of facts.spaces) {
    occurrences.push(...expandMembership(membership, facts.paymentMethods, horizon));
  }

  return { occurrences, incomes };
}
