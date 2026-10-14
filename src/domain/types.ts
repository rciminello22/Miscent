/**
 * Hechos del dominio. §7.4.
 *
 * Principio rector: "la app guarda hechos y calcula todo lo demás".
 * Acá viven SOLO los hechos. Ocurrencias, radar, próximos pagos, resúmenes
 * estimados, mes del espacio y saldo compartido NO son hechos: se calculan.
 */

import type { IsoDate, Month } from './calendar';
import type { Pesos } from './money';

/** P13: categorías fijas. */
export type Category =
  | 'supermercado'
  | 'alquiler'
  | 'expensas'
  | 'servicios'
  | 'internet'
  | 'celular'
  | 'transporte'
  | 'salud'
  | 'farmacia'
  | 'educacion'
  | 'hogar'
  | 'gastronomia'
  | 'ocio'
  | 'suscripciones'
  | 'gimnasio'
  | 'ropa'
  | 'mascotas'
  | 'impuestos'
  | 'regalos'
  | 'otros'
  | 'sueldo'
  | 'extra';

/** §7.4 · Medio de pago. Sin saldo, sin límite (T-01). */
export type PaymentMethodKind = 'cash' | 'debit' | 'wallet' | 'transfer' | 'other' | 'card';

export type PaymentMethod = {
  id: string;
  kind: PaymentMethodKind;
  name: string;
  /** Solo tarjetas. `null` significa "No sé" → modo aproximado (T-05). */
  closingDay: number | null;
  dueDay: number | null;
};

/** T-07 · Resumen pendiente declarado al activar la cuenta personal. */
export type DeclaredStatement = {
  id: string;
  paymentMethodId: string;
  amount: Pesos;
  dueDate: IsoDate;
};

/** Q-01 · Plan de cuotas de una compra. */
export type InstallmentPlan = {
  count: number;
  /**
   * Mes de la primera cuota. Es un HECHO persistido, no un cálculo (Q-04:
   * editable a mano). En un gasto compartido esto es decisivo: la fecha de
   * impacto deriva de la tarjeta de quien pagó, y el otro miembro no puede
   * ver esa tarjeta (PR-02). Persistirlo permite que los dos lleguen al
   * mismo saldo sin exponer el medio de pago.
   */
  firstMonth: Month;
  /** Día de impacto dentro de cada mes. `null` → se conoce el mes, no el día (T-05). */
  impactDay: number | null;
  /** T-05 · se muestra "Fechas aproximadas". */
  approximate: boolean;
};

/** §7.4 · Movimiento personal: gasto o ingreso con destino "Solo yo". */
export type PersonalMovement = {
  id: string;
  kind: 'expense' | 'income';
  amount: Pesos;
  date: IsoDate;
  category: Category;
  description: string | null;
  /** `null` para ingresos. */
  paymentMethodId: string | null;
  /** `null` si es de un solo pago. */
  installments: InstallmentPlan | null;
};

/** C-03 · P3: 50/50 o personalizado POR MONTO. Nunca porcentajes en la interfaz. */
export type Split =
  | { mode: 'even' }
  | { mode: 'custom'; shareSlot1: Pesos; shareSlot2: Pesos };

/** Los dos únicos lugares de un espacio. E-01: exactamente dos miembros. */
export type Slot = 1 | 2;

export type MemberStatus = 'no_access' | 'active' | 'former';

export type Member = {
  slot: Slot;
  /** `null` mientras el lugar no fue ocupado por un usuario (miembro sin acceso). */
  userId: string | null;
  displayName: string;
  status: MemberStatus;
  isCreator: boolean;
};

export type Space = {
  id: string;
  name: string;
  members: [Member, Member];
  /** E-07 · saldo inicial opcional, expresado siempre a favor del slot 1. */
  initialBalance: Pesos;
};

/** §7.4 · Gasto compartido. Vive en el espacio, nunca se copia (C-01). */
export type SharedExpense = {
  id: string;
  spaceId: string;
  amount: Pesos;
  date: IsoDate;
  category: Category;
  description: string | null;
  /** Quién fue DECLARADO como pagador (G-06). No se verifica. */
  payerSlot: Slot;
  split: Split;
  installments: InstallmentPlan | null;
  createdBySlot: Slot;
  updatedBySlot: Slot;
  /** Cuándo cambió por última vez. Lo pone el servidor (revisión, opción B). */
  updatedAt: Timestamp;
};

/** Un instante que pone el servidor (timestamptz), en ISO 8601. */
export type Timestamp = string;

/** Opción B · que el usuario revisó un registro del espacio, y cuándo. */
export type Review = { sourceId: string; reviewedAt: Timestamp };

/**
 * Opción B · el rastro de un registro compartido que alguien eliminó. Lo
 * escribe un trigger de la base (deleted_shared_records), nunca la app: así
 * quien eliminó es un dato, no una suposición (SY-02).
 */
export type DeletedRecord = {
  sourceId: string;
  kind: 'expense' | 'recurrence' | 'payment';
  deletedBySlot: Slot;
  deletedAt: Timestamp;
  /** Lo que era. `null` en los rastros de antes de guardarlo. */
  amount: Pesos | null;
  /** La fecha del gasto o del pago. Un fijo no tiene una sola. */
  occurredOn: IsoDate | null;
  category: Category | null;
  description: string | null;
  /** Solo los pagos: quién le pagó a quién. */
  fromSlot: Slot | null;
  createdBySlot: Slot | null;
  recordCreatedAt: Timestamp | null;
};

/**
 * §7.4 · Detalle privado de pago: con qué pagó un miembro un gasto compartido.
 * SOLO lo ve quien pagó (C-05, PR-02). Por eso es una entidad separada: en la
 * base lleva su propia política de RLS.
 */
export type SharedPaymentDetail = {
  /** Id del gasto compartido o del recurrente compartido que se pagó. */
  sourceId: string;
  slot: Slot;
  paymentMethodId: string;
};

/** §7.4 · Gasto recurrente ("Fijo" en pantalla). Personal o compartido. */
export type Recurrence = {
  id: string;
  kind: 'expense' | 'income';
  amount: Pesos;
  category: Category;
  /** "Luz", "Monotributo". `null` → se muestra por su categoría. */
  description: string | null;
  /** Día del mes en que ocurre. T-04 aplicado al expandir. */
  dayOfMonth: number;
  startMonth: Month;
  /** `null` = sin fin. F-03 "Dejar de pagarlo desde…" lo fija. */
  endMonth: Month | null;
  /** Exactamente uno de los dos: personal o del espacio. */
  ownerUserId: string | null;
  spaceId: string | null;
  /** Solo si es personal. */
  paymentMethodId: string | null;
  /** Solo si es del espacio. */
  payerSlot: Slot | null;
  split: Split | null;
  /** SA-04 · lo detuvo la salida de un miembro (y cuándo). */
  stoppedByDepartureOn: IsoDate | null;
  /** SA-04 · qué decidió quien quedó. `null` = falta decidir. */
  departureResolution: 'moved' | 'ended' | null;
  /** Quién cargó un fijo compartido. `null` en los personales y en los de antes. */
  createdBySlot: Slot | null;
  /**
   * F-03 · los montos de antes de cada "Cambiar desde este mes". Sin esto, el
   * monto nuevo reescribía los meses que ya pasaron.
   */
  pastTerms: readonly PastTerms[];
};

/** "Hasta septiembre fue $500.000 (y se repartía así)". */
export type PastTerms = {
  /** El último mes en que valió. */
  until: Month;
  amount: Pesos;
  /** El reparto de ese tramo. `null` en los personales. */
  split: Split | null;
};

/** F-03 · "Este mes fue distinto": ajuste de un mes de un recurrente. */
export type RecurrenceOverride = {
  recurrenceId: string;
  month: Month;
  amount: Pesos;
};

/** §7.4 · Pago entre miembros. P-04: solo mueve el saldo compartido. */
export type MemberPayment = {
  id: string;
  spaceId: string;
  fromSlot: Slot;
  toSlot: Slot;
  amount: Pesos;
  date: IsoDate;
  recordedBySlot: Slot;
};

export type InvitationStatus = 'active' | 'used' | 'expired' | 'revoked';

/** I-02 · un solo uso, 7 días, regenerable. */
export type Invitation = {
  id: string;
  spaceId: string;
  targetSlot: Slot;
  status: InvitationStatus;
  expiresAt: IsoDate;
};

/* ────────────────────────────────────────────────────────────────────────── */
/*  Agregados de entrada para el cálculo                                     */
/* ────────────────────────────────────────────────────────────────────────── */

/** Todos los hechos de un espacio. Lo que los dos miembros pueden ver. */
export type SpaceFacts = {
  space: Space;
  expenses: readonly SharedExpense[];
  recurrences: readonly Recurrence[];
  overrides: readonly RecurrenceOverride[];
  payments: readonly MemberPayment[];
};

/** Los hechos privados de una cuenta personal. Solo los ve su dueño. */
export type PersonalFacts = {
  userId: string;
  paymentMethods: readonly PaymentMethod[];
  movements: readonly PersonalMovement[];
  recurrences: readonly Recurrence[];
  overrides: readonly RecurrenceOverride[];
  declaredStatements: readonly DeclaredStatement[];
  /**
   * Espacios de los que el usuario es miembro, con su slot y el detalle
   * privado de pago de los gastos que él pagó.
   */
  spaces: readonly {
    facts: SpaceFacts;
    mySlot: Slot;
    paymentDetails: readonly SharedPaymentDetail[];
    /** SA-05 · si salió del espacio, desde cuándo. */
    leftOn: IsoDate | null;
    /** Opción B · lo que revisó, de lo que cargó el otro. Solo las suyas. */
    reviews: readonly Review[];
    /** Opción B · lo que se eliminó en el espacio en los últimos días. */
    deletions: readonly DeletedRecord[];
  }[];
};
