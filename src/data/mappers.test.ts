import { describe, it, expect } from 'vitest';
import {
  cardDayColumns,
  installmentDayColumns,
  recurrenceDayColumns,
  toPaymentMethod,
  toRecurrence,
} from './mappers';

describe('installmentDayColumns', () => {
  it('solo el primer mes, el día de impacto y lo aproximado: nunca la cantidad de cuotas', () => {
    expect(
      installmentDayColumns({ count: 6, firstMonth: '2026-10', impactDay: 5, approximate: false }),
    ).toEqual({
      first_installment_month: '2026-10',
      installment_impact_day: 5,
      installments_approximate: false,
    });
  });

  it('sin día de impacto (T-05): null y aproximado', () => {
    expect(
      installmentDayColumns({ count: 6, firstMonth: '2026-11', impactDay: null, approximate: true }),
    ).toEqual({
      first_installment_month: '2026-11',
      installment_impact_day: null,
      installments_approximate: true,
    });
  });
});

/**
 * Las escrituras solo mandan las columnas de aproximado cuando valen true: así,
 * antes del push de la migración 0019, guardar un día exacto sigue funcionando
 * (una columna que el remoto no conoce haría fallar el insert).
 */
describe('cardDayColumns', () => {
  it('días exactos: solo los días, ninguna columna nueva', () => {
    expect(cardDayColumns({ closingDay: 25, dueDay: 5 })).toEqual({ closing_day: 25, due_day: 5 });
  });

  it('"Más o menos": manda la marca del que la tiene', () => {
    expect(
      cardDayColumns({ closingDay: 15, closingApprox: true, dueDay: 5, dueApprox: false }),
    ).toEqual({ closing_day: 15, closing_day_approx: true, due_day: 5 });
  });

  it('"No sé": día null y sin marca', () => {
    expect(cardDayColumns({ closingDay: null, closingApprox: true, dueDay: null })).toEqual({
      closing_day: null,
      due_day: null,
    });
  });

  it('al editar, volver a un día exacto apaga la marca de antes', () => {
    expect(
      cardDayColumns({ closingDay: 20, closingApprox: false }, { clearOnExact: true }),
    ).toEqual({ closing_day: 20, closing_day_approx: false });
  });

  it('lo que no se manda, no se toca', () => {
    expect(cardDayColumns({})).toEqual({});
  });
});

describe('recurrenceDayColumns', () => {
  it('día exacto: solo el día', () => {
    expect(recurrenceDayColumns({ dayOfMonth: 5 })).toEqual({ day_of_month: 5 });
  });

  it('"Más o menos": el día y la marca', () => {
    expect(recurrenceDayColumns({ dayOfMonth: 28, dayApprox: true })).toEqual({
      day_of_month: 28,
      day_approx: true,
    });
  });

  it('"No sé": día null', () => {
    expect(recurrenceDayColumns({ dayOfMonth: null })).toEqual({ day_of_month: null });
  });

  it('al editar, un día exacto apaga la marca', () => {
    expect(recurrenceDayColumns({ dayOfMonth: 5, dayApprox: false }, { clearOnExact: true })).toEqual({
      day_of_month: 5,
      day_approx: false,
    });
  });
});

/**
 * La frontera con Postgres tolera que las columnas de los días aproximados
 * (migración 0019) todavía no existan en el remoto: llegan `undefined` y se
 * toman como "día exacto". Así la app no se rompe antes del push.
 */

const cardRow = {
  id: 'visa',
  user_id: 'u1',
  kind: 'card' as const,
  name: 'Visa Galicia',
  closing_day: 25,
  due_day: 5,
  archived: false,
  created_at: '2026-10-01T00:00:00Z',
};

describe('toPaymentMethod · días aproximados', () => {
  it('una fila sin las columnas nuevas (el remoto sin migrar) es de días exactos', () => {
    // @ts-expect-error — a propósito: la fila vieja no trae las columnas nuevas.
    const method = toPaymentMethod(cardRow);

    expect(method.closingApprox).toBe(false);
    expect(method.dueApprox).toBe(false);
    expect(method.closingDay).toBe(25);
  });

  it('lee las marcas cuando existen', () => {
    const method = toPaymentMethod({
      ...cardRow,
      deleted_at: null,
      closing_day: 15,
      closing_day_approx: true,
      due_day: 2,
      due_day_approx: true,
    });

    expect(method).toMatchObject({ closingApprox: true, dueApprox: true });
  });

  it('un día null ("No sé") nunca queda marcado como aproximado', () => {
    const method = toPaymentMethod({
      ...cardRow,
      deleted_at: null,
      closing_day: null,
      closing_day_approx: true,
      due_day: null,
      due_day_approx: true,
    });

    expect(method).toMatchObject({ closingDay: null, closingApprox: false, dueApprox: false });
  });
});

/**
 * P24 · eliminar una tarjeta la marca (`deleted_at`). Antes de la migración la
 * columna no existe: `undefined` es "no eliminada".
 */
describe('toPaymentMethod · eliminada', () => {
  it('una fila sin la columna (el remoto sin migrar) no está eliminada', () => {
    // @ts-expect-error — a propósito: la fila vieja no trae `deleted_at`.
    expect(toPaymentMethod(cardRow).deleted).toBe(false);
  });

  it('deleted_at null es una tarjeta activa', () => {
    const row = { ...cardRow, closing_day_approx: false, due_day_approx: false };
    expect(toPaymentMethod({ ...row, deleted_at: null }).deleted).toBe(false);
  });

  it('con deleted_at, está eliminada', () => {
    const row = { ...cardRow, closing_day_approx: false, due_day_approx: false };
    expect(toPaymentMethod({ ...row, deleted_at: '2026-10-16T12:00:00Z' }).deleted).toBe(true);
  });
});

const recurrenceRow = {
  id: 'sueldo',
  kind: 'income' as const,
  amount: 1_200_000,
  category: 'sueldo' as const,
  description: null,
  day_of_month: 5 as number | null,
  start_month: '2026-10',
  end_month: null,
  owner_user_id: 'u1',
  space_id: null,
  payment_method_id: null,
  payer_slot: null,
  split_mode: null,
  share_slot_1: null,
  share_slot_2: null,
  stopped_by_departure_on: null,
  departure_resolution: null,
  created_by_slot: null,
  updated_by_slot: null,
  updated_at: '2026-10-01T00:00:00Z',
  created_at: '2026-10-01T00:00:00Z',
  past_terms: [],
};

describe('toRecurrence · día aproximado', () => {
  it('una fila sin la columna nueva es de día exacto', () => {
    // @ts-expect-error — a propósito: la fila vieja no trae `day_approx`.
    const recurrence = toRecurrence(recurrenceRow);

    expect(recurrence.dayApprox).toBe(false);
    expect(recurrence.dayOfMonth).toBe(5);
  });

  it('"Más o menos": el día y la marca', () => {
    const recurrence = toRecurrence({ ...recurrenceRow, day_of_month: 28, day_approx: true });

    expect(recurrence).toMatchObject({ dayOfMonth: 28, dayApprox: true });
  });

  it('"No sé" en un ingreso: sin día y sin marca', () => {
    const recurrence = toRecurrence({ ...recurrenceRow, day_of_month: null, day_approx: true });

    expect(recurrence).toMatchObject({ dayOfMonth: null, dayApprox: false });
  });
});
