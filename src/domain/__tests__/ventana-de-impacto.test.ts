/**
 * H-02 · un fijo con tarjeta se paga hasta DOS meses después del día en que
 * ocurre (T-03): con cierre 25 y vencimiento 5, el cargo del 28/8 cierra el
 * 25/9 y vence el 5/10.
 *
 * La app expande los hechos una sola vez sobre [mes − 1, mes + 7]. Ese rango
 * se aplicaba al mes en que OCURRE el fijo, no al mes en que se PAGA, así que
 * el cargo de agosto (que vence en octubre) quedaba afuera del Comprometido y
 * de los Próximos pagos de octubre. Los atajos de §29.1 (`radarForMonth`,
 * `futureFrom`) usan otra ventana, y por eso no lo veían.
 *
 * Estos tests fijan dos cosas: que cada ocurrencia entra en el mes en que se
 * paga cualquiera sea la ventana, y que ampliar la ventana nunca la duplica.
 */

import { describe, expect, it } from 'vitest';
import { addMonths, monthOf, type IsoDate, type Month } from '../calendar';
import { resolveCardPayment } from '../cards';
import { calculateFuture, futureFrom } from '../future';
import { CARD_PAYMENT_LAG_MONTHS, expandPersonalOccurrences } from '../occurrences';
import { calculateRadar, radarForMonth } from '../radar';
import { calculateUpcomingPayments } from '../upcoming';
import type { PaymentMethod } from '../types';
import {
  RENZO,
  membership,
  paidWith,
  personalFacts,
  personalRecurrence,
  sharedRecurrence,
  spaceFacts,
  visa,
} from './fixtures';

const HOY: IsoDate = '2026-10-07';
const OCTUBRE: Month = '2026-10';

/** La ventana con la que `usePersonalFacts` expande para toda la app. */
function appWindow(today: IsoDate) {
  const current = monthOf(today);
  return { from: addMonths(current, -1), to: addMonths(current, 7) };
}

function facts() {
  return personalFacts({
    recurrences: [
      personalRecurrence({
        id: 'gimnasio',
        kind: 'expense',
        amount: 80_000,
        dayOfMonth: 28,
        startMonth: '2026-06',
        category: 'gimnasio',
        paymentMethodId: visa.id,
      }),
    ],
  });
}

describe('H-02 · el fijo con tarjeta entra en el mes en que se paga', () => {
  it('con la ventana de la app, el cargo del 28/8 está en el Comprometido de octubre', () => {
    const radar = calculateRadar(expandPersonalOccurrences(facts(), appWindow(HOY)), OCTUBRE);
    expect(radar.committed).toBe(80_000);
  });

  it('esa ocurrencia vence el 5/10 y es la del cargo de agosto', () => {
    const expansion = expandPersonalOccurrences(facts(), appWindow(HOY));
    const october = expansion.occurrences.filter((occurrence) => occurrence.month === OCTUBRE);
    expect(october).toHaveLength(1);
    expect(october[0]).toMatchObject({
      id: 'recurrence:gimnasio:2026-08',
      paymentDate: '2026-10-05',
      cardId: visa.id,
      purchaseMonth: '2026-08',
    });
  });

  it('Próximos pagos de octubre incluye el resumen de la Visa del 5/10', () => {
    const expansion = expandPersonalOccurrences(facts(), appWindow('2026-10-01'));
    const payments = calculateUpcomingPayments(expansion, '2026-10-01', [visa]);
    const visaOctober = payments.find((payment) => payment.date === '2026-10-05');
    expect(visaOctober?.amount).toBe(80_000);
  });

  it('el mes anterior (septiembre) también tiene el suyo: el cargo de julio', () => {
    const radar = calculateRadar(expandPersonalOccurrences(facts(), appWindow(HOY)), '2026-09');
    expect(radar.committed).toBe(80_000);
  });

  it('el fijo compartido que pago yo con mi tarjeta se corre igual', () => {
    const alquiler = sharedRecurrence({
      id: 'alquiler',
      amount: 200_000,
      dayOfMonth: 28,
      startMonth: '2026-06',
      payerSlot: RENZO,
    });
    const shared = personalFacts({
      spaces: [
        membership({
          facts: spaceFacts({ recurrences: [alquiler] }),
          mySlot: RENZO,
          paymentDetails: [paidWith('alquiler', RENZO, visa.id)],
        }),
      ],
    });

    const radar = calculateRadar(expandPersonalOccurrences(shared, appWindow(HOY)), OCTUBRE);
    // Mi parte (50/50) del cargo del 28/8, que vence el 5/10.
    expect(radar.committed).toBe(100_000);
  });
});

describe('H-02 · ampliar la ventana nunca duplica una ocurrencia', () => {
  const windows = [
    { from: OCTUBRE, to: OCTUBRE },
    appWindow(HOY),
    { from: '2026-01', to: '2027-12' },
  ];

  it.each(windows)('ventana %o: un solo cargo por mes de pago', (window) => {
    const expansion = expandPersonalOccurrences(facts(), window);
    const ids = expansion.occurrences.map((occurrence) => occurrence.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(expansion.occurrences.filter((occurrence) => occurrence.month === OCTUBRE)).toHaveLength(1);
  });

  it('ninguna ocurrencia de un fijo queda antes del inicio de la ventana', () => {
    const window = appWindow(HOY);
    const expansion = expandPersonalOccurrences(facts(), window);
    for (const occurrence of expansion.occurrences) {
      expect(occurrence.month >= window.from).toBe(true);
    }
  });
});

describe('H-02 · Inicio, Futuro y los atajos de §29.1 dan lo mismo', () => {
  it('para cada mes de Futuro: radarForMonth, la ventana de la app y futureFrom coinciden', () => {
    const appExpansion = expandPersonalOccurrences(facts(), appWindow(HOY));
    const fromApp = calculateFuture(appExpansion, addMonths(OCTUBRE, 1));
    const fromShortcut = futureFrom(facts(), addMonths(OCTUBRE, 1));

    for (let offset = 0; offset < 6; offset++) {
      const month = addMonths(OCTUBRE, offset + 1);
      const single = radarForMonth(facts(), month).committed;
      expect(fromApp.months[offset]!.committed).toBe(single);
      expect(fromShortcut.months[offset]!.committed).toBe(single);
      expect(calculateRadar(appExpansion, month).committed).toBe(single);
    }
  });
});

describe('H-02 · el corrimiento máximo entre el cargo y el pago es de 2 meses', () => {
  // Si alguna combinación de días lo supera, la ventana extra deja de alcanzar.
  const days = [1, 2, 5, 10, 15, 20, 25, 28, 29, 30, 31];
  const purchases: IsoDate[] = [];
  for (const month of ['2026-01', '2026-02', '2026-12', '2028-02'] as Month[]) {
    for (const day of [1, 15, 27, 28, 29, 30, 31]) {
      const [year, m] = month.split('-').map(Number) as [number, number];
      const last = new Date(Date.UTC(year, m, 0)).getUTCDate();
      if (day <= last) purchases.push(`${month}-${String(day).padStart(2, '0')}` as IsoDate);
    }
  }

  it('para toda combinación de cierre y vencimiento, exacta o aproximada', () => {
    const cards: PaymentMethod[] = [];
    for (const closingDay of [...days, null]) {
      for (const dueDay of [...days, null]) {
        cards.push({ ...visa, id: `c${closingDay}-${dueDay}`, closingDay, dueDay });
      }
    }
    for (const card of cards) {
      for (const date of purchases) {
        const lag =
          monthIndexOf(resolveCardPayment(card, date).month) - monthIndexOf(monthOf(date));
        expect(lag).toBeGreaterThanOrEqual(0);
        expect(lag).toBeLessThanOrEqual(CARD_PAYMENT_LAG_MONTHS);
      }
    }
  });
});

function monthIndexOf(month: Month): number {
  const [year, m] = month.split('-').map(Number) as [number, number];
  return year * 12 + (m - 1);
}
