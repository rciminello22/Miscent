import { describe, it, expect } from 'vitest';
import {
  RENZO,
  casa,
  membership,
  memberPayment,
  personalFacts,
  sharedExpense,
  sharedRecurrence,
  spaceFacts,
  visa,
} from '@domain/__tests__/fixtures';
import type { Member } from '@domain/types';
import {
  formerSpacesCaption,
  listFormerSpaces,
  movementsLine,
  removalCopy,
  upcomingPayments,
} from './formerSpaces';

/**
 * Quitar un espacio de tu historial (19/10). TS puro.
 *
 * El caso de los dibujos: "Con gonzalo", del que Renzo salió el 12 de octubre.
 * Estuvo en agosto, septiembre y octubre, y su parte suma $84.000
 * ($24.000, $30.000 y $30.000).
 */

const TODAY = '2026-10-19';
const LEFT = '2026-10-12';

const GONZALO = 2 as const;
const people: [Member, Member] = [
  { slot: RENZO, userId: null, displayName: 'Renzo', status: 'active', isCreator: true },
  { slot: GONZALO, userId: null, displayName: 'Gonzalo', status: 'active', isCreator: false },
];

function conGonzalo(options: {
  expenses?: ReturnType<typeof sharedExpense>[];
  recurrences?: ReturnType<typeof sharedRecurrence>[];
  payments?: ReturnType<typeof memberPayment>[];
  initialBalance?: number;
  leftOn?: string | null;
}) {
  return membership({
    facts: spaceFacts({
      space: casa({ id: 'gonzalo', name: 'Con gonzalo', members: people, initialBalance: options.initialBalance ?? 0 }),
      expenses: options.expenses ?? [],
      recurrences: options.recurrences ?? [],
      payments: options.payments ?? [],
    }),
    mySlot: RENZO,
    leftOn: options.leftOn === undefined ? LEFT : options.leftOn,
  });
}

// Agosto $24.000, septiembre $30.000 y octubre $30.000: $84.000 de su parte.
// El saldo al salir: Gonzalo le debía $12.000 (con el saldo inicial de −$12.000).
const agosto = sharedExpense({ id: 'a', amount: 48_000, date: '2026-08-10', payerSlot: RENZO });
const septiembre = sharedExpense({ id: 's', amount: 60_000, date: '2026-09-10', payerSlot: RENZO });
const octubre = sharedExpense({ id: 'o', amount: 60_000, date: '2026-10-08', payerSlot: GONZALO });
const completo = () =>
  conGonzalo({ expenses: [agosto, septiembre, octubre], initialBalance: -12_000 });

describe('listFormerSpaces · los espacios que dejaste', () => {
  it('sin espacios dejados no hay lista', () => {
    const active = conGonzalo({ expenses: [agosto], leftOn: null });
    expect(listFormerSpaces(personalFacts({ spaces: [active] }), TODAY)).toEqual([]);
    expect(listFormerSpaces(personalFacts({ spaces: [] }), TODAY)).toEqual([]);
  });

  it('una fila con el nombre, la fecha de salida y "Saliste el 12 de octubre"', () => {
    const [row] = listFormerSpaces(personalFacts({ spaces: [completo()] }), TODAY);

    expect(row).toEqual({
      spaceId: 'gonzalo',
      name: 'Con gonzalo',
      leftOn: '2026-10-12',
      leftLine: 'Saliste el 12 de octubre',
      otherName: 'Gonzalo',
      // P6 · la frase fija del saldo a la fecha de salida.
      balanceLine: 'Al salir, Gonzalo te debía $12.000.',
    });
  });

  it('solo los espacios de los que saliste, el más reciente primero', () => {
    const active = conGonzalo({ expenses: [agosto], leftOn: null });
    const older = membership({
      facts: spaceFacts({ space: casa({ id: 'viaje', name: 'Viaje' }) }),
      mySlot: RENZO,
      leftOn: '2026-07-03',
    });

    const rows = listFormerSpaces(personalFacts({ spaces: [older, active, completo()] }), TODAY);

    expect(rows.map((row) => row.name)).toEqual(['Con gonzalo', 'Viaje']);
  });
});

describe('formerSpacesCaption · lo que dice la puerta de Compartidos', () => {
  it('un espacio, en singular', () => {
    expect(formerSpacesCaption(1)).toBe('1 espacio');
  });

  it('varios, en plural', () => {
    expect(formerSpacesCaption(2)).toBe('2 espacios');
    expect(formerSpacesCaption(11)).toBe('11 espacios');
  });
});

describe('pagos por venir → se puede quitar, con aviso', () => {
  it('una cuota con fecha de pago posterior a hoy cuenta, con el mes de la última y tu parte', () => {
    const cuotas = sharedExpense({
      id: 'c',
      amount: 60_000,
      date: '2026-10-08',
      payerSlot: GONZALO,
      installments: { count: 2, card: null },
    });
    const source = conGonzalo({ expenses: [agosto, cuotas] });

    // Dos cuotas de $30.000 (noviembre y diciembre): tu mitad de cada una.
    expect(upcomingPayments(source, [], TODAY)).toEqual({ until: '2026-12', total: 30_000 });
  });

  it('con pagos por venir el espacio igual está en la lista: ya no hay nada bloqueado', () => {
    const cuotas = sharedExpense({
      id: 'c',
      amount: 60_000,
      date: '2026-10-08',
      payerSlot: GONZALO,
      installments: { count: 2, card: null },
    });
    const [row] = listFormerSpaces(personalFacts({ spaces: [conGonzalo({ expenses: [cuotas] })] }), TODAY);

    expect(row).not.toHaveProperty('canRemove');
    expect(row).not.toHaveProperty('blockedLine');
  });

  it('si el último pago cae en otro año, el mes lleva el año', () => {
    const cuotas = sharedExpense({
      id: 'c',
      amount: 150_000,
      date: '2026-10-08',
      payerSlot: GONZALO,
      installments: { count: 5, card: null },
    });

    expect(upcomingPayments(conGonzalo({ expenses: [cuotas] }), [], TODAY)).toEqual({
      until: '2027-03',
      total: 75_000,
    });
  });

  it('con una cuota con tarjeta, cuenta la fecha de pago y no la de compra', () => {
    const cuotas = sharedExpense({
      id: 'c',
      amount: 90_000,
      date: '2026-08-20',
      payerSlot: RENZO,
      installments: { count: 3, card: visa },
    });
    const source = membership({
      facts: conGonzalo({ expenses: [cuotas] }).facts,
      mySlot: RENZO,
      paymentDetails: [{ sourceId: 'c', slot: RENZO, paymentMethodId: 'visa' }],
      leftOn: LEFT,
    });

    // Compró el 20/8 (antes del cierre del 25): vencen el 5/9, 5/10 y 5/11.
    expect(upcomingPayments(source, [visa], TODAY)?.until).toBe('2026-11');
  });

  it('las cuotas que ya vencieron no cuentan', () => {
    const cuotas = sharedExpense({
      id: 'c',
      amount: 90_000,
      date: '2026-06-10',
      payerSlot: GONZALO,
      installments: { count: 3, card: null },
    });

    expect(upcomingPayments(conGonzalo({ expenses: [cuotas] }), [], TODAY)).toBeNull();
  });

  it('un pago que vence hoy no es "por venir": es posterior a hoy o no es', () => {
    const cuotas = sharedExpense({
      id: 'c',
      amount: 60_000,
      date: '2026-08-19',
      payerSlot: GONZALO,
      installments: { count: 2, card: null },
    });

    expect(upcomingPayments(conGonzalo({ expenses: [cuotas] }), [], TODAY)).toBeNull();
  });

  it('un fijo que se cortó con tu salida no cuenta', () => {
    const alquiler = sharedRecurrence({
      amount: 100_000,
      dayOfMonth: 28,
      startMonth: '2026-08',
      payerSlot: GONZALO,
    });

    expect(upcomingPayments(conGonzalo({ recurrences: [alquiler] }), [], TODAY)).toBeNull();
  });

  it('los gastos de una sola vez ya pagados no cuentan', () => {
    expect(upcomingPayments(completo(), [], TODAY)).toBeNull();
  });

  it('una compra en 1 pago que todavía no vence también cuenta', () => {
    const unPago = sharedExpense({
      id: 'u',
      amount: 80_000,
      date: '2026-10-10',
      payerSlot: RENZO,
    });
    const source = membership({
      facts: conGonzalo({ expenses: [unPago] }).facts,
      mySlot: RENZO,
      paymentDetails: [{ sourceId: 'u', slot: RENZO, paymentMethodId: 'visa' }],
      leftOn: LEFT,
    });

    // Cierre el 25: la compra del 10/10 vence el 5/11, después de hoy.
    expect(upcomingPayments(source, [visa], TODAY)).toEqual({ until: '2026-11', total: 40_000 });
  });
});

describe('movementsLine · lo que desaparece de Movimientos', () => {
  it('9 gastos: plural', () => {
    expect(movementsLine(9, 0)).toBe('Sus 9 gastos desaparecen de Movimientos.');
  });

  it('un gasto: singular', () => {
    expect(movementsLine(1, 0)).toBe('Su gasto desaparece de Movimientos.');
  });

  it('los pagos entre ustedes también salen de Movimientos, y se dice', () => {
    expect(movementsLine(9, 2)).toBe(
      'Sus 9 gastos y los pagos entre ustedes desaparecen de Movimientos.',
    );
    expect(movementsLine(1, 1)).toBe(
      'Su gasto y el pago entre ustedes desaparecen de Movimientos.',
    );
    expect(movementsLine(0, 1)).toBe('El pago entre ustedes desaparece de Movimientos.');
    expect(movementsLine(0, 3)).toBe('Los pagos entre ustedes desaparecen de Movimientos.');
  });

  it('sin gastos ni pagos no hay nada que desaparezca', () => {
    expect(movementsLine(0, 0)).toBe('No tiene gastos en Movimientos.');
  });
});

describe('removalCopy · la hoja de confirmación', () => {
  it('el título, la introducción, la tarjeta y "No se puede deshacer."', () => {
    const { sheet } = removalCopy(completo(), [], TODAY);

    expect(sheet.title).toBe('¿Quitar Con gonzalo de tu historial?');
    expect(sheet.intro).toBe('Esto es lo que cambia en tu cuenta:');
    expect(sheet.reassurance).toBe('Para Gonzalo no cambia nada, ni para nadie más.');
    expect(sheet.warning).toBe('No se puede deshacer.');
  });

  it('tres filas: el radar con los meses y la suma de tu parte, los gastos y el saldo al salir', () => {
    const { sheet } = removalCopy(completo(), [], TODAY);

    expect(sheet.rows).toEqual([
      {
        kind: 'radar',
        text: 'Tu radar de agosto, septiembre y octubre deja de contar tu parte de Con gonzalo ($84.000 en total).',
      },
      { kind: 'movements', text: 'Sus 3 gastos desaparecen de Movimientos.' },
      {
        kind: 'summary',
        text: 'El resumen "Al salir, Gonzalo te debía $12.000" deja de verse.',
      },
    ]);
  });

  it('un solo mes: "Tu radar de octubre deja de contar…"', () => {
    const source = conGonzalo({ expenses: [octubre] });
    const radar = removalCopy(source, [], TODAY).sheet.rows[0]!;

    expect(radar.text).toBe(
      'Tu radar de octubre deja de contar tu parte de Con gonzalo ($30.000 en total).',
    );
  });

  it('dos meses se unen con "y"', () => {
    const source = conGonzalo({ expenses: [septiembre, octubre] });

    expect(removalCopy(source, [], TODAY).sheet.rows[0]!.text).toBe(
      'Tu radar de septiembre y octubre deja de contar tu parte de Con gonzalo ($60.000 en total).',
    );
  });

  it('los meses van hasta la salida, aunque el último gasto sea anterior', () => {
    const source = conGonzalo({ expenses: [agosto] });

    expect(removalCopy(source, [], TODAY).sheet.rows[0]!.text).toBe(
      'Tu radar de agosto, septiembre y octubre deja de contar tu parte de Con gonzalo ($24.000 en total).',
    );
  });

  it('si una cuota ya pagada cae después de la salida, el rango llega hasta ella', () => {
    const cuotas = sharedExpense({
      id: 'c',
      amount: 90_000,
      date: '2026-08-20',
      payerSlot: GONZALO,
      installments: { count: 3, card: null },
    });
    // Septiembre, octubre y noviembre (la salida fue el 12 de octubre); hoy ya pasaron las tres.
    const { sheet } = removalCopy(conGonzalo({ expenses: [cuotas] }), [], '2026-12-01');

    expect(sheet.rows[0]!.text).toBe(
      'Tu radar de septiembre, octubre y noviembre deja de contar tu parte de Con gonzalo ($45.000 en total).',
    );
  });

  it('con muchos meses se dice el rango: "de enero a octubre"', () => {
    const enero = sharedExpense({ id: 'e', amount: 20_000, date: '2026-01-15', payerSlot: RENZO });
    const source = conGonzalo({ expenses: [enero, octubre] });

    expect(removalCopy(source, [], TODAY).sheet.rows[0]!.text).toBe(
      'Tu radar de enero a octubre deja de contar tu parte de Con gonzalo ($40.000 en total).',
    );
  });

  it('la tercera fila usa la frase real del saldo al salir (P6)', () => {
    const debia = conGonzalo({ expenses: [octubre] });
    expect(removalCopy(debia, [], TODAY).sheet.rows[2]!.text).toBe(
      'El resumen "Al salir, le debías $30.000 a Gonzalo" deja de verse.',
    );

    const aMano = conGonzalo({ expenses: [] });
    expect(removalCopy(aMano, [], TODAY).sheet.rows[2]!.text).toBe(
      'El resumen "Al salir, estaban a mano" deja de verse.',
    );
  });

  it('si el espacio no suma a ningún mes, el radar no cambia y se dice', () => {
    const pago = memberPayment({ fromSlot: GONZALO, toSlot: RENZO, amount: 5_000, date: '2026-10-09' });
    const { sheet, toast } = removalCopy(conGonzalo({ payments: [pago] }), [], TODAY);

    expect(sheet.rows[0]).toEqual({
      kind: 'radar',
      text: 'Tu radar no cambia: tu parte de Con gonzalo no suma a ningún mes.',
    });
    expect(sheet.rows[1]!.text).toBe('El pago entre ustedes desaparece de Movimientos.');
    expect(toast.detail).toBeNull();
  });

  it('la lente es TU parte (K9), no el total del gasto', () => {
    const tuyo = sharedExpense({
      id: 'p',
      amount: 100_000,
      date: '2026-10-05',
      payerSlot: RENZO,
      split: { mode: 'custom', shareSlot1: 70_000, shareSlot2: 30_000 },
    });

    expect(removalCopy(conGonzalo({ expenses: [tuyo] }), [], TODAY).sheet.rows[0]!.text).toContain(
      '($70.000 en total)',
    );
  });
});

describe('removalCopy · con pagos por venir', () => {
  // Noviembre y diciembre: $25.000 de tu parte cada una.
  const cuotas = sharedExpense({
    id: 'c',
    amount: 100_000,
    date: '2026-10-08',
    payerSlot: GONZALO,
    installments: { count: 2, card: null },
  });

  it('sin pagos por venir no hay fila de Futuro', () => {
    const kinds = removalCopy(completo(), [], TODAY).sheet.rows.map((row) => row.kind);

    expect(kinds).toEqual(['radar', 'movements', 'summary']);
  });

  it('con pagos por venir suma una fila de Futuro con el mes y el total, y el radar sigue', () => {
    const { sheet } = removalCopy(conGonzalo({ expenses: [cuotas] }), [], TODAY);

    expect(sheet.rows.map((row) => row.kind)).toEqual(['radar', 'future', 'movements', 'summary']);
    expect(sheet.rows[0]!.text).toBe(
      'Tu radar de noviembre y diciembre deja de contar tu parte de Con gonzalo ($50.000 en total).',
    );
    expect(sheet.rows[1]).toEqual({
      kind: 'future',
      text: 'Tu parte de lo que queda por pagar de Con gonzalo (hasta diciembre) deja de verse en tu Futuro ($50.000 en total).',
    });
    expect(sheet.warning).toBe('No se puede deshacer.');
  });

  it('si tu parte de lo que queda es cero, no se dice un total', () => {
    const ajeno = sharedExpense({
      id: 'x',
      amount: 90_000,
      date: '2026-10-08',
      payerSlot: GONZALO,
      split: { mode: 'custom', shareSlot1: 0, shareSlot2: 90_000 },
      installments: { count: 2, card: null },
    });

    expect(removalCopy(conGonzalo({ expenses: [ajeno] }), [], TODAY).sheet.rows[1]!.text).toBe(
      'Tu parte de lo que queda por pagar de Con gonzalo (hasta diciembre) deja de verse en tu Futuro.',
    );
  });

  it('el aviso de después también nombra el Futuro', () => {
    const { toast } = removalCopy(conGonzalo({ expenses: [cuotas] }), [], TODAY);

    expect(toast.detail).toBe(
      'Tu radar de noviembre a diciembre ya no lo cuenta. Tu Futuro ya no cuenta lo que quedaba hasta diciembre.',
    );
  });
});

describe('removalCopy · el aviso de después', () => {
  it('"Quitaste Con gonzalo de tu historial" y el rango de meses', () => {
    const { toast } = removalCopy(completo(), [], TODAY);

    expect(toast).toEqual({
      title: 'Quitaste Con gonzalo de tu historial',
      detail: 'Tu radar de agosto a octubre ya no lo cuenta.',
    });
  });

  it('con un solo mes no hay rango', () => {
    const { toast } = removalCopy(conGonzalo({ expenses: [octubre] }), [], TODAY);

    expect(toast.detail).toBe('Tu radar de octubre ya no lo cuenta.');
  });
});

describe('el nombre del otro sale de la foto, no del lugar', () => {
  it('Martina ocupa el slot 2 de una foto con otro nombre', () => {
    const source = membership({
      facts: spaceFacts({
        space: casa({ id: 'viaje', name: 'Viaje' }),
        expenses: [sharedExpense({ id: 'v', amount: 40_000, date: '2026-09-02', payerSlot: RENZO })],
      }),
      mySlot: RENZO,
      leftOn: '2026-09-20',
    });

    const { sheet } = removalCopy(source, [], TODAY);
    expect(sheet.reassurance).toBe('Para Martina no cambia nada, ni para nadie más.');
  });
});
