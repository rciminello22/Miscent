import { calculateRadar } from '@domain/radar';
import { expandPersonalOccurrences } from '@domain/occurrences';
import type { PersonalFacts } from '@domain/types';
import { renderWithTheme } from '@/test/render';
import { CardPurchasesThisMonth, RadarSummary } from './RadarSummary';

/**
 * Nivel 3 · el lenguaje OBLIGATORIO del radar.
 *
 * El lint de CA-00 verifica los términos prohibidos. Estos tests verifican los
 * exigidos, que es la otra mitad del problema: CA-01 no se cumple solo por no
 * decir "disponible", se cumple diciendo "todavía sin destino, según lo que
 * registraste".
 *
 * Los números NO se escriben a mano: se calculan con el dominio, igual que en
 * la app. Así cada test comprueba las dos cosas a la vez —el cálculo y el
 * texto— y no puede pasar con una cifra inventada.
 */

const MONTH = '2026-10';

function factsFor(input: {
  income?: number;
  spentCash?: number;
  fixed?: number;
  cardPurchase?: number;
}): PersonalFacts {
  return {
    userId: 'test',
    paymentMethods: [
      { id: 'debito', kind: 'debit', name: 'Débito', closingDay: null, dueDay: null },
      // Cierra 25, vence 5: una compra de octubre se paga en noviembre (T-03).
      { id: 'visa', kind: 'card', name: 'Visa', closingDay: 25, dueDay: 5 },
    ],
    movements: [
      ...(input.income != null
        ? [
            {
              id: 'ingreso',
              kind: 'income' as const,
              amount: input.income,
              date: '2026-10-05',
              category: 'sueldo' as const,
              description: null,
              paymentMethodId: null,
              installments: null,
            },
          ]
        : []),
      ...(input.spentCash != null
        ? [
            {
              id: 'gasto',
              kind: 'expense' as const,
              amount: input.spentCash,
              date: '2026-10-10',
              category: 'supermercado' as const,
              description: null,
              paymentMethodId: 'debito',
              installments: null,
            },
          ]
        : []),
      ...(input.cardPurchase != null
        ? [
            {
              id: 'ropa',
              kind: 'expense' as const,
              amount: input.cardPurchase,
              date: '2026-10-07',
              category: 'ropa' as const,
              description: null,
              paymentMethodId: 'visa',
              installments: null,
            },
          ]
        : []),
    ],
    recurrences:
      input.fixed != null
        ? [
            {
              id: 'alquiler',
              kind: 'expense' as const,
              amount: input.fixed,
              category: 'alquiler' as const,
              description: null,
              stoppedByDepartureOn: null,
              departureResolution: null,
              createdBySlot: null,
              updatedBySlot: null,
              updatedAt: '2026-01-01T00:00:00+00:00',
              pastTerms: [],
              dayOfMonth: 1,
              startMonth: '2026-01',
              endMonth: null,
              ownerUserId: 'test',
              spaceId: null,
              paymentMethodId: 'debito',
              payerSlot: null,
              split: null,
            },
          ]
        : [],
    overrides: [],
    declaredStatements: [],
    spaces: [],
  };
}

function radarFor(input: Parameters<typeof factsFor>[0]) {
  const facts = factsFor(input);
  return calculateRadar(
    expandPersonalOccurrences(facts, { from: MONTH, to: '2026-11' }),
    MONTH,
  );
}

describe('§15 · RadarSummary', () => {
  it('CA-01 · Sin asignar $400.000 con "todavía sin destino, según lo que registraste"', async () => {
    // Caso A de §29.1.
    const radar = radarFor({ income: 1_200_000, spentCash: 250_000, fixed: 550_000 });

    // El dominio da el número; el test no lo escribe a mano.
    expect(radar.unassigned).toBe(400_000);

    const view = await renderWithTheme(<RadarSummary radar={radar} month={MONTH} />);

    expect(view.getByText('Sin asignar')).toBeTruthy();
    expect(view.getByText('$400.000')).toBeTruthy();
    expect(view.getByText('todavía sin destino, según lo que registraste')).toBeTruthy();
  });

  it('CA-00 · no aparece ninguno de los términos prohibidos', async () => {
    const radar = radarFor({ income: 1_200_000, spentCash: 250_000, fixed: 550_000 });
    const view = await renderWithTheme(<RadarSummary radar={radar} month={MONTH} />);

    for (const forbidden of [
      /disponible/i,
      /te qued/i,
      /dinero libre/i,
      /\blibre\b/i,
      /podés gastar/i,
      /\bsaldo\b/i,
      /por día/i,
    ]) {
      expect(view.queryByText(forbidden)).toBeNull();
    }
  });

  it('§33 · las tres cifras llevan su etiqueta y su ayuda', async () => {
    const radar = radarFor({ income: 1_200_000, spentCash: 250_000, fixed: 550_000 });
    const view = await renderWithTheme(<RadarSummary radar={radar} month={MONTH} />);

    expect(view.getByText('Gastado')).toBeTruthy();
    expect(view.getByText('lo que registraste como pagado en el día a día')).toBeTruthy();

    expect(view.getByText('Comprometido')).toBeTruthy();
    expect(view.getByText('fijos, cuotas y tarjetas de este mes')).toBeTruthy();
  });

  it('§15 · el total se rotula "registrados", no como plata que se tiene', async () => {
    const radar = radarFor({ income: 1_200_000, spentCash: 250_000 });
    const view = await renderWithTheme(<RadarSummary radar={radar} month={MONTH} />);

    expect(view.getByText('Tus ingresos de octubre')).toBeTruthy();
    expect(view.getByText('registrados')).toBeTruthy();
  });

  it('CA-03 · sin ingresos registrados NO se muestra Sin asignar, y se invita a registrarlo', async () => {
    const radar = radarFor({ spentCash: 250_000, fixed: 100_000 });

    expect(radar.unassigned).toBeNull();

    const view = await renderWithTheme(<RadarSummary radar={radar} month={MONTH} />);

    expect(view.queryByText('Sin asignar')).toBeNull();
    expect(
      view.getByText('Registrá tu ingreso para ver qué parte ya tiene destino.'),
    ).toBeTruthy();
  });

  it('CA-02 / N-08 · con los compromisos por encima de los ingresos, la frase exacta', async () => {
    const radar = radarFor({ income: 500_000, spentCash: 535_000 });

    expect(radar.exceedsIncome).toBe(true);
    expect(radar.unassigned).toBe(-35_000);

    const view = await renderWithTheme(<RadarSummary radar={radar} month={MONTH} />);

    expect(
      view.getByText(/Tus gastos y compromisos superan tus ingresos registrados por/),
    ).toBeTruthy();
    // Sin signo: el texto ya explica el sentido.
    expect(view.getByText('$35.000')).toBeTruthy();

    // La frase REEMPLAZA a la cifra: mostrar las dos haría que el mismo monto
    // apareciera dos veces, y "Sin asignar $35.000" se leería como si quedara
    // algo cuando pasa justo lo contrario.
    expect(view.queryByText('Sin asignar')).toBeNull();
  });

  it('M18 · las tres cifras son tocables para ver de dónde salen', async () => {
    const radar = radarFor({ income: 1_200_000, spentCash: 250_000, fixed: 550_000 });
    const onOpen = jest.fn();

    const view = await renderWithTheme(
      <RadarSummary radar={radar} month={MONTH} onOpenBreakdown={onOpen} />,
    );

    for (const label of ['Gastado', 'Comprometido', 'Sin asignar']) {
      const row = view.getByLabelText(label);
      expect(row.props.accessibilityHint).toBe('Ver de dónde sale esta cifra');
    }
  });
});

describe('§15 · "Con tarjeta este mes"', () => {
  it('CA-53 · la compra con tarjeta no suma a Gastado y avisa en qué mes se paga', async () => {
    const radar = radarFor({ income: 1_200_000, cardPurchase: 95_000 });

    // CA-53 · NO suma a Gastado del mes de compra.
    expect(radar.spent).toBe(0);
    expect(radar.cardPurchasesThisMonth).toEqual([{ month: '2026-11', amount: 95_000 }]);

    const view = await renderWithTheme(
      <CardPurchasesThisMonth entries={radar.cardPurchasesThisMonth} month={MONTH} />,
    );

    expect(view.getByText('Con tarjeta este mes:')).toBeTruthy();
    expect(view.getByText('$95.000')).toBeTruthy();
    expect(view.getByText('→ se paga en noviembre')).toBeTruthy();
  });
});
