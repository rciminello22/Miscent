import { describe, it, expect } from 'vitest';
import type { InstallmentPlan } from '@domain/types';
import { scheduleInstallments } from '@domain/installments';
import { splitInstallmentShares, shareOf } from '@domain/split';
import { installmentAmounts } from '@domain/installments';
import { buildInstallmentsDetail, myInstallmentsOf } from './installmentsCycle';

/**
 * 15·4 · el detalle de una compra en cuotas. Hoy: 19 de octubre de 2026.
 *
 * G-06 / CA-45 · la app no verifica pagos: lo único que sabe es que la fecha de
 * una cuota ya pasó. Nunca "Pagado" ni "Vas pagando".
 */

const TODAY = '2026-10-19';

const plan = (firstMonth: string, count = 6, impactDay: number | null = 5): InstallmentPlan => ({
  count,
  firstMonth,
  impactDay,
  approximate: false,
});

/** Una compra personal: la cuota es el total / cantidad. */
function personal(args: {
  total: number;
  plan: InstallmentPlan;
  purchaseDate: string;
  methodName?: string | null;
  today?: string;
}) {
  return buildInstallmentsDetail({
    today: args.today ?? TODAY,
    purchaseDate: args.purchaseDate,
    schedule: scheduleInstallments(args.total, args.plan),
    shared: null,
    methodName: args.methodName ?? null,
  });
}

const zapatillas = () =>
  personal({
    total: 180_000,
    plan: plan('2026-11'),
    purchaseDate: '2026-10-14',
    methodName: 'Visa Galicia',
  });

// Heladera: $240.000 en 6 cuotas de $40.000, desde agosto: ya pasaron agosto,
// septiembre y octubre (5 de octubre).
const heladera = () =>
  personal({
    total: 240_000,
    plan: plan('2026-08'),
    purchaseDate: '2026-07-20',
    methodName: 'Visa Galicia',
  });

describe('la cifra de arriba y la línea de la compra', () => {
  it('personal: el total y "6 cuotas de $30.000 · compra del 14 de octubre"', () => {
    const view = zapatillas();

    expect(view.figure).toEqual({ amount: 180_000, ofTotal: null });
    expect(view.purchaseLine).toBe('6 cuotas de $30.000 · compra del 14 de octubre');
  });

  it('compartido: TU parte arriba y el total de la compra en gris', () => {
    const view = lavarropas({ iPaid: false });

    expect(view.figure).toEqual({ amount: 180_000, ofTotal: 360_000 });
    expect(view.purchaseLine).toBe('6 cuotas de $30.000 · compra del 14 de octubre');
  });
});

describe('el ciclo: "Faltan", los segmentos y cuántas ya pasaron', () => {
  it('ninguna pasó: faltan todas, el primer segmento es el próximo y "Todavía no pasó ninguna cuota"', () => {
    const { cycle } = zapatillas();

    expect(cycle.remaining).toBe('Faltan $180.000');
    expect(cycle.segments).toEqual(['next', 'future', 'future', 'future', 'future', 'future']);
    expect(cycle.passed).toBe('Todavía no pasó ninguna cuota');
    expect(cycle.firstMonth).toBe('noviembre');
    expect(cycle.lastMonth).toBe('abril');
  });

  it('pasaron 3 de 6: "Faltan $120.000", tres llenos, uno con contorno y "Ya pasaron 3 de 6 cuotas"', () => {
    const { cycle } = heladera();

    expect(cycle.remaining).toBe('Faltan $120.000');
    expect(cycle.segments).toEqual(['passed', 'passed', 'passed', 'next', 'future', 'future']);
    expect(cycle.passed).toBe('Ya pasaron 3 de 6 cuotas');
    expect(cycle.firstMonth).toBe('agosto');
    expect(cycle.lastMonth).toBe('enero');
  });

  it('pasó una sola: el verbo va en singular', () => {
    const { cycle } = personal({
      total: 180_000,
      plan: plan('2026-10', 6, 5),
      purchaseDate: '2026-09-20',
    });

    expect(cycle.passed).toBe('Ya pasó 1 de 6 cuotas');
    expect(cycle.remaining).toBe('Faltan $150.000');
  });

  it('una cuota cuenta como pasada el mismo día de su fecha', () => {
    const { cycle } = personal({
      total: 180_000,
      plan: plan('2026-10', 6, 19),
      purchaseDate: '2026-09-20',
    });

    expect(cycle.segments[0]).toBe('passed');
  });

  it('ya pasaron todas: sin "Faltan" y dice cuándo terminó', () => {
    const view = personal({
      total: 90_000,
      plan: plan('2026-06', 3),
      purchaseDate: '2026-05-10',
      methodName: 'Visa Galicia',
    });

    expect(view.cycle.remaining).toBeNull();
    expect(view.cycle.segments).toEqual(['passed', 'passed', 'passed']);
    expect(view.cycle.passed).toBe('Ya pasaron las 3 cuotas · terminó en agosto');
    // Sin cuotas por venir no hay "Próxima" ni "Termina en".
    expect(view.facts.map((fact) => fact.label)).not.toContain('Próxima');
    expect(view.facts.map((fact) => fact.label)).not.toContain('Termina');
  });

  it('sin fecha de impacto (solo el mes) se pasa cuando el mes ya terminó', () => {
    const { cycle } = personal({
      total: 180_000,
      plan: plan('2026-09', 6, null),
      purchaseDate: '2026-08-20',
    });

    // septiembre ya terminó; octubre (el mes en curso) todavía no.
    expect(cycle.segments.slice(0, 3)).toEqual(['passed', 'next', 'future']);
  });
});

describe('debajo del ciclo: próxima, termina y medio', () => {
  it('personal que pagaste: Próxima, Termina y Medio', () => {
    expect(zapatillas().facts).toEqual([
      { label: 'Próxima', value: '5 de noviembre · $30.000' },
      { label: 'Termina', value: 'en abril' },
      { label: 'Medio', value: 'Visa Galicia' },
    ]);
  });

  it('sin medio cargado no se inventa la línea', () => {
    const view = personal({ total: 180_000, plan: plan('2026-11'), purchaseDate: '2026-10-14' });

    expect(view.facts.map((fact) => fact.label)).toEqual(['Próxima', 'Termina']);
  });

  it('con solo el mes, la próxima dice el mes y no inventa un día (T-05)', () => {
    const view = personal({
      total: 180_000,
      plan: plan('2026-11', 6, null),
      purchaseDate: '2026-10-14',
    });

    expect(view.facts[0]).toEqual({ label: 'Próxima', value: 'noviembre · $30.000' });
  });

  it('una fecha aproximada lo dice con "~"', () => {
    const view = personal({
      total: 180_000,
      plan: { ...plan('2026-11'), approximate: true },
      purchaseDate: '2026-10-14',
    });

    expect(view.facts[0]).toEqual({ label: 'Próxima', value: '~5 de noviembre · $30.000' });
  });

  it('el mes lleva el año solo cuando se confundiría con el de este año', () => {
    const view = personal({
      total: 360_000,
      plan: plan('2026-11', 24),
      purchaseDate: '2026-10-14',
    });

    expect(view.cycle.lastMonth).toBe('octubre de 2028');
    expect(view.facts.find((fact) => fact.label === 'Termina')?.value).toBe('en octubre de 2028');
    expect(view.cycle.firstMonth).toBe('noviembre');
  });

  it('compartido que pagó el otro: Tu cuota, Próxima, Termina y Pagó Martina; nada de Medio (C-05)', () => {
    expect(lavarropas({ iPaid: false }).facts).toEqual([
      { label: 'Tu cuota', value: '$30.000 de $60.000' },
      { label: 'Próxima', value: '5 de noviembre · $30.000' },
      { label: 'Termina', value: 'en abril' },
      { label: 'Pagó', value: 'Martina' },
    ]);
  });

  it('compartido que pagaste vos con tu tarjeta: Medio en lugar de Pagó', () => {
    const labels = lavarropas({ iPaid: true, methodName: 'Visa Galicia' }).facts;

    expect(labels.map((fact) => fact.label)).toEqual(['Tu cuota', 'Próxima', 'Termina', 'Medio']);
    expect(labels.at(-1)?.value).toBe('Visa Galicia');
  });

  it('compartido que pagaste vos sin medio cargado: "Pagó vos"', () => {
    const labels = lavarropas({ iPaid: true }).facts;

    expect(labels.at(-1)).toEqual({ label: 'Pagó', value: 'vos' });
  });
});

describe('la lista de cuotas, abajo', () => {
  it('las pasadas dicen "ya pasó" y ninguna otra palabra; los meses van en minúscula', () => {
    const { rows } = heladera();

    expect(rows.map((row) => row.when)).toEqual([
      'agosto · ya pasó',
      'septiembre · ya pasó',
      'octubre · ya pasó',
      'noviembre',
      'diciembre',
      'enero',
    ]);
    expect(rows.map((row) => row.past)).toEqual([true, true, true, false, false, false]);
    expect(rows[0]).toMatchObject({ label: '1 de 6', amount: 40_000 });
  });
});

describe('myInstallmentsOf · TU parte de cada cuota de un compartido (K9, Q-09)', () => {
  const planOf = plan('2026-11');

  it('50/50: $360.000 en 6 cuotas → $30.000 cada una, en los meses guardados', () => {
    const mine = myInstallmentsOf(
      { amount: 360_000, split: { mode: 'even' }, installments: planOf },
      1,
    );

    expect(mine.map((item) => item.amount)).toEqual([30_000, 30_000, 30_000, 30_000, 30_000, 30_000]);
    expect(mine.map((item) => item.month)).toEqual([
      '2026-11',
      '2026-12',
      '2027-01',
      '2027-02',
      '2027-03',
      '2027-04',
    ]);
  });

  it('reparto personalizado: cada cuota en la misma proporción, y la suma es tu parte', () => {
    const split = { mode: 'custom', shareSlot1: 90_000, shareSlot2: 270_000 } as const;
    const mine = myInstallmentsOf({ amount: 360_000, split, installments: planOf }, 1);
    const theirs = myInstallmentsOf({ amount: 360_000, split, installments: planOf }, 2);

    expect(mine.map((item) => item.amount)).toEqual([15_000, 15_000, 15_000, 15_000, 15_000, 15_000]);
    expect(mine.reduce((sum, item) => sum + item.amount, 0)).toBe(90_000);
    expect(theirs.reduce((sum, item) => sum + item.amount, 0)).toBe(270_000);
  });
});

describe('CA-45 · G-06 · CA-00 · el lenguaje', () => {
  const FORBIDDEN = /pagad[oa]|vas pagando|te queda|queda por pagar|disponible|libre/i;

  const every = [
    zapatillas(),
    heladera(),
    lavarropas({ iPaid: false }),
    lavarropas({ iPaid: true, methodName: 'Visa Galicia' }),
    personal({ total: 90_000, plan: plan('2026-06', 3), purchaseDate: '2026-05-10' }),
  ];

  it('nunca dice "Pagado", "Vas pagando", "te queda" ni "queda por pagar"', () => {
    for (const view of every) {
      const text = [
        view.purchaseLine,
        view.cycle.remaining,
        view.cycle.passed,
        view.cycle.firstMonth,
        view.cycle.lastMonth,
        ...view.facts.flatMap((fact) => [fact.label, fact.value]),
        ...view.rows.map((row) => row.when),
      ].join(' | ');

      expect(text).not.toMatch(FORBIDDEN);
    }
  });

  it('"Faltan" no lleva "N de N cuotas" a la derecha (el usuario lo pidió quitar)', () => {
    for (const view of every) expect(view.cycle.remaining ?? '').not.toMatch(/cuotas/);
  });
});

/* ── Un compartido: lavarropas de $360.000, 6 cuotas, 50/50, pagó Martina ──────── */

function lavarropas(args: { iPaid: boolean; methodName?: string | null }) {
  const total = 360_000;
  const wholeSchedule = scheduleInstallments(total, plan('2026-11'));
  const split = { mode: 'even' } as const;
  const totals = installmentAmounts(total, 6);
  const mine = splitInstallmentShares(totals, total, split).map((shares) => shareOf(shares, 1));

  return buildInstallmentsDetail({
    today: TODAY,
    purchaseDate: '2026-10-14',
    schedule: wholeSchedule.map((item, index) => ({ ...item, amount: mine[index]! })),
    shared: {
      purchaseTotal: total,
      installmentTotals: totals,
      payerName: 'Martina',
      iPaid: args.iPaid,
    },
    methodName: args.methodName ?? null,
  });
}
