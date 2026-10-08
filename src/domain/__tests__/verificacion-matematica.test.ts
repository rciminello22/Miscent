/**
 * §29.1 · Verificación matemática.
 *
 * "Casos de referencia que toda implementación debe reproducir exactamente.
 *  Son pruebas, no ejemplos ilustrativos. [DECISIÓN]"
 *
 * Si alguno de estos tests falla, la implementación está mal. No el test.
 */

import { describe, it, expect } from 'vitest';
import { expandPersonalOccurrences } from '../occurrences';
import { calculateRadar, radarForMonth } from '../radar';
import { calculateSharedBalance, calculateSpaceMonth } from '../shared-balance';
import { calculateUpcomingPayments } from '../upcoming';
import { futureFrom } from '../future';
import {
  MARTINA,
  RENZO,
  debito,
  mastercard,
  membership,
  memberPayment,
  movement,
  paidWith,
  personalFacts,
  personalRecurrence,
  sharedExpense,
  spaceFacts,
  visa,
} from './fixtures';

const HOY = '2026-10-07';

describe('§29.1 Caso A · Radar del mes', () => {
  it('Sin asignar = Ingresos registrados − (Gastado + Comprometido) = $400.000', () => {
    const facts = personalFacts({
      movements: [
        // Ingresos registrados: $1.200.000
        movement({ kind: 'income', amount: 1_200_000, date: '2026-10-05', category: 'sueldo' }),
        // Gastado: $250.000 al contado
        movement({ amount: 250_000, date: '2026-10-10', paymentMethodId: debito.id }),
      ],
      recurrences: [
        // Comprometido: $550.000 de fijos
        personalRecurrence({
          kind: 'expense',
          amount: 550_000,
          dayOfMonth: 1,
          startMonth: '2026-10',
          category: 'alquiler',
        }),
      ],
    });

    const radar = radarForMonth(facts, '2026-10');

    expect(radar.registeredIncome).toBe(1_200_000);
    expect(radar.spent).toBe(250_000);
    expect(radar.committed).toBe(550_000);
    expect(radar.assigned).toBe(800_000);
    expect(radar.unassigned).toBe(400_000);
    expect(radar.exceedsIncome).toBe(false);
  });

  it('CA-03 · sin ingresos registrados, Sin asignar NO se calcula', () => {
    const facts = personalFacts({
      movements: [movement({ amount: 250_000, date: '2026-10-10', paymentMethodId: debito.id })],
    });
    const radar = radarForMonth(facts, '2026-10');

    expect(radar.registeredIncome).toBe(0);
    expect(radar.unassigned).toBeNull();
    expect(radar.spent).toBe(250_000);
  });

  it('N-08 / CA-02 · los gastos y compromisos pueden superar los ingresos registrados', () => {
    const facts = personalFacts({
      movements: [
        movement({ kind: 'income', amount: 500_000, date: '2026-10-05', category: 'sueldo' }),
        movement({ amount: 535_000, date: '2026-10-10', paymentMethodId: debito.id }),
      ],
    });
    const radar = radarForMonth(facts, '2026-10');

    expect(radar.unassigned).toBe(-35_000);
    expect(radar.exceedsIncome).toBe(true);
  });

  it('N-07 · los meses no se arrastran', () => {
    const facts = personalFacts({
      movements: [
        movement({ kind: 'income', amount: 1_000_000, date: '2026-09-05', category: 'sueldo' }),
        movement({ amount: 100_000, date: '2026-09-10', paymentMethodId: debito.id }),
      ],
    });
    const octubre = radarForMonth(facts, '2026-10');
    expect(octubre.registeredIncome).toBe(0);
    expect(octubre.spent).toBe(0);
  });
});

describe('§29.1 Caso B · Compra con tarjeta en 1 pago', () => {
  const facts = personalFacts({
    movements: [movement({ amount: 120_000, date: '2026-10-20', paymentMethodId: visa.id })],
  });

  it('CA-53 · octubre: NO suma a Gastado; aparece como "con tarjeta este mes"', () => {
    const radar = radarForMonth(facts, '2026-10');
    expect(radar.spent).toBe(0);
    expect(radar.committed).toBe(0);
    expect(radar.cardPurchasesThisMonth).toEqual([{ month: '2026-11', amount: 120_000 }]);
  });

  it('CA-53 · noviembre (vencimiento 5/11): suma $120.000 a Comprometido', () => {
    const radar = radarForMonth(facts, '2026-11');
    expect(radar.committed).toBe(120_000);
    expect(radar.spent).toBe(0);
  });

  it('Próximos pagos: "5 nov · Visa · $120.000 · estimado según lo que registraste"', () => {
    const expansion = expandPersonalOccurrences(facts, { from: '2026-10', to: '2026-12' });
    const pagos = calculateUpcomingPayments(expansion, HOY);

    expect(pagos).toHaveLength(1);
    expect(pagos[0]).toMatchObject({
      kind: 'card-statement',
      amount: 120_000,
      date: '2026-11-05',
      isEstimate: true,
      includesOtherShare: 0,
      hasPassed: false,
    });
  });

  it('CA-30 · si la compra fuera el 27/10 (después del cierre), impacta el 5/12', () => {
    const tarde = personalFacts({
      movements: [movement({ amount: 120_000, date: '2026-10-27', paymentMethodId: visa.id })],
    });
    expect(radarForMonth(tarde, '2026-11').committed).toBe(0);
    expect(radarForMonth(tarde, '2026-12').committed).toBe(120_000);
  });
});

describe('§29.1 Caso C · Gasto compartido de contado, 50/50', () => {
  const superMercado = sharedExpense({
    amount: 100_000,
    date: '2026-10-05',
    payerSlot: RENZO,
    description: 'Supermercado',
  });
  const casa = spaceFacts({ expenses: [superMercado] });

  it('el espacio: Renzo puso $100.000, a cada uno le corresponden $50.000', () => {
    const mes = calculateSpaceMonth(casa, RENZO, '2026-10', HOY);
    expect(mes.total).toBe(100_000);
    expect(mes.viewer).toEqual({ put: 100_000, share: 50_000 });
    expect(mes.other).toMatchObject({ put: 0, share: 50_000, name: 'Martina' });
    expect(mes.viewerPutExtra).toBe(50_000);
  });

  it('la deuda es $50.000, no $100.000', () => {
    const renzo = calculateSharedBalance(casa, RENZO, HOY);
    expect(renzo.amount).toBe(50_000); // Martina le debe $50.000

    const martina = calculateSharedBalance(casa, MARTINA, HOY);
    expect(martina.amount).toBe(-50_000); // le debe $50.000 a Renzo
  });

  it('S-03 · el saldo del otro es el mismo con signo opuesto', () => {
    const renzo = calculateSharedBalance(casa, RENZO, HOY);
    const martina = calculateSharedBalance(casa, MARTINA, HOY);
    expect(renzo.amount).toBe(-martina.amount);
  });

  it('K9 · el radar de cada uno suma SOLO su parte: Gastado +$50.000', () => {
    const renzo = personalFacts({ spaces: [membership({ facts: casa, mySlot: RENZO })] });
    const radarRenzo = radarForMonth(renzo, '2026-10');
    expect(radarRenzo.spent).toBe(50_000);
    expect(radarRenzo.committed).toBe(0);

    const martina = personalFacts({
      userId: 'user-2',
      paymentMethods: [mastercard],
      spaces: [membership({ facts: casa, mySlot: MARTINA })],
    });
    const radarMartina = radarForMonth(martina, '2026-10');
    expect(radarMartina.spent).toBe(50_000);
  });

  it('Próximos pagos: nada, de ninguno de los dos (fue al contado y ya ocurrió)', () => {
    const renzo = personalFacts({ spaces: [membership({ facts: casa, mySlot: RENZO })] });
    const expansion = expandPersonalOccurrences(renzo, { from: '2026-10', to: '2026-12' });
    expect(calculateUpcomingPayments(expansion, HOY)).toHaveLength(0);
  });
});

describe('§29.1 Caso D · Compra compartida en cuotas', () => {
  // Heladera $600.000 en 6 cuotas de $100.000, Visa de Renzo, 50/50.
  // Compra el 10/10 → primera cuota el 5/11.
  const heladera = sharedExpense({
    id: 'heladera',
    amount: 600_000,
    date: '2026-10-10',
    payerSlot: RENZO,
    category: 'hogar',
    description: 'Heladera',
    installments: { count: 6, card: visa },
  });
  const casa = spaceFacts({ expenses: [heladera] });

  const renzo = personalFacts({
    spaces: [
      membership({
        facts: casa,
        mySlot: RENZO,
        paymentDetails: [paidWith('heladera', RENZO, visa.id)],
      }),
    ],
  });

  it('las 6 cuotas caen de noviembre a abril, el día 5', () => {
    expect(heladera.installments?.firstMonth).toBe('2026-11');
    expect(heladera.installments?.impactDay).toBe(5);
  });

  it('CA-32 · el día de la compra el saldo NO cambia', () => {
    const saldo = calculateSharedBalance(casa, RENZO, '2026-10-10');
    expect(saldo.amount).toBe(0);
    expect(saldo.settled).toBe(true);
  });

  it('CA-32 / P2 · cada cuota mueve el saldo al llegar su fecha de impacto', () => {
    expect(calculateSharedBalance(casa, RENZO, '2026-11-04').amount).toBe(0);
    expect(calculateSharedBalance(casa, RENZO, '2026-11-05').amount).toBe(50_000);
    expect(calculateSharedBalance(casa, RENZO, '2026-12-05').amount).toBe(100_000);
    expect(calculateSharedBalance(casa, RENZO, '2027-01-05').amount).toBe(150_000);
  });

  it('después de las 6 cuotas, sin pagos entre ellos, Martina debe $300.000', () => {
    const saldo = calculateSharedBalance(casa, RENZO, '2027-04-05');
    expect(saldo.amount).toBe(300_000);
    // Nunca se generó una deuda de $300.000 el día de la compra.
    expect(calculateSharedBalance(casa, RENZO, '2026-10-10').amount).toBe(0);
  });

  it('CA-31 · el radar de Renzo suma $50.000 de Comprometido por mes', () => {
    for (const mes of ['2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04']) {
      const radar = radarForMonth(renzo, mes);
      expect(radar.committed).toBe(50_000);
      expect(radar.spent).toBe(0);
    }
  });

  it('CA-31 · Próximos pagos de Renzo: Visa $100.000 con "incluye $50.000 de Martina"', () => {
    const expansion = expandPersonalOccurrences(renzo, { from: '2026-11', to: '2027-04' });
    const pagos = calculateUpcomingPayments(expansion, '2026-10-20');

    expect(pagos).toHaveLength(6);
    expect(pagos[0]).toMatchObject({
      kind: 'card-statement',
      amount: 100_000,
      includesOtherShare: 50_000,
      otherMemberName: 'Martina',
      date: '2026-11-05',
      isEstimate: true,
    });
  });

  it('CA-50 · Próximos pagos de Martina: NADA de esta compra (no paga la Visa)', () => {
    const martina = personalFacts({
      userId: 'user-2',
      paymentMethods: [mastercard],
      spaces: [membership({ facts: casa, mySlot: MARTINA })],
    });
    const expansion = expandPersonalOccurrences(martina, { from: '2026-11', to: '2027-04' });
    expect(calculateUpcomingPayments(expansion, '2026-10-20')).toHaveLength(0);
  });

  it('CA-31 · Martina, si activa su cuenta personal, ve $50.000/mes en Comprometido', () => {
    const martina = personalFacts({
      userId: 'user-2',
      paymentMethods: [mastercard],
      spaces: [membership({ facts: casa, mySlot: MARTINA })],
    });
    expect(radarForMonth(martina, '2026-11').committed).toBe(50_000);
    expect(radarForMonth(martina, '2027-04').committed).toBe(50_000);
  });

  it('CA-31 · el espacio muestra un compromiso compartido de $100.000 por mes', () => {
    const mes = calculateSpaceMonth(casa, RENZO, '2026-11', '2026-11-30');
    expect(mes.total).toBe(100_000);
  });
});

describe('§29.1 Caso E · Reparto personalizado por monto', () => {
  // Super $100.000, pagó Renzo. Personalizado: Renzo $60.000 · Martina $40.000.
  const superMercado = sharedExpense({
    amount: 100_000,
    date: '2026-10-05',
    payerSlot: RENZO,
    split: { mode: 'custom', shareSlot1: 60_000, shareSlot2: 40_000 },
    description: 'Supermercado',
  });
  const casa = spaceFacts({ expenses: [superMercado] });

  it('CA-24 · Martina debe $40.000', () => {
    expect(calculateSharedBalance(casa, RENZO, HOY).amount).toBe(40_000);
    expect(calculateSharedBalance(casa, MARTINA, HOY).amount).toBe(-40_000);
  });

  it('CA-24 · el radar de Renzo suma $60.000 y el de Martina $40.000', () => {
    const renzo = personalFacts({ spaces: [membership({ facts: casa, mySlot: RENZO })] });
    expect(radarForMonth(renzo, '2026-10').spent).toBe(60_000);

    const martina = personalFacts({
      userId: 'user-2',
      paymentMethods: [mastercard],
      spaces: [membership({ facts: casa, mySlot: MARTINA })],
    });
    expect(radarForMonth(martina, '2026-10').spent).toBe(40_000);
  });

  it('puso y le corresponde son cosas distintas (§7.2)', () => {
    const mes = calculateSpaceMonth(casa, RENZO, '2026-10', HOY);
    expect(mes.viewer).toEqual({ put: 100_000, share: 60_000 });
    expect(mes.other).toMatchObject({ put: 0, share: 40_000 });
  });
});

describe('§29.1 Caso F · Pago parcial entre miembros', () => {
  const superMercado = sharedExpense({
    amount: 100_000,
    date: '2026-10-05',
    payerSlot: RENZO,
    split: { mode: 'custom', shareSlot1: 60_000, shareSlot2: 40_000 },
  });

  it('CA-46 · Martina debe $40.000; paga $15.000 → debe $25.000', () => {
    const antes = spaceFacts({ expenses: [superMercado] });
    expect(calculateSharedBalance(antes, RENZO, HOY).amount).toBe(40_000);

    const despues = spaceFacts({
      expenses: [superMercado],
      payments: [
        memberPayment({ fromSlot: MARTINA, toSlot: RENZO, amount: 15_000, date: '2026-10-06' }),
      ],
    });
    expect(calculateSharedBalance(despues, RENZO, HOY).amount).toBe(25_000);
  });

  it('CA-46 / P-04 · el pago NO cambia "puso" ni el radar de nadie', () => {
    const conPago = spaceFacts({
      expenses: [superMercado],
      payments: [
        memberPayment({ fromSlot: MARTINA, toSlot: RENZO, amount: 15_000, date: '2026-10-06' }),
      ],
    });

    const mes = calculateSpaceMonth(conPago, RENZO, '2026-10', HOY);
    expect(mes.viewer).toEqual({ put: 100_000, share: 60_000 });
    expect(mes.other).toMatchObject({ put: 0, share: 40_000 });

    const renzo = personalFacts({ spaces: [membership({ facts: conPago, mySlot: RENZO })] });
    const radar = radarForMonth(renzo, '2026-10');
    expect(radar.spent).toBe(60_000);
    expect(radar.committed).toBe(0);
    // N-01 · un pago entre miembros no es un ingreso registrado.
    expect(radar.registeredIncome).toBe(0);
  });

  it('P-03 · la app propone el monto y la dirección que dejan el saldo en cero', async () => {
    const { proposeSettlementPayment } = await import('../shared-balance');
    const casa = spaceFacts({ expenses: [superMercado] });

    const desdeRenzo = proposeSettlementPayment(calculateSharedBalance(casa, RENZO, HOY));
    expect(desdeRenzo).toEqual({ fromSlot: MARTINA, toSlot: RENZO, amount: 40_000 });

    const desdeMartina = proposeSettlementPayment(calculateSharedBalance(casa, MARTINA, HOY));
    expect(desdeMartina).toEqual({ fromSlot: MARTINA, toSlot: RENZO, amount: 40_000 });
  });

  it('S-06 · saldo cero: "Están a mano"', () => {
    const saldado = spaceFacts({
      expenses: [superMercado],
      payments: [
        memberPayment({ fromSlot: MARTINA, toSlot: RENZO, amount: 40_000, date: '2026-10-06' }),
      ],
    });
    const saldo = calculateSharedBalance(saldado, RENZO, HOY);
    expect(saldo.amount).toBe(0);
    expect(saldo.settled).toBe(true);
  });
});

describe('§29.1 Caso G · Gasto compartido puntual con tarjeta', () => {
  // Supermercado $100.000 el 20/10 con la Visa de Renzo (cierre 25, vence 5),
  // 1 pago, 50/50.
  const superMercado = sharedExpense({
    id: 'super-visa',
    amount: 100_000,
    date: '2026-10-20',
    payerSlot: RENZO,
    description: 'Supermercado',
  });
  const casa = spaceFacts({ expenses: [superMercado] });

  const renzo = personalFacts({
    spaces: [
      membership({
        facts: casa,
        mySlot: RENZO,
        paymentDetails: [paidWith('super-visa', RENZO, visa.id)],
      }),
    ],
  });

  it('CA-29 / P19 · el saldo cambia EN LA FECHA DE COMPRA, no en el vencimiento', () => {
    expect(calculateSharedBalance(casa, RENZO, '2026-10-19').amount).toBe(0);
    expect(calculateSharedBalance(casa, RENZO, '2026-10-20').amount).toBe(50_000);
    // Y no espera al 5/11.
    expect(calculateSharedBalance(casa, RENZO, '2026-10-25').amount).toBe(50_000);
  });

  it('radar de Renzo · octubre: "Con tarjeta este mes" $50.000 (su parte)', () => {
    const radar = radarForMonth(renzo, '2026-10');
    expect(radar.spent).toBe(0);
    expect(radar.committed).toBe(0);
    expect(radar.cardPurchasesThisMonth).toEqual([{ month: '2026-11', amount: 50_000 }]);
  });

  it('radar de Renzo · noviembre: Comprometido +$50.000', () => {
    expect(radarForMonth(renzo, '2026-11').committed).toBe(50_000);
  });

  it('C-05 · radar de Martina: Gastado de octubre +$50.000 (para ella no hay tarjeta)', () => {
    const martina = personalFacts({
      userId: 'user-2',
      paymentMethods: [mastercard],
      spaces: [membership({ facts: casa, mySlot: MARTINA })],
    });
    const radar = radarForMonth(martina, '2026-10');
    expect(radar.spent).toBe(50_000);
    expect(radar.committed).toBe(0);
  });

  it('Próximos pagos de Renzo: Visa $100.000 · incluye $50.000 de Martina', () => {
    const expansion = expandPersonalOccurrences(renzo, { from: '2026-10', to: '2026-12' });
    const pagos = calculateUpcomingPayments(expansion, HOY);

    expect(pagos).toHaveLength(1);
    expect(pagos[0]).toMatchObject({
      amount: 100_000,
      includesOtherShare: 50_000,
      otherMemberName: 'Martina',
      date: '2026-11-05',
      isEstimate: true,
    });
  });

  it('CA-36 / CA-50 · Próximos pagos de Martina: nada', () => {
    const martina = personalFacts({
      userId: 'user-2',
      paymentMethods: [mastercard],
      spaces: [membership({ facts: casa, mySlot: MARTINA })],
    });
    const expansion = expandPersonalOccurrences(martina, { from: '2026-10', to: '2026-12' });
    expect(calculateUpcomingPayments(expansion, HOY)).toHaveLength(0);
  });
});

describe('§23.1 · Futuro: 6 meses de compromisos', () => {
  it('CA-38 · muestra comprometido, ingreso previsto y sin asignar por mes', () => {
    const facts = personalFacts({
      recurrences: [
        personalRecurrence({
          kind: 'income',
          amount: 1_200_000,
          dayOfMonth: 5,
          startMonth: '2026-10',
          category: 'sueldo',
        }),
        personalRecurrence({
          kind: 'expense',
          amount: 230_000,
          dayOfMonth: 1,
          startMonth: '2026-10',
          category: 'alquiler',
        }),
      ],
      movements: [
        movement({
          amount: 480_000,
          date: '2026-10-10',
          paymentMethodId: visa.id,
          installments: { count: 4, card: visa },
        }),
      ],
    });

    const futuro = futureFrom(facts, '2026-11', 6);
    expect(futuro.months).toHaveLength(6);

    // Noviembre a febrero: fijo $230.000 + cuota $120.000.
    expect(futuro.months[0]).toMatchObject({
      month: '2026-11',
      committed: 350_000,
      expectedIncome: 1_200_000,
      unassigned: 850_000,
    });
    // Marzo: ya terminaron las cuotas, queda el fijo.
    expect(futuro.months[4]).toMatchObject({ month: '2027-03', committed: 230_000 });
  });

  it('§23.1 · la línea de cuotas que terminan: "tu comprometido baja $X por mes"', () => {
    const facts = personalFacts({
      recurrences: [
        personalRecurrence({
          kind: 'income',
          amount: 1_200_000,
          dayOfMonth: 5,
          startMonth: '2026-10',
          category: 'sueldo',
        }),
      ],
      movements: [
        movement({
          amount: 240_000,
          date: '2026-10-10',
          paymentMethodId: visa.id,
          installments: { count: 4, card: visa },
        }),
      ],
    });

    const futuro = futureFrom(facts, '2026-11', 6);
    // Última cuota en febrero → el comprometido baja a partir de marzo.
    expect(futuro.endingInstallments).toEqual([
      { month: '2027-03', count: 1, monthlyDrop: 60_000 },
    ]);
  });

  it('N-04 · un mes futuro sin ingreso registrado no calcula Sin asignar', () => {
    const facts = personalFacts({
      movements: [
        movement({
          amount: 240_000,
          date: '2026-10-10',
          paymentMethodId: visa.id,
          installments: { count: 4, card: visa },
        }),
      ],
    });
    const futuro = futureFrom(facts, '2026-11', 6);
    expect(futuro.months[0]?.unassigned).toBeNull();
    expect(futuro.months[0]?.committed).toBe(60_000);
  });
});
