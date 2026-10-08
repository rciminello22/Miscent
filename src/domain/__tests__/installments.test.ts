import { describe, it, expect } from 'vitest';
import {
  endInstallmentsNow,
  installmentAmounts,
  planExistingInstallments,
  planInstallments,
  scheduleInstallments,
  totalFromInstallmentAmount,
} from '../installments';
import { resolveShares, splitInstallmentShares } from '../split';
import { sum } from '../money';
import type { PaymentMethod } from '../types';

const visa: PaymentMethod = {
  id: 'visa',
  kind: 'card',
  name: 'Visa Galicia',
  closingDay: 25,
  dueDay: 5,
};

describe('cuotas · Q-01 a Q-07', () => {
  it('Q-01 · por total: el redondeo se concentra en la primera cuota y la suma cierra', () => {
    expect(installmentAmounts(600_000, 6)).toEqual([
      100_000, 100_000, 100_000, 100_000, 100_000, 100_000,
    ]);

    const impar = installmentAmounts(100_000, 3);
    expect(impar).toEqual([33_334, 33_333, 33_333]);
    expect(sum(impar)).toBe(100_000);
  });

  it('Q-01 · por valor de cuota: cubre compras con interés sin pedir tasas', () => {
    expect(totalFromInstallmentAmount(30_000, 6)).toBe(180_000);
  });

  it('Q-02 · con tarjeta, la primera cuota cae en el mes de pago de la compra', () => {
    // Caso D de §29.1: heladera comprada el 10/10 con Visa (cierre 25, vence 5)
    // → primera cuota el 5/11.
    const plan = planInstallments({ purchaseDate: '2026-10-10', count: 6, card: visa });
    expect(plan.firstMonth).toBe('2026-11');
    expect(plan.impactDay).toBe(5);

    const schedule = scheduleInstallments(600_000, plan);
    expect(schedule).toHaveLength(6);
    expect(schedule[0]).toMatchObject({ index: 1, month: '2026-11', date: '2026-11-05' });
    expect(schedule[5]).toMatchObject({ index: 6, month: '2027-04', date: '2027-04-05' });
  });

  it('Q-02 · compra después del cierre: la primera cuota se corre un mes', () => {
    const plan = planInstallments({ purchaseDate: '2026-10-27', count: 6, card: visa });
    expect(plan.firstMonth).toBe('2026-12');
  });

  it('Q-03 · sin tarjeta: la primera cuota es un mes después, el mismo día', () => {
    const plan = planInstallments({ purchaseDate: '2026-10-15', count: 12, card: null });
    expect(plan.firstMonth).toBe('2026-11');
    expect(plan.impactDay).toBe(15);
    expect(scheduleInstallments(600_000, plan)[0]!.date).toBe('2026-11-15');
  });

  it('Q-04 · el mes de la primera cuota se puede fijar a mano', () => {
    const plan = planInstallments({
      purchaseDate: '2026-10-10',
      count: 6,
      card: visa,
      pinnedFirstMonth: '2027-01',
    });
    expect(plan.firstMonth).toBe('2027-01');
  });

  it('Q-06 / CA-34 · cuotas existentes "3 de 6": se generan 3 desde el mes siguiente', () => {
    const resultado = planExistingInstallments({
      installmentAmount: 30_000,
      paidCount: 3,
      totalCount: 6,
      lastStatementMonth: '2026-10',
      impactDay: 5,
    });

    expect(resultado.remaining).toBe(3);
    expect(resultado.remainingTotal).toBe(90_000);
    expect(resultado.plan.firstMonth).toBe('2026-11');

    const schedule = scheduleInstallments(resultado.remainingTotal, resultado.plan);
    expect(schedule.map((item) => item.month)).toEqual(['2026-11', '2026-12', '2027-01']);
    expect(schedule.every((item) => item.amount === 30_000)).toBe(true);
  });

  it('Q-06 · "2 de 6" del Caso 1 de §31 deja 4 cuotas de $30.000', () => {
    const resultado = planExistingInstallments({
      installmentAmount: 30_000,
      paidCount: 2,
      totalCount: 6,
      lastStatementMonth: '2026-10',
      impactDay: 5,
    });
    expect(resultado.remaining).toBe(4);
    expect(resultado.remainingTotal).toBe(120_000);
  });

  it('Q-07 · "Terminar ahora" conserva las pasadas y elimina las futuras', () => {
    const plan = planInstallments({ purchaseDate: '2026-10-10', count: 6, card: visa });
    // Hoy es enero: ya pasaron noviembre, diciembre y enero.
    const resultado = endInstallmentsNow(600_000, plan, '2027-01-20');
    expect(resultado.plan.count).toBe(3);
    expect(resultado.total).toBe(300_000);
  });

  it('Q-09 / CA-51 · reparto personalizado: cada cuota en la misma proporción del total', () => {
    // Caso E de §29.1: $600.000 con Renzo $360.000 y Martina $240.000, en 6 cuotas
    // → $60.000 y $40.000 por cuota.
    const amounts = installmentAmounts(600_000, 6);
    const shares = splitInstallmentShares(amounts, 600_000, {
      mode: 'custom',
      shareSlot1: 360_000,
      shareSlot2: 240_000,
    });

    expect(shares).toHaveLength(6);
    for (const share of shares) {
      expect(share.slot1).toBe(60_000);
      expect(share.slot2).toBe(40_000);
    }
    // Los tres invariantes.
    expect(sum(shares.map((s) => s.slot1))).toBe(360_000);
    expect(sum(shares.map((s) => s.slot2))).toBe(240_000);
    shares.forEach((share, index) => {
      expect(share.slot1 + share.slot2).toBe(amounts[index]);
    });
  });

  it('Q-09 · 50/50 en cuotas con total impar: los invariantes aguantan', () => {
    const total = 100_001;
    const amounts = installmentAmounts(total, 3);
    const shares = splitInstallmentShares(amounts, total, { mode: 'even' });
    const totalShares = resolveShares(total, { mode: 'even' });

    expect(sum(shares.map((s) => s.slot1))).toBe(totalShares.slot1);
    expect(sum(shares.map((s) => s.slot2))).toBe(totalShares.slot2);
    shares.forEach((share, index) => {
      expect(share.slot1 + share.slot2).toBe(amounts[index]);
    });
  });

  it('una compra "en cuotas" de menos de 2 cuotas se rechaza (§17)', () => {
    expect(() => installmentAmounts(100_000, 1)).toThrow();
  });
});

describe('reparto · C-03, C-04, P3', () => {
  it('C-03 · 50/50 redondea y las partes siempre suman el total', () => {
    expect(resolveShares(100_000, { mode: 'even' })).toEqual({ slot1: 50_000, slot2: 50_000 });
    const impar = resolveShares(100_001, { mode: 'even' });
    expect(impar.slot1 + impar.slot2).toBe(100_001);
  });

  it('C-04 · un gasto que corresponde entero a uno se carga con $0 para el otro', () => {
    // Caso 7 de §31: farmacia $30.000, Renzo $0, Martina $30.000.
    expect(resolveShares(30_000, { mode: 'custom', shareSlot1: 0, shareSlot2: 30_000 })).toEqual({
      slot1: 0,
      slot2: 30_000,
    });
  });

  it('C-02 · un reparto que no suma el total es un error, no un dato', () => {
    expect(() =>
      resolveShares(100_000, { mode: 'custom', shareSlot1: 60_000, shareSlot2: 50_000 }),
    ).toThrow(/C-02/);
  });
});
