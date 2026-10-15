import { renderWithTheme } from '@/test/render';
import { FutureMonthDetail } from './FutureMonthDetail';

/**
 * UX-10 · §23.1 · el desglose del mes futuro elegido: el lenguaje obligatorio.
 */

describe('§23.1 · FutureMonthDetail', () => {
  it('§33 · Sin asignar positivo lleva "según tus ingresos previstos"', async () => {
    const view = await renderWithTheme(
      <FutureMonthDetail
        title="noviembre"
        committed={620_000}
        expectedIncome={1_200_000}
        unassigned={580_000}
      />,
    );

    expect(view.getByText('Sin asignar')).toBeTruthy();
    expect(view.getByText('$580.000')).toBeTruthy();
    expect(view.getByText('todavía sin destino, según tus ingresos previstos')).toBeTruthy();
  });

  it('N-08 · con negativo muestra la frase y el exceso sin signo, nunca "−$"', async () => {
    const view = await renderWithTheme(
      <FutureMonthDetail
        title="noviembre"
        committed={1_235_000}
        expectedIncome={1_200_000}
        unassigned={-35_000}
      />,
    );

    expect(
      view.getByText(/Tus gastos y compromisos superan tus ingresos previstos por/),
    ).toBeTruthy();
    expect(view.getByText('$35.000')).toBeTruthy();
    expect(view.queryByText(/−/)).toBeNull();
    // La cifra con su etiqueta no se muestra: sería el mismo monto dos veces.
    expect(view.queryByText('Sin asignar')).toBeNull();
  });

  it('§23.1 · sin ingreso previsto: "Sin ingreso registrado" y no se calcula', async () => {
    const view = await renderWithTheme(
      <FutureMonthDetail
        title="noviembre"
        committed={620_000}
        expectedIncome={0}
        unassigned={null}
      />,
    );

    expect(view.getByText('Sin ingreso registrado')).toBeTruthy();
    expect(view.queryByText('Sin asignar')).toBeNull();
    expect(view.queryByText(/sin destino/)).toBeNull();
  });
});
