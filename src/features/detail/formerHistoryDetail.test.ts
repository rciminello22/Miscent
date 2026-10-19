import { describe, it, expect } from 'vitest';
import {
  MARTINA,
  RENZO,
  debito,
  membership,
  memberPayment,
  paidWith,
  sharedExpense,
  spaceFacts,
  casa,
  visa,
} from '@domain/__tests__/fixtures';
import { buildFormerHistoryDetail } from './formerHistoryDetail';

/**
 * SA-02 · SA-05 · el detalle de solo lectura de lo que quedó en la foto de un
 * espacio del que saliste (P6). TS puro.
 */

const TODAY = '2026-10-18';
const label = (raw: string) => raw.charAt(0).toUpperCase() + raw.slice(1);

const gonzalo = casa({ id: 'gonzalo', name: 'Con gonzalo' });

function former(options: {
  expenses?: ReturnType<typeof sharedExpense>[];
  payments?: ReturnType<typeof memberPayment>[];
  mySlot?: 1 | 2;
  paymentDetails?: ReturnType<typeof paidWith>[];
  leftOn?: string | null;
}) {
  return membership({
    facts: spaceFacts({
      space: gonzalo,
      expenses: options.expenses ?? [],
      payments: options.payments ?? [],
    }),
    mySlot: options.mySlot ?? RENZO,
    paymentDetails: options.paymentDetails,
    leftOn: options.leftOn === undefined ? '2026-10-12' : options.leftOn,
  });
}

function build(
  source: ReturnType<typeof former>,
  sourceId: string,
  paymentMethods = [visa, debito],
) {
  return buildFormerHistoryDetail({
    membership: source,
    sourceId,
    paymentMethods,
    today: TODAY,
    labelOf: label,
  });
}

describe('buildFormerHistoryDetail · un gasto de un espacio del que saliste', () => {
  const supermercado = sharedExpense({
    id: 'g1',
    amount: 60_000,
    date: '2026-10-08',
    payerSlot: MARTINA,
    description: 'supermercado',
  });
  const source = former({ expenses: [supermercado] });

  it('K9 · la cifra es TU PARTE con "−" y el total va aparte', () => {
    const detail = build(source, 'g1')!;

    expect(detail.title).toBe('Supermercado');
    expect(detail.kind).toBe('expense');
    expect(detail.amount).toBe(30_000);
    expect(detail.sign).toBe('out');
    expect(detail.ofTotal).toBe(60_000);
  });

  it('la tarjeta: fecha, espacio, tu parte y el total del gasto', () => {
    expect(build(source, 'g1')!.facts).toEqual([
      { label: 'Fecha', value: '8 de octubre' },
      { label: 'Espacio', value: 'Con gonzalo' },
      { label: 'Tu parte', value: '−$30.000' },
      { label: 'Total del gasto', value: '$60.000' },
    ]);
  });

  it('dice qué es y por qué no se edita: quedó en el historial', () => {
    const detail = build(source, 'g1')!;

    expect(detail.note).toBe('Saliste de Con gonzalo: este gasto quedó en tu historial.');
    expect(detail.context).toBe('Con gonzalo · ya no sos miembro');
  });

  it('sin descripción, el título es la categoría', () => {
    const noDescription = former({
      expenses: [
        sharedExpense({ id: 'g2', amount: 10_000, date: '2026-10-08', payerSlot: RENZO, category: 'supermercado' }),
      ],
    });

    expect(build(noDescription, 'g2')!.title).toBe('Supermercado');
  });

  it('sin descripción ni categoría en la foto: "Gasto del 8 de octubre"', () => {
    const bare = former({
      expenses: [
        { ...sharedExpense({ id: 'g3', amount: 10_000, date: '2026-10-08', payerSlot: RENZO }), category: '' as never },
      ],
    });

    expect(build(bare, 'g3')!.title).toBe('Gasto del 8 de octubre');
  });

  it('una fecha de otro año lleva el año', () => {
    const old = former({
      expenses: [sharedExpense({ id: 'g4', amount: 10_000, date: '2025-12-30', payerSlot: RENZO })],
    });

    expect(build(old, 'g4')!.facts[0]).toEqual({ label: 'Fecha', value: '30 de diciembre de 2025' });
  });

  it('con una parte igual al total no repite el total', () => {
    const mine = former({
      expenses: [
        {
          ...sharedExpense({ id: 'g5', amount: 10_000, date: '2026-10-08', payerSlot: RENZO }),
          split: { mode: 'custom', shareSlot1: 10_000, shareSlot2: 0 },
        },
      ],
    });
    const detail = build(mine, 'g5')!;

    expect(detail.ofTotal).toBeNull();
    expect(detail.facts.map((fact) => fact.label)).not.toContain('Total del gasto');
  });

  it('una compra en cuotas muestra tu parte de cada una', () => {
    const cuotas = former({
      expenses: [
        sharedExpense({
          id: 'g6',
          amount: 60_000,
          date: '2026-10-08',
          payerSlot: MARTINA,
          installments: { count: 6, card: visa },
        }),
      ],
    });

    expect(build(cuotas, 'g6')!.facts).toContainEqual({ label: 'Cuotas', value: '6 cuotas de $5.000' });
  });

  it('C-05 · el medio de pago solo si lo pagaste vos, y solo el tuyo', () => {
    const mine = former({
      expenses: [sharedExpense({ id: 'g7', amount: 20_000, date: '2026-10-08', payerSlot: RENZO })],
      paymentDetails: [paidWith('g7', RENZO, 'debito'), paidWith('g8', MARTINA, 'visa')],
    });
    expect(build(mine, 'g7')!.facts).toContainEqual({ label: 'Medio', value: 'Débito' });

    // Pagó el otro: aunque hubiera un detalle suyo, no se ve.
    const theirs = former({
      expenses: [sharedExpense({ id: 'g8', amount: 20_000, date: '2026-10-08', payerSlot: MARTINA })],
      paymentDetails: [paidWith('g8', MARTINA, 'visa')],
    });
    expect(build(theirs, 'g8')!.facts.map((fact) => fact.label)).not.toContain('Medio');
    expect(JSON.stringify(build(theirs, 'g8'))).not.toContain('Visa');
  });

  it('CA-00 · ni "disponible", "te queda", "saldo" ni "Pagado"', () => {
    const text = JSON.stringify(build(source, 'g1'));

    expect(text).not.toMatch(/disponible|te queda|saldo|libre|pagad[oa]/i);
  });
});

describe('buildFormerHistoryDetail · un pago entre miembros', () => {
  const received = memberPayment({ fromSlot: MARTINA, toSlot: RENZO, amount: 20_000, date: '2026-10-10' });
  const sent = memberPayment({ fromSlot: RENZO, toSlot: MARTINA, amount: 15_000, date: '2026-10-11' });
  const source = former({ payments: [received, sent] });

  it('"Martina te pagó": entra, con "+"', () => {
    const detail = build(source, received.id)!;

    expect(detail.title).toBe('Martina te pagó');
    expect(detail).toMatchObject({ kind: 'payment', amount: 20_000, sign: 'in', ofTotal: null });
    expect(detail.note).toBe('Saliste de Con gonzalo: este pago quedó en tu historial.');
  });

  it('"Le pagaste a Martina": sale, con "−"', () => {
    expect(build(source, sent.id)).toMatchObject({
      title: 'Le pagaste a Martina',
      amount: 15_000,
      sign: 'out',
    });
  });

  it('la tarjeta: fecha y espacio', () => {
    expect(build(source, received.id)!.facts).toEqual([
      { label: 'Fecha', value: '10 de octubre' },
      { label: 'Espacio', value: 'Con gonzalo' },
    ]);
  });
});

describe('buildFormerHistoryDetail · lo que no se abre', () => {
  it('un registro que no está en la foto no tiene detalle', () => {
    const source = former({
      expenses: [sharedExpense({ id: 'g1', amount: 10_000, date: '2026-10-08', payerSlot: RENZO })],
    });

    expect(build(source, 'otro')).toBeNull();
  });

  it('de un espacio del que SEGUÍS siendo miembro no hay detalle de historial', () => {
    const active = former({
      expenses: [sharedExpense({ id: 'g1', amount: 10_000, date: '2026-10-08', payerSlot: RENZO })],
      leftOn: null,
    });

    expect(build(active, 'g1')).toBeNull();
  });
});
