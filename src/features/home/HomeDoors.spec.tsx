import { fireEvent, renderWithTheme } from '@/test/render';
import { NextMonthsDoor, UpcomingDoor } from './HomeDoors';

/** Nivel 3 · las puertas de Inicio dicen lo que §15 y N-08 exigen. */

describe('UpcomingDoor', () => {
  it('el primer pago, "y N más" y se toca entera', async () => {
    const onPress = jest.fn();
    const view = await renderWithTheme(
      <UpcomingDoor
        content={{ line: '20 oct · Visa Galicia · resumen estimado · $120.000', more: 'y 2 más' }}
        onPress={onPress}
      />,
    );

    expect(view.getByText('Próximos pagos')).toBeTruthy();
    expect(view.getByText('20 oct · Visa Galicia · resumen estimado · $120.000')).toBeTruthy();
    expect(view.getByText('y 2 más')).toBeTruthy();

    await fireEvent.press(view.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('con un solo pago no hay "y N más"', async () => {
    const view = await renderWithTheme(
      <UpcomingDoor content={{ line: '1 nov · Alquiler · $300.000', more: null }} onPress={jest.fn()} />,
    );

    expect(view.queryByText(/más/)).toBeNull();
  });
});

describe('NextMonthsDoor', () => {
  const bars = [
    { month: '2026-11', committed: 620_000, exceeds: false },
    { month: '2026-12', committed: 480_000, exceeds: false },
    { month: '2027-01', committed: 350_000, exceeds: false },
  ];

  it('dibuja una barra por mes y "Con tarjeta este mes" cuando hay', async () => {
    const view = await renderWithTheme(
      <NextMonthsDoor
        content={{ bars, maxCommitted: 620_000, excessPhrase: null }}
        cardPurchases={[{ month: '2026-11', amount: 95_000 }]}
        month="2026-10"
        onPress={jest.fn()}
      />,
    );

    // Las barras son decorativas para el lector de pantalla (oculto): se buscan igual.
    const hidden = { includeHiddenElements: true };
    expect(view.getByTestId('mini-bar-2026-11', hidden)).toBeTruthy();
    expect(view.getByTestId('mini-bar-2027-01', hidden)).toBeTruthy();
    expect(view.getByText('Con tarjeta este mes:')).toBeTruthy();
    expect(view.getByText('→ se paga en noviembre')).toBeTruthy();
    expect(view.queryByTestId('door-attention')).toBeNull();
  });

  it('N-08 · un mes en exceso: la frase literal, la marca en su barra y el borde de atención', async () => {
    const phrase =
      'En noviembre tus gastos y compromisos superan tus ingresos previstos por $35.000.';
    const view = await renderWithTheme(
      <NextMonthsDoor
        content={{
          bars: bars.map((bar, index) => ({ ...bar, exceeds: index === 0 })),
          maxCommitted: 620_000,
          excessPhrase: phrase,
        }}
        cardPurchases={[]}
        month="2026-10"
        onPress={jest.fn()}
      />,
    );

    expect(view.getByText(phrase)).toBeTruthy();
    const hidden = { includeHiddenElements: true };
    expect(view.getByTestId('mini-bar-excess-2026-11', hidden)).toBeTruthy();
    expect(view.queryByTestId('mini-bar-excess-2026-12', hidden)).toBeNull();
    expect(view.getByTestId('door-attention')).toBeTruthy();
  });

  it('CA-00 · sin términos prohibidos en el aviso', async () => {
    const view = await renderWithTheme(
      <NextMonthsDoor
        content={{
          bars,
          maxCommitted: 620_000,
          excessPhrase:
            'En noviembre tus gastos y compromisos superan tus ingresos previstos por $35.000.',
        }}
        cardPurchases={[]}
        month="2026-10"
        onPress={jest.fn()}
      />,
    );

    for (const forbidden of [/disponible/i, /te qued/i, /\blibre\b/i, /\bsaldo\b/i, /pagado/i]) {
      expect(view.queryByText(forbidden)).toBeNull();
    }
  });
});
