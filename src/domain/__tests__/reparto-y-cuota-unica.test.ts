/**
 * H-04 / H-05 · un reparto personalizado guarda dos montos. Si después cambia
 * el total, las partes viejas ya no suman (C-02): Agregar se caía en pleno
 * render y la edición la rechazaba la base.
 *
 * H-06 · "Terminar ahora" con una sola cuota conservada, y las cuotas en curso
 * del onboarding con una sola restante, son planes de UNA cuota. Q-06 y Q-07
 * los producen; el modelo tiene que aceptarlos.
 */

import { describe, expect, it } from 'vitest';
import {
  endInstallmentsNow,
  endInstallmentsNowWithSplit,
  hasInstallmentPlan,
  planExistingInstallments,
  scheduleInstallments,
  shouldReplan,
} from '../installments';
import { fitSplitToTotal, resolveShares, splitInstallmentShares } from '../split';
import { expandSpaceOccurrences } from '../occurrences';
import { calculateSharedBalance } from '../shared-balance';
import { RENZO, sharedExpense, spaceFacts, visa } from './fixtures';

describe('fitSplitToTotal · el reparto acompaña al total (H-04, H-05)', () => {
  it('50/50 queda 50/50', () => {
    expect(fitSplitToTotal({ mode: 'even' }, 1_001)).toEqual({ mode: 'even' });
  });

  it('si ya suma el total, no cambia nada', () => {
    const split = { mode: 'custom', shareSlot1: 60_000, shareSlot2: 40_000 } as const;
    expect(fitSplitToTotal(split, 100_000)).toBe(split);
  });

  it('al corregir el total, las partes se ajustan en la misma proporción (F-04, Q-09)', () => {
    const fitted = fitSplitToTotal({ mode: 'custom', shareSlot1: 60_000, shareSlot2: 40_000 }, 150_000);
    expect(fitted).toEqual({ mode: 'custom', shareSlot1: 90_000, shareSlot2: 60_000 });
  });

  it('siempre suma el total exacto, aunque haya redondeo', () => {
    for (const total of [1, 2, 3, 7, 99, 100_001, 999_999_999]) {
      const fitted = fitSplitToTotal({ mode: 'custom', shareSlot1: 1, shareSlot2: 2 }, total);
      expect(() => resolveShares(total, fitted)).not.toThrow();
    }
  });

  it('C-04 · "entero para uno" sigue entero para uno', () => {
    expect(fitSplitToTotal({ mode: 'custom', shareSlot1: 0, shareSlot2: 50_000 }, 80_000)).toEqual({
      mode: 'custom',
      shareSlot1: 0,
      shareSlot2: 80_000,
    });
    expect(fitSplitToTotal({ mode: 'custom', shareSlot1: 50_000, shareSlot2: 0 }, 80_000)).toEqual({
      mode: 'custom',
      shareSlot1: 80_000,
      shareSlot2: 0,
    });
  });

  it('sin proporción posible (partes en cero), parte a la mitad sin dejar de ser personalizado', () => {
    expect(fitSplitToTotal({ mode: 'custom', shareSlot1: 0, shareSlot2: 0 }, 101)).toEqual({
      mode: 'custom',
      shareSlot1: 51,
      shareSlot2: 50,
    });
  });

  it('con total 0 (el campo vacío) no se cae', () => {
    expect(fitSplitToTotal({ mode: 'custom', shareSlot1: 60, shareSlot2: 40 }, 0)).toEqual({
      mode: 'custom',
      shareSlot1: 0,
      shareSlot2: 0,
    });
  });
});

describe('H-06 · un plan de una sola cuota es válido', () => {
  it('se expande en su única cuota, "1 de 1"', () => {
    const scheduled = scheduleInstallments(50_000, {
      count: 1,
      firstMonth: '2026-11',
      impactDay: 5,
      approximate: false,
    });
    expect(scheduled).toEqual([
      { index: 1, count: 1, amount: 50_000, month: '2026-11', date: '2026-11-05', approximate: false },
    ]);
  });

  it('Q-06 · "5 de 6" genera la cuota que falta, desde el mes siguiente al resumen', () => {
    const result = planExistingInstallments({
      installmentAmount: 30_000,
      paidCount: 5,
      totalCount: 6,
      lastStatementMonth: '2026-10',
      impactDay: 5,
    });
    expect(result.plan.count).toBe(1);
    expect(result.plan.firstMonth).toBe('2026-11');
    expect(result.remainingTotal).toBe(30_000);
  });

  it('Q-07 · "Terminar ahora" cuando solo se conserva la cuota de este mes deja un plan de 1', () => {
    const plan = { count: 6, firstMonth: '2026-10', impactDay: 5, approximate: false };
    const result = endInstallmentsNow(600_000, plan, '2026-10-20');
    expect(result.plan.count).toBe(1);
    expect(result.total).toBe(100_000);
    expect(scheduleInstallments(result.total, result.plan)).toHaveLength(1);
  });

  it('hasInstallmentPlan distingue "sin plan" de un plan de 1', () => {
    expect(hasInstallmentPlan(null)).toBe(false);
    expect(hasInstallmentPlan(0)).toBe(false);
    expect(hasInstallmentPlan(1)).toBe(true);
    expect(hasInstallmentPlan(6)).toBe(true);
  });

  it('editar la fecha de una compra que quedó en 1 cuota rearma su plan', () => {
    const before = { date: '2026-09-10', installmentCount: 1, payerMethodId: null } as const;
    expect(shouldReplan(before, { ...before, date: '2026-09-12' })).toBe(true);
    expect(shouldReplan(before, { ...before })).toBe(false);
  });
});

describe('H-05 · "Terminar ahora" de una compra compartida con reparto personalizado', () => {
  const custom = { mode: 'custom', shareSlot1: 360_000, shareSlot2: 240_000 } as const;
  const plan = { count: 6, firstMonth: '2026-08', impactDay: 5, approximate: false };

  it('las partes nuevas suman el total nuevo (C-02)', () => {
    const result = endInstallmentsNowWithSplit(600_000, plan, custom, '2026-10-20');
    expect(result.total).toBe(300_000);
    expect(() => resolveShares(result.total, result.split)).not.toThrow();
  });

  it('cada parte es exactamente lo que ya se generó cuota por cuota (P2, Q-09)', () => {
    const result = endInstallmentsNowWithSplit(600_000, plan, custom, '2026-10-20');
    const before = splitInstallmentShares(
      scheduleInstallments(600_000, plan).map((item) => item.amount),
      600_000,
      custom,
    ).slice(0, 3);
    expect(result.split).toEqual({
      mode: 'custom',
      shareSlot1: before.reduce((acc, share) => acc + share.slot1, 0),
      shareSlot2: before.reduce((acc, share) => acc + share.slot2, 0),
    });
  });

  it('el saldo de los meses ya pasados no cambia', () => {
    const expense = sharedExpense({
      id: 'heladera',
      amount: 600_001,
      date: '2026-07-20',
      payerSlot: RENZO,
      split: { mode: 'custom', shareSlot1: 400_000, shareSlot2: 200_001 },
      installments: { count: 6, card: visa },
    });
    const today = '2026-10-20';
    const ended = endInstallmentsNowWithSplit(expense.amount, expense.installments!, expense.split, today);
    const after = { ...expense, amount: ended.total, split: ended.split, installments: ended.plan };

    const balance = (facts: ReturnType<typeof spaceFacts>) => calculateSharedBalance(facts, RENZO, today);
    expect(balance(spaceFacts({ expenses: [after] }))).toEqual(balance(spaceFacts({ expenses: [expense] })));

    // Las cuotas que quedan son las mismas: monto y fecha de impacto.
    const window = { from: '2026-01', to: '2027-12' };
    const kept = expandSpaceOccurrences(spaceFacts({ expenses: [after] }), window);
    const original = expandSpaceOccurrences(spaceFacts({ expenses: [expense] }), window).slice(0, kept.length);
    expect(kept.map((item) => [item.amount, item.balanceDate])).toEqual(
      original.map((item) => [item.amount, item.balanceDate]),
    );
    // La parte de cada uno suma lo mismo. Cuota por cuota, el redondeo de Q-09
    // (el resto en la primera) puede moverla $1 por cuota, nunca más.
    const sum = (items: typeof kept, slot: 'slot1' | 'slot2') =>
      items.reduce((acc, item) => acc + item.shares[slot], 0);
    expect(sum(kept, 'slot1')).toBe(sum(original, 'slot1'));
    expect(sum(kept, 'slot2')).toBe(sum(original, 'slot2'));
    kept.forEach((item, index) => {
      expect(Math.abs(item.shares.slot1 - original[index]!.shares.slot1)).toBeLessThanOrEqual(kept.length);
    });
  });

  it('con 50/50 sigue 50/50', () => {
    const result = endInstallmentsNowWithSplit(600_000, plan, { mode: 'even' }, '2026-10-20');
    expect(result.split).toEqual({ mode: 'even' });
  });

  it('si no pasó ninguna cuota, no queda nada que repartir', () => {
    const result = endInstallmentsNowWithSplit(600_000, { ...plan, firstMonth: '2026-12' }, custom, '2026-10-20');
    expect(result.plan.count).toBe(0);
    expect(result.total).toBe(0);
  });
});
