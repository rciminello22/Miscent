import { describe, it, expect } from 'vitest';
import type { PersonalOccurrence } from '@domain/occurrences';
import type { PaymentMethod } from '@domain/types';
import type { UpcomingPayment } from '@domain/upcoming';
import { canOpenPayment, paymentDetail } from './statementDetail';

/**
 * UX-08 · §23.2 · §4.10 · el detalle del resumen estimado de una tarjeta.
 *
 * "Al tocar, el detalle (compras, cuotas, fijos, partes de otros)". Es la lente
 * "lo que vas a pagar" (§7.3): cada ocurrencia por su TOTAL pagado, y la suma
 * tiene que ser exactamente la cifra de la fila.
 */

const VISA: PaymentMethod = {
  id: 'visa-uuid',
  kind: 'card',
  name: 'Visa Galicia',
  closingDay: 25,
  dueDay: 5,
  closingApprox: false,
  dueApprox: false,
};

function occ(
  overrides: Partial<PersonalOccurrence> & Pick<PersonalOccurrence, 'id' | 'total'>,
): PersonalOccurrence {
  return {
    label: overrides.id,
    category: 'otros',
    myShare: overrides.total,
    otherShare: 0,
    bucket: 'committed',
    month: '2026-11',
    paymentDate: '2026-11-05',
    payerIsMe: true,
    cardId: VISA.id,
    approximate: false,
    dateApprox: false,
    purchaseMonth: '2026-10',
    spaceId: null,
    spaceName: null,
    otherMemberName: null,
    installment: null,
    isRecurrence: false,
    fromFormerMembership: false,
    ...overrides,
  };
}

function statement(
  items: PersonalOccurrence[],
  overrides: Partial<UpcomingPayment> = {},
): UpcomingPayment {
  return {
    id: 'statement:visa-uuid:2026-11',
    kind: 'card-statement',
    label: VISA.name,
    cardId: VISA.id,
    amount: items.reduce((total, item) => total + item.total, 0),
    includesOtherShare: items.reduce((total, item) => total + item.otherShare, 0),
    otherMemberName: items.find((item) => item.otherMemberName != null)?.otherMemberName ?? null,
    date: '2026-11-05',
    month: '2026-11',
    approximate: false,
    dateApprox: false,
    hasPassed: false,
    items,
    isEstimate: true,
    ...overrides,
  };
}

describe('UX-08 · canOpenPayment', () => {
  it('solo el resumen estimado de una tarjeta se abre', () => {
    const one = [occ({ id: 'a', total: 1 })];
    expect(canOpenPayment(statement(one))).toBe(true);
    expect(canOpenPayment(statement(one, { kind: 'fixed' }))).toBe(false);
    expect(canOpenPayment(statement(one, { kind: 'installment' }))).toBe(false);
    expect(canOpenPayment(statement(one, { kind: 'declared-statement' }))).toBe(false);
  });
});

describe('UX-08 · paymentDetail', () => {
  const items = [
    occ({ id: 'super', label: 'supermercado', total: 30_000 }),
    occ({ id: 'cuota', label: 'Zapatillas', total: 25_000, installment: { index: 3, count: 6 } }),
    occ({ id: 'gym', label: 'gimnasio', total: 15_000, isRecurrence: true }),
    occ({ id: 'cine', label: 'ocio', total: 10_000 }),
    occ({ id: 'cuota2', label: 'Heladera', total: 40_000, installment: { index: 1, count: 12 } }),
  ];
  const payment = statement(items);

  it('el título nombra la tarjeta y el vencimiento', () => {
    expect(paymentDetail(payment).title).toBe('Visa Galicia · vence 5 nov');
  });

  it('T-05 · sin día conocido dice el mes y avisa que las fechas son aproximadas', () => {
    const approx = statement(
      items.map((item) => ({ ...item, paymentDate: null, approximate: true })),
      { date: null, approximate: true },
    );
    const detail = paymentDetail(approx);

    expect(detail.title).toBe('Visa Galicia · se paga en noviembre');
    expect(detail.approximate).toBe(true);
  });

  it('agrupa en compras, cuotas y fijos, en ese orden, y omite los grupos vacíos', () => {
    expect(paymentDetail(payment).groups.map((group) => group.title)).toEqual([
      'Compras',
      'Cuotas',
      'Fijos',
    ]);

    const onlyPurchases = statement([occ({ id: 'a', total: 5 })]);
    expect(paymentDetail(onlyPurchases).groups.map((group) => group.title)).toEqual([
      'Compras',
    ]);
  });

  it('dentro de un grupo ordena de mayor a menor monto', () => {
    const groups = paymentDetail(payment).groups;
    expect(groups[0]!.lines.map((line) => line.id)).toEqual(['super', 'cine']);
    expect(groups[1]!.lines.map((line) => line.id)).toEqual(['cuota2', 'cuota']);
  });

  it('cada cuota dice "cuota k de n" y cada ocurrencia lleva su monto total pagado', () => {
    const cuota = paymentDetail(payment)
      .groups[1]!.lines.find((line) => line.id === 'cuota')!;
    expect(cuota.note).toBe('cuota 3 de 6');
    expect(cuota.amount).toBe(25_000);
  });

  it('la suma del detalle es exactamente la cifra de la fila', () => {
    const detail = paymentDetail(payment);
    const sumOfLines = detail.groups
      .flatMap((group) => group.lines)
      .reduce((total, line) => total + line.amount, 0);

    expect(detail.total).toBe(payment.amount);
    expect(sumOfLines).toBe(payment.amount);
    expect(detail.groups.reduce((total, group) => total + group.subtotal, 0)).toBe(payment.amount);
  });

  it('§7.3 · el monto es el TOTAL pagado y la parte del otro se aclara aparte', () => {
    const shared = statement([
      occ({
        id: 'cena',
        label: 'gastronomia',
        total: 100_000,
        myShare: 50_000,
        otherShare: 50_000,
        otherMemberName: 'Martina',
        spaceId: 'casa',
        spaceName: 'Casa',
      }),
      occ({ id: 'super', total: 20_000 }),
    ]);
    const detail = paymentDetail(shared);
    const cena = detail.groups[0]!.lines.find((line) => line.id === 'cena')!;

    expect(cena.amount).toBe(100_000);
    expect(cena.includesOtherShare).toBe(50_000);
    expect(cena.otherMemberName).toBe('Martina');
    expect(detail.total).toBe(120_000);
    expect(detail.other).toEqual({ amount: 50_000, name: 'Martina' });
  });

  it('con partes de dos personas distintas no se atribuyen en el total, solo por línea', () => {
    const mixed = statement([
      occ({ id: 'a', total: 10, otherShare: 5, otherMemberName: 'Martina' }),
      occ({ id: 'b', total: 10, otherShare: 5, otherMemberName: 'Lucía' }),
    ]);
    expect(paymentDetail(mixed).other).toBeNull();
  });

  it('sin parte de otros no hay aclaración', () => {
    expect(paymentDetail(payment).other).toBeNull();
  });

  it('N-10 · siempre se rotula como estimado', () => {
    expect(paymentDetail(payment).estimateNote).toBe('Estimado según lo que registraste');
  });

  it('C-05 · cada línea expone solo rótulo, nota, monto y la parte de otro', () => {
    const line = paymentDetail(payment).groups[0]!.lines[0]!;

    expect(Object.keys(line).sort()).toEqual(
      ['amount', 'id', 'includesOtherShare', 'label', 'note', 'otherMemberName'].sort(),
    );
  });
});
