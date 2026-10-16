import { describe, it, expect } from 'vitest';
import type { ActiveInstallmentPlan } from '@domain/future';
import type { UpcomingPayment } from '@domain/upcoming';
import { formatPesos } from '@/lib/format';
import {
  currentMonthHeadline,
  endingInstallmentsLine,
  fixedDoor,
  futureHeroLine,
  installmentsDoor,
  paymentsDoor,
  paymentsFootnotes,
} from './futureView';

/**
 * §23 · lo que dicen el N1 y las puertas de Futuro. TS puro: cada frase sale de
 * acá y la pantalla solo la dibuja.
 */

const TODAY = '2026-10-15';

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

describe('futureHeroLine · bajo la cifra comprometida del mes', () => {
  it('CA-38 · el ingreso previsto y Sin asignar, con "según tus ingresos previstos"', () => {
    expect(futureHeroLine(580_000, 1_200_000, formatPesos)).toEqual({
      kind: 'unassigned',
      text: 'Ingreso previsto $1.200.000 · Sin asignar $580.000 · según tus ingresos previstos',
    });
  });

  it('en cero sigue siendo una cifra, no un exceso', () => {
    expect(futureHeroLine(0, 620_000, formatPesos)).toEqual({
      kind: 'unassigned',
      text: 'Ingreso previsto $620.000 · Sin asignar $0 · según tus ingresos previstos',
    });
  });

  it('N-08 · negativo: la frase con el exceso sin signo; la línea queda solo con el ingreso previsto', () => {
    expect(futureHeroLine(-35_000, 1_200_000, formatPesos)).toEqual({
      kind: 'exceeds',
      text: 'Tus gastos y compromisos superan tus ingresos previstos por',
      amount: 35_000,
      incomeText: 'Ingreso previsto $1.200.000',
    });
  });

  it('N-08 · con el negativo la línea no repite Sin asignar ni la cifra con signo', () => {
    const line = futureHeroLine(-35_000, 1_200_000, formatPesos);

    expect(JSON.stringify(line)).not.toMatch(/Sin asignar|-35|−35/);
  });

  it('N-04 · sin ingreso previsto no se calcula: "Sin ingreso registrado"', () => {
    expect(futureHeroLine(null, 0, formatPesos)).toEqual({
      kind: 'noIncome',
      text: 'Sin ingreso registrado',
    });
  });

  it('CA-00 · ninguna de las frases usa términos prohibidos', () => {
    const lines = [
      futureHeroLine(580_000, 1_200_000, formatPesos),
      futureHeroLine(-35_000, 1_200_000, formatPesos),
      futureHeroLine(null, 0, formatPesos),
    ];
    expect(JSON.stringify(lines)).not.toMatch(/disponible|te queda|libre|podés gastar|por día|saldo/i);
  });
});

describe('endingInstallmentsLine · CA-38, la línea de cuotas que terminan', () => {
  it('"En marzo terminan 2 cuotas: tu comprometido baja $80.000 por mes."', () => {
    expect(
      endingInstallmentsLine({ month: '2026-12', count: 2, monthlyDrop: 80_000 }, '2026-11', formatPesos),
    ).toBe('En diciembre terminan 2 cuotas: tu comprometido baja $80.000 por mes.');
  });

  it('con una sola, en singular', () => {
    expect(
      endingInstallmentsLine({ month: '2026-12', count: 1, monthlyDrop: 50_000 }, '2026-11', formatPesos),
    ).toBe('En diciembre termina 1 cuota: tu comprometido baja $50.000 por mes.');
  });

  it('G-06/§33 · nunca "se liberan"', () => {
    const line = endingInstallmentsLine(
      { month: '2027-03', count: 2, monthlyDrop: 80_000 },
      '2026-11',
      formatPesos,
    );

    expect(line).not.toMatch(/liber/i);
    expect(line).toContain('marzo de 2027');
  });
});

describe('currentMonthHeadline · el mes en curso muestra solo los pagos que faltan', () => {
  it('cuenta los pagos desde hoy, nunca una suma (las lentes de §7.3 no se mezclan)', () => {
    expect(currentMonthHeadline(3)).toBe('3 pagos desde hoy');
    expect(currentMonthHeadline(1)).toBe('1 pago desde hoy');
  });

  it('sin pagos, lo dice', () => {
    expect(currentMonthHeadline(0)).toBe('No tenés más pagos este mes.');
  });
});

describe('paymentsDoor · Próximos pagos del mes elegido', () => {
  const payments = [
    payment({ id: 'a', date: '2026-11-01' }),
    payment({ id: 'b', date: '2026-11-05' }),
    payment({ id: 'c', date: '2026-11-10' }),
    payment({ id: 'd', date: '2026-11-15' }),
  ];

  it('"4 pagos · el primero, 1 nov"', () => {
    expect(paymentsDoor({ payments, month: '2026-11', today: TODAY, isCurrentMonth: false })).toEqual({
      title: 'Próximos pagos de noviembre',
      caption: '4 pagos · el primero, 1 nov',
    });
  });

  it('con un solo pago', () => {
    expect(
      paymentsDoor({ payments: [payments[0]!], month: '2026-11', today: TODAY, isCurrentMonth: false })
        ?.caption,
    ).toBe('1 pago · el primero, 1 nov');
  });

  it('el mes en curso dice "desde hoy"', () => {
    const current = [payment({ id: 'x', date: '2026-10-20', month: '2026-10' })];

    expect(paymentsDoor({ payments: current, month: '2026-10', today: TODAY, isCurrentMonth: true })).toEqual({
      title: 'Próximos pagos de octubre',
      caption: '1 pago desde hoy · el primero, 20 oct',
    });
  });

  it('T-05 · sin día conocido, el mes: nunca una fecha inventada', () => {
    const approx = [payment({ id: 'x', date: null, approximate: true })];

    expect(
      paymentsDoor({ payments: approx, month: '2026-11', today: TODAY, isCurrentMonth: false })?.caption,
    ).toBe('1 pago · el primero, noviembre');
  });

  it('sin pagos no hay puerta: lo condicional no ocupa lugar', () => {
    expect(paymentsDoor({ payments: [], month: '2026-11', today: TODAY, isCurrentMonth: false })).toBeNull();
  });
});

function plan(overrides: Partial<ActiveInstallmentPlan> & { purchaseId: string }): ActiveInstallmentPlan {
  return {
    label: 'Heladera',
    current: 2,
    count: 6,
    myShare: 50_000,
    remaining: 200_000,
    endsOn: '2027-03',
    spaceName: null,
    fromFormerMembership: false,
    ...overrides,
  };
}

describe('installmentsDoor · Tus cuotas', () => {
  it('"2 compras activas · la última termina en marzo"', () => {
    expect(
      installmentsDoor(
        [plan({ purchaseId: 'a', endsOn: '2027-01' }), plan({ purchaseId: 'b', endsOn: '2027-03' })],
        TODAY,
      ),
    ).toEqual({ title: 'Tus cuotas', caption: '2 compras activas · la última termina en marzo de 2027' });
  });

  it('dentro del mismo año no lleva año', () => {
    expect(installmentsDoor([plan({ purchaseId: 'a', endsOn: '2026-12' })], TODAY)?.caption).toBe(
      '1 compra activa · la última termina en diciembre',
    );
  });

  it('sin cuotas no hay puerta', () => {
    expect(installmentsDoor([], TODAY)).toBeNull();
  });
});

describe('fixedDoor · Tus fijos', () => {
  it('cuenta los fijos', () => {
    expect(fixedDoor(5)).toEqual({ title: 'Tus fijos', caption: '5 fijos' });
    expect(fixedDoor(1)).toEqual({ title: 'Tus fijos', caption: '1 fijo' });
  });

  it('sin fijos no hay puerta', () => {
    expect(fixedDoor(0)).toBeNull();
  });
});

describe('paymentsFootnotes · el pie de la lista de pagos', () => {
  it('N-10 · la frase de los resúmenes estimados va UNA vez, aunque haya varios', () => {
    const notes = paymentsFootnotes([
      payment({ id: 'a', isEstimate: true, kind: 'card-statement' }),
      payment({ id: 'b', isEstimate: true, kind: 'card-statement' }),
      payment({ id: 'c' }),
    ]);

    expect(notes.filter((note) => note.includes('Estimado según lo que registraste'))).toHaveLength(1);
  });

  it('sin resúmenes estimados, la frase no aparece', () => {
    const notes = paymentsFootnotes([payment({ id: 'c' })]);

    expect(notes.some((note) => note.includes('Estimado'))).toBe(false);
  });

  it('siempre aclara que son los pagos que hace la persona, y que lo del otro se ve en el espacio', () => {
    const [last] = paymentsFootnotes([payment({ id: 'c' })]).slice(-1);

    expect(last).toBe(
      'Son los pagos que hacés vos. Lo que paga otra persona, aunque tengas una parte, se ve en el espacio compartido.',
    );
  });

  it('T-05 · "Fechas aproximadas" una vez, si algún pago lo es', () => {
    const notes = paymentsFootnotes([
      payment({ id: 'a', approximate: true }),
      payment({ id: 'b', approximate: true }),
    ]);

    expect(notes.filter((note) => note === 'Fechas aproximadas')).toHaveLength(1);
  });

  it('T-02 · una fecha de "Más o menos" también pide "Fechas aproximadas", una sola vez', () => {
    const notes = paymentsFootnotes([
      payment({ id: 'a', dateApprox: true }),
      payment({ id: 'b', approximate: true }),
    ]);

    expect(notes.filter((note) => note === 'Fechas aproximadas')).toHaveLength(1);
    expect(paymentsFootnotes([payment({ id: 'c', dateApprox: true })])).toContain(
      'Fechas aproximadas',
    );
  });
});
