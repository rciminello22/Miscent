/**
 * §31 · Casos de uso completos, y los criterios de aceptación de §36 que
 * dependen del cálculo.
 *
 * Personajes: Renzo (slot 1) y Martina (slot 2). Octubre de 2026.
 */

import { describe, it, expect } from 'vitest';
import { expandPersonalOccurrences, expandSpaceOccurrences, spaceHorizon } from '../occurrences';
import { radarForMonth } from '../radar';
import {
  calculateSharedBalance,
  calculateSpaceMonth,
  pendingSharedInstallments,
} from '../shared-balance';
import { calculateUpcomingPayments, estimatedStatement, upcomingForHome } from '../upcoming';
import { activeInstallmentPlans, futureFrom, previewInstallments } from '../future';
import { planExistingInstallments, scheduleInstallments } from '../installments';
import {
  MARTINA,
  RENZO,
  debito,
  declaredStatement,
  mastercard,
  membership,
  memberPayment,
  movement,
  override,
  paidWith,
  personalFacts,
  personalRecurrence,
  sharedExpense,
  sharedRecurrence,
  spaceFacts,
  transferencia,
  visa,
} from './fixtures';

const HOY = '2026-10-07';

describe('§31 Caso 1 · Renzo activa su cuenta personal', () => {
  // O3: sueldo $1.200.000 día 5; Visa (cierre 25, vence 5); último resumen
  // pagado; cuotas "2 de 6, $30.000"; consumos desde el cierre $40.000;
  // fijos: internet $25.000 y gimnasio $30.000 (débito).
  const cuotasExistentes = planExistingInstallments({
    installmentAmount: 30_000,
    paidCount: 2,
    totalCount: 6,
    lastStatementMonth: '2026-10',
    impactDay: visa.dueDay,
  });

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
        amount: 25_000,
        dayOfMonth: 10,
        startMonth: '2026-10',
        category: 'internet',
        paymentMethodId: debito.id,
      }),
      personalRecurrence({
        kind: 'expense',
        amount: 30_000,
        dayOfMonth: 15,
        startMonth: '2026-10',
        category: 'gimnasio',
        paymentMethodId: debito.id,
      }),
    ],
    movements: [
      // Q-06 · las 4 cuotas que faltan, de $30.000, desde noviembre.
      {
        id: 'cuotas-previas',
        kind: 'expense',
        amount: cuotasExistentes.remainingTotal,
        date: '2026-10-07',
        category: 'otros',
        description: 'Cuotas en curso',
        paymentMethodId: visa.id,
        installments: cuotasExistentes.plan,
      },
      // T-08 · consumos desde el último cierre: 1 pago con tarjeta, fecha hoy.
      movement({
        amount: 40_000,
        date: '2026-10-07',
        paymentMethodId: visa.id,
        description: 'Consumos previos (aprox.)',
      }),
    ],
  });

  it('Futuro de noviembre: comprometido $125.000 e ingreso previsto $1.200.000', () => {
    const futuro = futureFrom(facts, '2026-11', 6);
    expect(futuro.months[0]).toMatchObject({
      month: '2026-11',
      // cuota $30.000 + consumos $40.000 + fijos $55.000
      committed: 125_000,
      expectedIncome: 1_200_000,
      unassigned: 1_075_000,
    });
  });

  it('Próximos pagos: el resumen estimado de la Visa del 5/11 es $70.000', () => {
    const expansion = expandPersonalOccurrences(facts, { from: '2026-10', to: '2027-03' });
    const resumen = estimatedStatement(expansion, visa.id, '2026-11');
    // cuota $30.000 + consumos previos $40.000
    expect(resumen.amount).toBe(70_000);
    expect(resumen.includesOtherShare).toBe(0);
  });

  it('CA-35 · todo resumen de tarjeta se marca como estimado', () => {
    const expansion = expandPersonalOccurrences(facts, { from: '2026-10', to: '2027-03' });
    const pagos = calculateUpcomingPayments(expansion, HOY);
    const resumenes = pagos.filter((pago) => pago.kind === 'card-statement');
    expect(resumenes.length).toBeGreaterThan(0);
    expect(resumenes.every((pago) => pago.isEstimate)).toBe(true);
  });

  it('los fijos aparecen como pagos propios con su día, fuera del resumen', () => {
    const expansion = expandPersonalOccurrences(facts, { from: '2026-11', to: '2026-11' });
    const pagos = calculateUpcomingPayments(expansion, '2026-10-20');
    const fijos = pagos.filter((pago) => pago.kind === 'fixed');
    expect(fijos.map((pago) => pago.date)).toEqual(['2026-11-10', '2026-11-15']);
  });

  it('§23.3 · "Tus cuotas" muestra la compra activa con lo que falta', () => {
    const expansion = expandPersonalOccurrences(facts, { from: '2026-10', to: '2027-03' });
    const planes = activeInstallmentPlans(expansion, HOY);
    const cuotas = planes.find((plan) => plan.label === 'Cuotas en curso');
    expect(cuotas).toMatchObject({ count: 4, remaining: 120_000, endsOn: '2027-02' });
  });
});

describe('§31 Caso 7 · Varias semanas de gastos compartidos', () => {
  const casa = spaceFacts({
    expenses: [
      sharedExpense({ amount: 40_000, date: '2026-10-03', payerSlot: MARTINA, description: 'Internet' }),
      sharedExpense({ amount: 100_000, date: '2026-10-08', payerSlot: RENZO, description: 'Supermercado' }),
      sharedExpense({ amount: 60_000, date: '2026-10-12', payerSlot: MARTINA, description: 'Cena' }),
      sharedExpense({ amount: 90_000, date: '2026-10-18', payerSlot: MARTINA, description: 'Supermercado' }),
      // Personalizado: Renzo $0, Martina $30.000.
      sharedExpense({
        amount: 30_000,
        date: '2026-10-24',
        payerSlot: RENZO,
        description: 'Farmacia',
        split: { mode: 'custom', shareSlot1: 0, shareSlot2: 30_000 },
      }),
      sharedExpense({ amount: 50_000, date: '2026-10-29', payerSlot: RENZO, description: 'Verdulería' }),
    ],
  });

  const FIN_DE_MES = '2026-10-31';

  it('los totales de la tabla de §31: $370.000, Renzo $170.000, Martina $200.000', () => {
    const mes = calculateSpaceMonth(casa, RENZO, '2026-10', FIN_DE_MES);
    expect(mes.total).toBe(370_000);
    expect(mes.viewer).toEqual({ put: 180_000, share: 170_000 });
    expect(mes.other).toMatchObject({ put: 190_000, share: 200_000 });
  });

  it('CA-23 · Renzo ve "Martina te debe $10.000" y Martina "Le debés $10.000 a Renzo"', () => {
    expect(calculateSharedBalance(casa, RENZO, FIN_DE_MES).amount).toBe(10_000);
    expect(calculateSharedBalance(casa, MARTINA, FIN_DE_MES).amount).toBe(-10_000);
  });

  it('registrado el pago de $10.000, quedan "Están a mano"', () => {
    const saldado = spaceFacts({
      ...casa,
      payments: [
        memberPayment({ fromSlot: MARTINA, toSlot: RENZO, amount: 10_000, date: '2026-10-31' }),
      ],
    });
    const saldo = calculateSharedBalance(saldado, RENZO, FIN_DE_MES);
    expect(saldo.amount).toBe(0);
    expect(saldo.settled).toBe(true);
  });

  it('el radar de octubre de Renzo suma su parte: $170.000 en Gastado', () => {
    const renzo = personalFacts({ spaces: [membership({ facts: casa, mySlot: RENZO })] });
    const radar = radarForMonth(renzo, '2026-10');
    expect(radar.spent).toBe(170_000);
    expect(radar.committed).toBe(0);
  });

  it('S-05 · la frase es "puso de más", nunca la diferencia como si fuera la deuda', () => {
    const mes = calculateSpaceMonth(casa, RENZO, '2026-10', FIN_DE_MES);
    expect(mes.viewerPutExtra).toBe(10_000);
    // La diferencia entre lo que pusieron ($180.000 vs $190.000) NO es la deuda.
    expect(Math.abs(mes.viewer.put - mes.other.put)).toBe(10_000);
  });
});

describe('§36 CA-25 · la deuda es la diferencia entre puso y le corresponde', () => {
  it('Renzo puso $700.000 y Martina $100.000 (50/50): Martina debe $300.000', () => {
    const casa = spaceFacts({
      expenses: [
        sharedExpense({ amount: 700_000, date: '2026-10-05', payerSlot: RENZO }),
        sharedExpense({ amount: 100_000, date: '2026-10-06', payerSlot: MARTINA }),
      ],
    });

    const saldo = calculateSharedBalance(casa, RENZO, HOY);
    expect(saldo.amount).toBe(300_000);
    // Nunca se muestra "$600.000 más".
    expect(saldo.amount).not.toBe(600_000);
  });
});

describe('§31 Caso 9 · Gasto fijo compartido', () => {
  // Alquiler $500.000, 50/50, lo paga Renzo por transferencia el día 1,
  // desde noviembre.
  const casa = spaceFacts({
    recurrences: [
      sharedRecurrence({
        id: 'alquiler',
        amount: 500_000,
        dayOfMonth: 1,
        startMonth: '2026-11',
        payerSlot: RENZO,
        category: 'alquiler',
        paymentMethodId: transferencia.id,
      }),
    ],
  });

  const renzo = personalFacts({
    spaces: [
      membership({
        facts: casa,
        mySlot: RENZO,
        paymentDetails: [paidWith('alquiler', RENZO, transferencia.id)],
      }),
    ],
  });

  it('el espacio muestra el compromiso compartido de $500.000 por mes', () => {
    const mes = calculateSpaceMonth(casa, RENZO, '2026-11', '2026-11-30');
    expect(mes.total).toBe(500_000);
    expect(mes.viewer).toEqual({ put: 500_000, share: 250_000 });
  });

  it('el radar de Renzo muestra $250.000 comprometidos (su parte)', () => {
    expect(radarForMonth(renzo, '2026-11').committed).toBe(250_000);
  });

  it('Próximos pagos de Renzo: "1 nov · Alquiler · $500.000 · incluye $250.000 de Martina"', () => {
    const expansion = expandPersonalOccurrences(renzo, { from: '2026-11', to: '2026-11' });
    const pagos = calculateUpcomingPayments(expansion, '2026-10-20');

    expect(pagos).toHaveLength(1);
    expect(pagos[0]).toMatchObject({
      kind: 'fixed',
      amount: 500_000,
      includesOtherShare: 250_000,
      otherMemberName: 'Martina',
      date: '2026-11-01',
    });
  });

  it('en los Próximos pagos de Martina no aparece (no lo paga ella)', () => {
    const martina = personalFacts({
      userId: 'user-2',
      paymentMethods: [mastercard],
      spaces: [membership({ facts: casa, mySlot: MARTINA })],
    });
    const expansion = expandPersonalOccurrences(martina, { from: '2026-11', to: '2026-11' });
    expect(calculateUpcomingPayments(expansion, '2026-10-20')).toHaveLength(0);
    // Pero sí ve su parte comprometida.
    expect(radarForMonth(martina, '2026-11').committed).toBe(250_000);
  });

  it('cada día 1, Martina pasa a deber $250.000 más', () => {
    expect(calculateSharedBalance(casa, RENZO, '2026-10-31').amount).toBe(0);
    expect(calculateSharedBalance(casa, RENZO, '2026-11-01').amount).toBe(250_000);
    expect(calculateSharedBalance(casa, RENZO, '2026-12-01').amount).toBe(500_000);
  });
});

describe('F-03 / F-04 · "Este mes fue distinto"', () => {
  it('F-03 · el ajuste de un mes cambia solo ese mes', () => {
    const facts = personalFacts({
      recurrences: [
        personalRecurrence({
          id: 'luz',
          kind: 'expense',
          amount: 40_000,
          dayOfMonth: 10,
          startMonth: '2026-10',
          category: 'servicios',
          paymentMethodId: debito.id,
        }),
      ],
      overrides: [override('luz', '2026-11', 75_000)],
    });

    expect(radarForMonth(facts, '2026-10').committed).toBe(40_000);
    expect(radarForMonth(facts, '2026-11').committed).toBe(75_000);
    expect(radarForMonth(facts, '2026-12').committed).toBe(40_000);
  });

  it('F-04 · con reparto personalizado, el ajuste reparte en la misma proporción', () => {
    const casa = spaceFacts({
      recurrences: [
        sharedRecurrence({
          id: 'luz',
          amount: 100_000,
          dayOfMonth: 10,
          startMonth: '2026-10',
          payerSlot: RENZO,
          category: 'servicios',
          split: { mode: 'custom', shareSlot1: 70_000, shareSlot2: 30_000 },
        }),
      ],
      overrides: [override('luz', '2026-11', 200_000)],
    });

    const noviembre = expandSpaceOccurrences(casa, { from: '2026-11', to: '2026-11' });
    expect(noviembre).toHaveLength(1);
    // La proporción 70/30 se aplica al nuevo monto.
    expect(noviembre[0]!.shares).toEqual({ slot1: 140_000, slot2: 60_000 });
    expect(noviembre[0]!.shares.slot1 + noviembre[0]!.shares.slot2).toBe(200_000);
  });
});

describe('§31 Casos 12 y 14 · salida de un espacio', () => {
  // Martina sale el 15/11. Heladera con cuotas vigentes + alquiler compartido.
  const heladera = sharedExpense({
    id: 'heladera',
    amount: 600_000,
    date: '2026-10-10',
    payerSlot: RENZO,
    category: 'hogar',
    description: 'Heladera',
    installments: { count: 6, card: visa },
  });
  const alquiler = sharedRecurrence({
    id: 'alquiler',
    amount: 500_000,
    dayOfMonth: 1,
    startMonth: '2026-11',
    payerSlot: RENZO,
    category: 'alquiler',
  });
  const casa = spaceFacts({ expenses: [heladera], recurrences: [alquiler] });

  const martinaQueSalio = personalFacts({
    userId: 'user-2',
    paymentMethods: [mastercard],
    spaces: [membership({ facts: casa, mySlot: MARTINA, leftOn: '2026-11-15' })],
  });

  it('SA-03 / CA-41 · las cuotas compartidas ya generadas siguen en su Futuro', () => {
    // §31 Caso 14: "$50.000/mes en Futuro como Casa · ya no sos miembro".
    for (const mes of ['2026-12', '2027-01', '2027-02', '2027-03', '2027-04']) {
      expect(radarForMonth(martinaQueSalio, mes).committed).toBe(50_000);
    }
  });

  it('SA-04 / CA-41 · los fijos compartidos se detienen desde la salida', () => {
    // El alquiler del 1/11 ya había ocurrido antes de la salida del 15/11.
    const noviembre = radarForMonth(martinaQueSalio, '2026-11');
    expect(noviembre.committed).toBe(300_000); // $250.000 alquiler + $50.000 cuota

    // Diciembre: el alquiler ya no figura, solo la cuota.
    expect(radarForMonth(martinaQueSalio, '2026-12').committed).toBe(50_000);
  });

  it('SA-05 · sus meses pasados no cambian', () => {
    const futuro = futureFrom(martinaQueSalio, '2026-11', 6);
    expect(futuro.months[0]?.committed).toBe(300_000);
  });

  it('las ocurrencias que le quedan están marcadas como de un espacio que dejó', () => {
    const expansion = expandPersonalOccurrences(martinaQueSalio, { from: '2026-12', to: '2026-12' });
    expect(expansion.occurrences.every((occurrence) => occurrence.fromFormerMembership)).toBe(true);
  });

  it('§25 · aviso de adelanto: cuotas compartidas que todavía no vencieron', () => {
    const pendiente = pendingSharedInstallments(casa, MARTINA, '2026-12-05');
    // Quedan 4 cuotas (enero a abril) de $50.000 de su parte.
    expect(pendiente).toBe(200_000);
  });
});

describe('§17 · vista previa de una compra en cuotas', () => {
  it('CA-39 · muestra cómo cambian comprometido y sin asignar, nunca si alcanza', () => {
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
          amount: 205_000,
          dayOfMonth: 1,
          startMonth: '2026-10',
          category: 'alquiler',
        }),
      ],
    });

    const antes = futureFrom(facts, '2026-11', 6);
    const preview = previewInstallments({
      before: antes,
      myShare: 50_000,
      firstMonth: '2026-11',
      count: 6,
    });

    // §31 Caso 8: "Noviembre: comprometido $205.000 → $255.000 ·
    // sin asignar $995.000 → $945.000".
    expect(preview.months[0]).toEqual({
      month: '2026-11',
      committedBefore: 205_000,
      committedAfter: 255_000,
      unassignedBefore: 995_000,
      unassignedAfter: 945_000,
    });
    expect(preview.perMonth).toBe(50_000);
  });
});

describe('G-06 · "Ya pasó", nunca "Pagado"', () => {
  it('CA-37 / CA-45 · un pago cuya fecha llegó se marca como que ya pasó', () => {
    const facts = personalFacts({
      recurrences: [
        personalRecurrence({
          kind: 'expense',
          amount: 300_000,
          dayOfMonth: 5,
          startMonth: '2026-10',
          category: 'alquiler',
          paymentMethodId: transferencia.id,
        }),
      ],
    });

    const expansion = expandPersonalOccurrences(facts, { from: '2026-10', to: '2026-10' });
    const pagos = calculateUpcomingPayments(expansion, '2026-10-07');

    expect(pagos[0]?.hasPassed).toBe(true);
    // Y sigue estando en Comprometido del mes (N-02: "ya pasada o por venir").
    expect(radarForMonth(facts, '2026-10').committed).toBe(300_000);
  });
});

describe('T-07 · resumen pendiente declarado', () => {
  it('entra completo en Comprometido y aparece en Próximos pagos', () => {
    const facts = personalFacts({
      declaredStatements: [
        declaredStatement({ paymentMethodId: visa.id, amount: 180_000, dueDate: '2026-10-05' }),
      ],
    });

    expect(radarForMonth(facts, '2026-10').committed).toBe(180_000);

    const expansion = expandPersonalOccurrences(facts, { from: '2026-10', to: '2026-10' });
    const pagos = calculateUpcomingPayments(expansion, '2026-10-01');
    expect(pagos).toHaveLength(1);
    expect(pagos[0]).toMatchObject({
      kind: 'declared-statement',
      amount: 180_000,
      date: '2026-10-05',
      isEstimate: true,
    });
  });
});

describe('§15 · P18 · Próximos pagos en Inicio', () => {
  it('muestra los 3 primeros pagos de los próximos 30 días', () => {
    const facts = personalFacts({
      recurrences: [
        personalRecurrence({
          kind: 'expense',
          amount: 300_000,
          dayOfMonth: 5,
          startMonth: '2026-10',
          category: 'alquiler',
          paymentMethodId: transferencia.id,
        }),
        personalRecurrence({
          kind: 'expense',
          amount: 25_000,
          dayOfMonth: 12,
          startMonth: '2026-10',
          category: 'internet',
          paymentMethodId: transferencia.id,
        }),
        personalRecurrence({
          kind: 'expense',
          amount: 30_000,
          dayOfMonth: 20,
          startMonth: '2026-10',
          category: 'gimnasio',
          paymentMethodId: transferencia.id,
        }),
        personalRecurrence({
          kind: 'expense',
          amount: 15_000,
          dayOfMonth: 28,
          startMonth: '2026-10',
          category: 'suscripciones',
          paymentMethodId: transferencia.id,
        }),
      ],
    });

    const expansion = expandPersonalOccurrences(facts, { from: '2026-10', to: '2026-12' });
    const pagos = calculateUpcomingPayments(expansion, '2026-10-07');
    const enInicio = upcomingForHome(pagos, '2026-10-07');

    expect(enInicio).toHaveLength(3);
    expect(enInicio.map((pago) => pago.date)).toEqual(['2026-10-12', '2026-10-20', '2026-10-28']);
  });
});

describe('§23.4 · Próximos meses del espacio', () => {
  it('los dos miembros ven los compromisos compartidos de los próximos meses', () => {
    const casa = spaceFacts({
      expenses: [
        sharedExpense({
          id: 'heladera',
          amount: 600_000,
          date: '2026-10-10',
          payerSlot: RENZO,
          installments: { count: 6, card: visa },
        }),
      ],
      recurrences: [
        sharedRecurrence({
          amount: 500_000,
          dayOfMonth: 1,
          startMonth: '2026-11',
          payerSlot: RENZO,
        }),
      ],
    });

    const horizon = spaceHorizon(casa, HOY);
    const ocurrencias = expandSpaceOccurrences(casa, horizon);
    const noviembre = ocurrencias.filter((occurrence) => occurrence.month === '2026-11');

    expect(noviembre).toHaveLength(2);
    expect(noviembre.reduce((total, occurrence) => total + occurrence.amount, 0)).toBe(600_000);
    // Los dos ven el mismo total y el mismo reparto: es el espacio.
    for (const occurrence of noviembre) {
      expect(occurrence.shares.slot1 + occurrence.shares.slot2).toBe(occurrence.amount);
    }
  });
});

describe('Q-05 · una cuota pasa a "ya pasó" cuando llega su fecha', () => {
  it('la app no verifica el pago: solo sabe que la fecha llegó', () => {
    const plan = { count: 6, firstMonth: '2026-11', impactDay: 5, approximate: false };
    const cuotas = scheduleInstallments(600_000, plan);
    const hoy = '2026-12-10';

    const pasadas = cuotas.filter((cuota) => cuota.date != null && cuota.date <= hoy);
    expect(pasadas).toHaveLength(2); // noviembre y diciembre
    expect(cuotas).toHaveLength(6); // las 6 siguen existiendo
  });
});
