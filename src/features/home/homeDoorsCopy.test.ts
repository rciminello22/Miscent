import { describe, it, expect } from 'vitest';
import type { FutureMonth } from '@domain/future';
import type { UpcomingPayment } from '@domain/upcoming';
import { formatPesos } from '@/lib/format';
import { nextMonthsDoorContent, spacesDoorCaption, upcomingDoorContent } from './homeDoorsCopy';

/**
 * §15 · lo que dicen las puertas de Inicio. TS puro: cada frase sale de acá, la
 * pantalla solo la dibuja.
 */

function payment(overrides: Partial<UpcomingPayment> & { id: string }): UpcomingPayment {
  return {
    kind: 'fixed',
    label: 'Alquiler',
    cardId: null,
    amount: 300_000,
    includesOtherShare: 0,
    otherMemberName: null,
    date: '2026-11-01',
    month: '2026-11',
    approximate: false,
    dateApprox: false,
    hasPassed: false,
    items: [],
    isEstimate: false,
    ...overrides,
  };
}

describe('upcomingDoorContent · la puerta de Próximos pagos', () => {
  it('sin pagos no hay puerta', () => {
    expect(upcomingDoorContent([], formatPesos)).toBeNull();
  });

  it('el primero, con su fecha, nombre y monto', () => {
    const content = upcomingDoorContent([payment({ id: 'a' })], formatPesos);

    expect(content).toEqual({ line: '1 nov · Alquiler · $300.000', more: null });
  });

  it('N-10 · un resumen de tarjeta se rotula "resumen estimado" en su fila', () => {
    const content = upcomingDoorContent(
      [
        payment({
          id: 'visa',
          kind: 'card-statement',
          label: 'Visa Galicia',
          amount: 120_000,
          date: '2026-10-20',
          month: '2026-10',
          isEstimate: true,
        }),
      ],
      formatPesos,
    );

    expect(content?.line).toBe('20 oct · Visa Galicia · resumen estimado · $120.000');
  });

  it('T-02 · una fecha de "Más o menos" lleva "~" y "(aprox.)"; la frase "Fechas aproximadas" no va acá', () => {
    const content = upcomingDoorContent(
      [
        payment({
          id: 'visa',
          kind: 'card-statement',
          label: 'Visa Galicia',
          amount: 180_000,
          date: '2026-11-15',
          month: '2026-11',
          isEstimate: true,
          dateApprox: true,
        }),
      ],
      formatPesos,
    );

    expect(content?.line).toBe('~15 nov · Visa Galicia · resumen estimado (aprox.) · $180.000');
  });

  it('T-05 · un "No sé" muestra el mes, sin "~" ni "(aprox.)"', () => {
    const content = upcomingDoorContent(
      [
        payment({
          id: 'mc',
          kind: 'card-statement',
          label: 'Mastercard Santander',
          amount: 60_000,
          date: null,
          approximate: true,
          isEstimate: true,
        }),
      ],
      formatPesos,
    );

    expect(content?.line).toBe('noviembre · Mastercard Santander · resumen estimado · $60.000');
  });

  it('"y N más" cuenta los que no se ven', () => {
    const content = upcomingDoorContent(
      [payment({ id: 'a' }), payment({ id: 'b' }), payment({ id: 'c' })],
      formatPesos,
    );

    expect(content?.more).toBe('y 2 más');
  });

  it('con dos, "y 1 más"', () => {
    const content = upcomingDoorContent([payment({ id: 'a' }), payment({ id: 'b' })], formatPesos);

    expect(content?.more).toBe('y 1 más');
  });

  it('T-05 · sin día conocido muestra el mes, nunca inventa una fecha', () => {
    const content = upcomingDoorContent(
      [payment({ id: 'a', date: null, approximate: true, label: 'Tarjeta', amount: 80_000 })],
      formatPesos,
    );

    expect(content?.line).toBe('noviembre · Tarjeta · $80.000');
  });

  it('el "resumen estimado" no se repite si la etiqueta ya lo dice', () => {
    const content = upcomingDoorContent(
      [
        payment({
          id: 's',
          kind: 'declared-statement',
          label: 'Resumen Visa',
          isEstimate: true,
        }),
      ],
      formatPesos,
    );

    expect(content?.line).toBe('1 nov · Resumen Visa · $300.000');
  });
});

function month(overrides: Partial<FutureMonth> & { month: string }): FutureMonth {
  return {
    committed: 0,
    expectedIncome: 1_200_000,
    unassigned: 1_200_000,
    breakdown: { fixed: 0, installments: 0, cards: [], fromSpaces: 0 },
    ...overrides,
  };
}

describe('nextMonthsDoorContent · la puerta de Próximos meses', () => {
  const today = '2026-10-15';

  it('una barra por mes, con el mayor como referencia', () => {
    const content = nextMonthsDoorContent({
      months: [
        month({ month: '2026-11', committed: 620_000, unassigned: 580_000 }),
        month({ month: '2026-12', committed: 480_000, unassigned: 720_000 }),
        month({ month: '2027-01', committed: 350_000, unassigned: 850_000 }),
      ],
      today,
      formatAmount: formatPesos,
    });

    expect(content.bars.map((bar) => bar.month)).toEqual(['2026-11', '2026-12', '2027-01']);
    expect(content.maxCommitted).toBe(620_000);
    expect(content.excessPhrase).toBeNull();
    expect(content.bars.every((bar) => !bar.exceeds)).toBe(true);
  });

  it('N-08 · un mes futuro con Sin asignar negativo lo dice, con el mes adelante y sin signo', () => {
    const content = nextMonthsDoorContent({
      months: [
        month({ month: '2026-11', committed: 1_235_000, unassigned: -35_000 }),
        month({ month: '2026-12', committed: 480_000, unassigned: 720_000 }),
      ],
      today,
      formatAmount: formatPesos,
    });

    expect(content.excessPhrase).toBe(
      'En noviembre tus gastos y compromisos superan tus ingresos previstos por $35.000.',
    );
    expect(content.bars.map((bar) => bar.exceeds)).toEqual([true, false]);
  });

  it('con varios meses en exceso, nombra solo el primero', () => {
    const content = nextMonthsDoorContent({
      months: [
        month({ month: '2026-11', committed: 1_000_000, unassigned: 200_000 }),
        month({ month: '2026-12', committed: 1_300_000, unassigned: -100_000 }),
        month({ month: '2027-01', committed: 1_500_000, unassigned: -300_000 }),
      ],
      today,
      formatAmount: formatPesos,
    });

    expect(content.excessPhrase).toBe(
      'En diciembre tus gastos y compromisos superan tus ingresos previstos por $100.000.',
    );
  });

  it('un mes de otro año lleva el año', () => {
    const content = nextMonthsDoorContent({
      months: [month({ month: '2027-01', committed: 1_300_000, unassigned: -100_000 })],
      today,
      formatAmount: formatPesos,
    });

    expect(content.excessPhrase).toContain('En enero de 2027 tus gastos');
  });

  it('N-04 · sin ingreso previsto no se calcula: no se dice nada', () => {
    const content = nextMonthsDoorContent({
      months: [month({ month: '2026-11', committed: 620_000, expectedIncome: 0, unassigned: null })],
      today,
      formatAmount: formatPesos,
    });

    expect(content.excessPhrase).toBeNull();
    expect(content.bars[0]!.exceeds).toBe(false);
  });

  it('2D · el monto va aparte, con "+", para ponerlo a la derecha de la puerta', () => {
    const content = nextMonthsDoorContent({
      months: [
        month({ month: '2026-11', committed: 1_235_000, unassigned: -35_000 }),
        month({ month: '2026-12', committed: 480_000, unassigned: 720_000 }),
      ],
      today,
      formatAmount: formatPesos,
    });

    expect(content.excessValue).toBe('+$35.000');
  });

  it('2D · el monto es el del mismo mes que nombra la frase', () => {
    const content = nextMonthsDoorContent({
      months: [
        month({ month: '2026-11', committed: 1_000_000, unassigned: 200_000 }),
        month({ month: '2026-12', committed: 1_300_000, unassigned: -100_000 }),
        month({ month: '2027-01', committed: 1_500_000, unassigned: -300_000 }),
      ],
      today,
      formatAmount: formatPesos,
    });

    expect(content.excessValue).toBe('+$100.000');
  });

  it('2D · sin exceso no hay monto', () => {
    const content = nextMonthsDoorContent({
      months: [month({ month: '2026-11', committed: 620_000, unassigned: 580_000 })],
      today,
      formatAmount: formatPesos,
    });

    expect(content.excessValue).toBeNull();
  });

  it('2D · cada barra lleva cuánto se pasa, para dibujar el tope a escala', () => {
    const content = nextMonthsDoorContent({
      months: [
        month({ month: '2026-11', committed: 1_235_000, unassigned: -35_000 }),
        month({ month: '2026-12', committed: 480_000, unassigned: 720_000 }),
        month({ month: '2027-01', committed: 350_000, expectedIncome: 0, unassigned: null }),
      ],
      today,
      formatAmount: formatPesos,
    });

    expect(content.bars.map((bar) => bar.excess)).toEqual([35_000, 0, 0]);
  });
});

describe('spacesDoorCaption', () => {
  it('con varios espacios, la cuenta', () => {
    expect(spacesDoorCaption(2)).toBe('2 espacios');
    expect(spacesDoorCaption(3)).toBe('3 espacios');
  });
});
