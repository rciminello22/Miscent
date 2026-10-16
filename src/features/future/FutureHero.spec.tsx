import { fireEvent, renderWithTheme } from '@/test/render';
import type { FutureMonth } from '@domain/future';
import { FutureHero } from './FutureHero';
import { FutureMonthSelector } from './FutureMonthSelector';

/**
 * Nivel 3 · el N1 de Futuro (§23.1): la cifra del mes, Sin asignar con su
 * ayuda o la frase de N-08, y el selector de mes (las barras y la pastilla del
 * mes en curso).
 */

function month(overrides: Partial<FutureMonth> & { month: string }): FutureMonth {
  return {
    committed: 0,
    expectedIncome: 1_200_000,
    unassigned: 0,
    breakdown: { fixed: 0, installments: 0, cards: [], fromSpaces: 0 },
    ...overrides,
  };
}

describe('FutureHero', () => {
  it('el mes, su comprometido grande y Sin asignar "según tus ingresos previstos"', async () => {
    const view = await renderWithTheme(
      <FutureHero
        monthLabel="Noviembre"
        hero={{
          kind: 'month',
          committed: 620_000,
          line: { kind: 'unassigned', text: 'Sin asignar $580.000 · según tus ingresos previstos' },
        }}
        onOpenDetail={null}
        selector={null}
        endings={[]}
      />,
    );

    expect(view.getByText('Noviembre')).toBeTruthy();
    expect(view.getByText('$620.000')).toBeTruthy();
    expect(view.getByText('comprometidos')).toBeTruthy();
    expect(view.getByText('Sin asignar $580.000 · según tus ingresos previstos')).toBeTruthy();
  });

  it('N-08 · con Sin asignar negativo, la frase con el exceso sin signo y sin la cifra', async () => {
    const view = await renderWithTheme(
      <FutureHero
        monthLabel="Noviembre"
        hero={{
          kind: 'month',
          committed: 1_235_000,
          line: {
            kind: 'exceeds',
            text: 'Tus gastos y compromisos superan tus ingresos previstos por',
            amount: 35_000,
          },
        }}
        onOpenDetail={null}
        selector={null}
        endings={[]}
      />,
    );

    expect(
      view.getByText(/Tus gastos y compromisos superan tus ingresos previstos por/),
    ).toBeTruthy();
    expect(view.getByText('$35.000')).toBeTruthy();
    expect(view.queryByText(/Sin asignar/)).toBeNull();
  });

  it('sin ingreso previsto no se calcula', async () => {
    const view = await renderWithTheme(
      <FutureHero
        monthLabel="Noviembre"
        hero={{
          kind: 'month',
          committed: 620_000,
          line: { kind: 'noIncome', text: 'Sin ingreso registrado' },
        }}
        onOpenDetail={null}
        selector={null}
        endings={[]}
      />,
    );

    expect(view.getByText('Sin ingreso registrado')).toBeTruthy();
  });

  it('el mes en curso: cuántos pagos faltan, sin cifra', async () => {
    const view = await renderWithTheme(
      <FutureHero
        monthLabel="Octubre"
        hero={{ kind: 'current', headline: '3 pagos desde hoy' }}
        onOpenDetail={null}
        selector={null}
        endings={[]}
      />,
    );

    expect(view.getByText('3 pagos desde hoy')).toBeTruthy();
    expect(view.queryByText('comprometidos')).toBeNull();
  });

  it('CA-38 · la línea de cuotas que terminan', async () => {
    const line = 'En marzo terminan 2 cuotas: tu comprometido baja $80.000 por mes.';
    const view = await renderWithTheme(
      <FutureHero
        monthLabel="Noviembre"
        hero={{ kind: 'current', headline: '1 pago desde hoy' }}
        onOpenDetail={null}
        selector={null}
        endings={[line]}
      />,
    );

    expect(view.getByText(line)).toBeTruthy();
  });

  it('la cifra se toca para ver de qué se compone, y lo dice con un chevron', async () => {
    const onOpenDetail = jest.fn();
    const view = await renderWithTheme(
      <FutureHero
        monthLabel="Noviembre"
        hero={{
          kind: 'month',
          committed: 620_000,
          line: { kind: 'unassigned', text: 'Sin asignar $580.000 · según tus ingresos previstos' },
        }}
        onOpenDetail={onOpenDetail}
        selector={null}
        endings={[]}
      />,
    );

    expect(view.getByTestId('chevron', { includeHiddenElements: true })).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Comprometido del mes' }));
    expect(onOpenDetail).toHaveBeenCalledTimes(1);
  });

  it('sin detalle, la cifra no promete nada: ni botón ni chevron', async () => {
    const view = await renderWithTheme(
      <FutureHero
        monthLabel="Noviembre"
        hero={{
          kind: 'month',
          committed: 620_000,
          line: { kind: 'unassigned', text: 'Sin asignar $580.000 · según tus ingresos previstos' },
        }}
        onOpenDetail={null}
        selector={null}
        endings={[]}
      />,
    );

    expect(view.queryByRole('button')).toBeNull();
    expect(view.queryByTestId('chevron', { includeHiddenElements: true })).toBeNull();
  });
});

describe('FutureMonthSelector', () => {
  const months = [
    month({ month: '2026-11', committed: 620_000 }),
    month({ month: '2026-12', committed: 480_000 }),
  ];

  it('el mes en curso es una pastilla más del selector, y cada mes una barra', async () => {
    const view = await renderWithTheme(
      <FutureMonthSelector
        months={months}
        selected="2026-11"
        currentSelected={false}
        reference="2026-11"
        onSelectCurrent={jest.fn()}
        onSelectMonth={jest.fn()}
      />,
    );

    expect(view.getByRole('radio', { name: 'Este mes' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'noviembre' }).props.accessibilityState.selected).toBe(true);
    expect(view.getByRole('button', { name: 'diciembre' }).props.accessibilityState.selected).toBe(false);
  });

  it('elegir el mes en curso deselecciona las barras', async () => {
    const view = await renderWithTheme(
      <FutureMonthSelector
        months={months}
        selected={null}
        currentSelected
        reference="2026-11"
        onSelectCurrent={jest.fn()}
        onSelectMonth={jest.fn()}
      />,
    );

    expect(view.getByRole('radio', { name: 'Este mes' }).props.accessibilityState.selected).toBe(true);
    expect(view.getByRole('button', { name: 'noviembre' }).props.accessibilityState.selected).toBe(false);
  });

  it('tocar una barra elige su mes; tocar la pastilla, el mes en curso', async () => {
    const onSelectMonth = jest.fn();
    const onSelectCurrent = jest.fn();
    const view = await renderWithTheme(
      <FutureMonthSelector
        months={months}
        selected="2026-11"
        currentSelected={false}
        reference="2026-11"
        onSelectCurrent={onSelectCurrent}
        onSelectMonth={onSelectMonth}
      />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'diciembre' }));
    expect(onSelectMonth).toHaveBeenCalledWith('2026-12');

    await fireEvent.press(view.getByRole('radio', { name: 'Este mes' }));
    expect(onSelectCurrent).toHaveBeenCalledTimes(1);
  });
});
