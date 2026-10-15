import { describe, it, expect } from 'vitest';
import {
  limitMovements,
  MOVEMENTS_PREVIEW,
  pendingGroupTitle,
  planSpaceLayout,
  type SpaceLayoutInput,
} from './spaceLayout';

/**
 * UX-05 · qué secciones muestra la pantalla del espacio, en qué orden y con
 * qué límites. TS puro: el componente solo dibuja lo que esto decide.
 */
const quiet: SpaceLayoutInput = {
  stoppedFixed: 0,
  paidByOther: 0,
  toReview: 0,
  month: { total: 0, payments: 0, upcoming: 0, categories: 0 },
  upcomingMonths: 0,
  movements: 0,
};

describe('planSpaceLayout · orden', () => {
  it('el saldo y las dos acciones van primero, antes que cualquier pendiente', () => {
    const plan = planSpaceLayout({
      ...quiet,
      stoppedFixed: 1,
      toReview: 2,
      month: { total: 700_000, payments: 1, upcoming: 1, categories: 3 },
      upcomingMonths: 4,
      movements: 12,
    });
    expect(plan.sections).toEqual([
      'balance',
      'actions',
      'pending',
      'month',
      'upcoming',
      'movements',
    ]);
  });

  it('un espacio vacío muestra el saldo, las acciones y los movimientos (con su aviso de vacío)', () => {
    expect(planSpaceLayout(quiet).sections).toEqual(['balance', 'actions', 'movements']);
  });

  it('el mes aparece con gastos, con pagos o con algo que se viene', () => {
    const only = (month: Partial<SpaceLayoutInput['month']>) =>
      planSpaceLayout({ ...quiet, month: { ...quiet.month, ...month } }).sections;
    expect(only({ total: 1 })).toContain('month');
    expect(only({ payments: 1 })).toContain('month');
    expect(only({ upcoming: 1 })).toContain('month');
    expect(only({})).not.toContain('month');
  });

  it('Próximos meses solo aparece si hay compromisos', () => {
    expect(planSpaceLayout({ ...quiet, upcomingMonths: 0 }).sections).not.toContain('upcoming');
    expect(planSpaceLayout({ ...quiet, upcomingMonths: 1 }).sections).toContain('upcoming');
  });
});

describe('planSpaceLayout · pendientes agrupados', () => {
  it('sin pendientes no hay fila', () => {
    const plan = planSpaceLayout(quiet);
    expect(plan.pending).toBeNull();
    expect(plan.sections).not.toContain('pending');
  });

  it('cuenta todo junto: fijos detenidos, pagados por vos sin medio y para revisar', () => {
    const plan = planSpaceLayout({ ...quiet, stoppedFixed: 1, paidByOther: 2, toReview: 3 });
    expect(plan.pending?.count).toBe(6);
  });

  it('SA-04 · con un fijo detenido la fila arranca abierta: es una pregunta que quien queda debe contestar', () => {
    expect(planSpaceLayout({ ...quiet, stoppedFixed: 1 }).pending?.startsOpen).toBe(true);
  });

  it('sin fijo detenido, la fila arranca plegada', () => {
    expect(planSpaceLayout({ ...quiet, paidByOther: 1 }).pending?.startsOpen).toBe(false);
    expect(planSpaceLayout({ ...quiet, toReview: 4 }).pending?.startsOpen).toBe(false);
  });
});

describe('planSpaceLayout · detalle del mes', () => {
  const withMonth = (month: Partial<SpaceLayoutInput['month']>) =>
    planSpaceLayout({ ...quiet, month: { total: 100, payments: 0, upcoming: 0, categories: 0, ...month } });

  it('sin categorías múltiples, pagos ni compromisos, no hay "Ver detalle"', () => {
    expect(withMonth({ categories: 1 }).monthDetail).toBe(false);
  });

  it('más de una categoría, un pago o algo que se viene habilitan el detalle', () => {
    expect(withMonth({ categories: 2 }).monthDetail).toBe(true);
    expect(withMonth({ payments: 1 }).monthDetail).toBe(true);
    expect(withMonth({ upcoming: 1 }).monthDetail).toBe(true);
  });
});

describe('limitMovements · nunca se corta sin avisar', () => {
  const items = Array.from({ length: 25 }, (_, index) => index);

  it('muestra los últimos 10 y dice cuántos quedan', () => {
    const result = limitMovements(items, false);
    expect(result.visible).toHaveLength(MOVEMENTS_PREVIEW);
    expect(MOVEMENTS_PREVIEW).toBe(10);
    expect(result.visible[0]).toBe(0);
    expect(result.hidden).toBe(15);
  });

  it('"Ver todos" los muestra todos y no queda nada oculto', () => {
    const result = limitMovements(items, true);
    expect(result.visible).toHaveLength(25);
    expect(result.hidden).toBe(0);
  });

  it('con 10 o menos no hay nada que expandir', () => {
    const result = limitMovements(items.slice(0, 10), false);
    expect(result.visible).toHaveLength(10);
    expect(result.hidden).toBe(0);
  });
});

describe('pendingGroupTitle', () => {
  it('singular y plural', () => {
    expect(pendingGroupTitle(1)).toBe('1 cosa para completar o revisar');
    expect(pendingGroupTitle(3)).toBe('3 cosas para completar o revisar');
  });
});
