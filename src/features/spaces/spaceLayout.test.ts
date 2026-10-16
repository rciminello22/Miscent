import { describe, it, expect } from 'vitest';
import { pendingDoorCaption, planSpaceLayout, type SpaceLayoutInput } from './spaceLayout';

/**
 * UX-05 + jerarquía N1/N2/N3 (15/10) · qué muestra la pantalla del espacio.
 * TS puro: el componente solo dibuja lo que esto decide.
 *
 * El N1 (saldo, balanza y acciones) está siempre. Debajo, como mucho TRES
 * puertas (N2), en este orden de prioridad: Pendientes, Mes, Movimientos. Lo
 * condicional no ocupa lugar si no aplica. Nada de desplegables: lo demás es
 * una pantalla propia (N3).
 */
const quiet: SpaceLayoutInput = {
  stoppedFixed: 0,
  paidByOther: 0,
  toReview: 0,
  month: { total: 0, payments: 0, upcoming: 0 },
  upcomingMonths: 0,
  movements: 0,
  deletions: 0,
};

describe('planSpaceLayout · las puertas', () => {
  it('con todo, tres puertas en orden: Pendientes, Mes y Movimientos', () => {
    const plan = planSpaceLayout({
      ...quiet,
      stoppedFixed: 1,
      toReview: 2,
      month: { total: 700_000, payments: 1, upcoming: 1 },
      upcomingMonths: 4,
      movements: 12,
    });
    expect(plan.doors).toEqual(['pending', 'month', 'movements']);
  });

  it('nunca más de tres puertas', () => {
    const plan = planSpaceLayout({
      stoppedFixed: 3,
      paidByOther: 3,
      toReview: 3,
      month: { total: 1, payments: 1, upcoming: 1 },
      upcomingMonths: 9,
      movements: 99,
      deletions: 2,
    });
    expect(plan.doors.length).toBeLessThanOrEqual(3);
  });

  it('un espacio vacío no tiene puertas y pide el aviso de vacío', () => {
    const plan = planSpaceLayout(quiet);
    expect(plan.doors).toEqual([]);
    expect(plan.empty).toBe(true);
  });

  it('sin pendientes no hay puerta de pendientes: lo condicional no ocupa lugar', () => {
    const plan = planSpaceLayout({ ...quiet, movements: 3 });
    expect(plan.pending).toBeNull();
    expect(plan.doors).not.toContain('pending');
  });

  it('el mes aparece con gastos, con pagos, con algo que se viene o con compromisos de próximos meses', () => {
    const only = (patch: Partial<SpaceLayoutInput>) => planSpaceLayout({ ...quiet, ...patch }).doors;
    expect(only({ month: { ...quiet.month, total: 1 } })).toContain('month');
    expect(only({ month: { ...quiet.month, payments: 1 } })).toContain('month');
    expect(only({ month: { ...quiet.month, upcoming: 1 } })).toContain('month');
    // "Próximos meses" ya no es una puerta: vive en el selector del mes.
    expect(only({ upcomingMonths: 2 })).toEqual(['month']);
    expect(only({})).not.toContain('month');
  });

  it('Movimientos aparece con movimientos o con algo que eliminó el otro (queda su rastro)', () => {
    expect(planSpaceLayout({ ...quiet, movements: 1 }).doors).toEqual(['movements']);
    expect(planSpaceLayout({ ...quiet, deletions: 1 }).doors).toEqual(['movements']);
  });

  it('con puertas, el aviso de vacío no se muestra', () => {
    expect(planSpaceLayout({ ...quiet, movements: 1 }).empty).toBe(false);
  });

  it('solo pendientes: la puerta está y el espacio sigue sin nada más que mostrar', () => {
    const plan = planSpaceLayout({ ...quiet, toReview: 1 });
    expect(plan.doors).toEqual(['pending']);
    expect(plan.empty).toBe(true);
  });
});

describe('planSpaceLayout · pendientes agrupados', () => {
  it('cuenta todo junto: fijos detenidos, pagados por vos sin medio y para revisar', () => {
    const plan = planSpaceLayout({ ...quiet, stoppedFixed: 1, paidByOther: 2, toReview: 3 });
    expect(plan.pending?.count).toBe(6);
  });

  it('SA-04 · con un fijo detenido la puerta es urgente: quien queda debe contestar y no puede quedar escondido', () => {
    const plan = planSpaceLayout({ ...quiet, stoppedFixed: 1 });
    expect(plan.pending?.urgent).toBe(true);
    expect(plan.doors[0]).toBe('pending');
  });

  it('sin fijo detenido, la puerta pide atención pero no es urgente', () => {
    expect(planSpaceLayout({ ...quiet, paidByOther: 1 }).pending?.urgent).toBe(false);
    expect(planSpaceLayout({ ...quiet, toReview: 4 }).pending?.urgent).toBe(false);
  });

  it('la puerta de pendientes siempre va primera', () => {
    const plan = planSpaceLayout({
      ...quiet,
      toReview: 1,
      month: { total: 10, payments: 0, upcoming: 0 },
      movements: 2,
    });
    expect(plan.doors[0]).toBe('pending');
  });
});

describe('pendingDoorCaption', () => {
  const none = { stoppedFixed: 0, paidByOther: 0, toReview: 0 };

  it('para revisar y sin completar, como en el wireframe aprobado', () => {
    expect(pendingDoorCaption({ ...none, toReview: 2, paidByOther: 1 })).toBe(
      '2 para revisar · 1 sin completar',
    );
  });

  it('solo una de las dos', () => {
    expect(pendingDoorCaption({ ...none, toReview: 1 })).toBe('1 para revisar');
    expect(pendingDoorCaption({ ...none, paidByOther: 3 })).toBe('3 sin completar');
  });

  it('SA-04 · el fijo detenido va primero, dicho como lo que es: algo para decidir', () => {
    expect(pendingDoorCaption({ stoppedFixed: 1, paidByOther: 0, toReview: 2 })).toBe(
      '1 fijo para decidir · 2 para revisar',
    );
    expect(pendingDoorCaption({ ...none, stoppedFixed: 2 })).toBe('2 fijos para decidir');
  });

  it('sin nada, vacío', () => {
    expect(pendingDoorCaption(none)).toBe('');
  });
});
