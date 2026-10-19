import { StyleSheet, type TextStyle } from 'react-native';
import { scheduleInstallments } from '@domain/installments';
import { renderWithTheme } from '@/test/render';
import { colorSchemes } from '@/ui/colors';
import { buildInstallmentsDetail } from './installmentsCycle';
import { InstallmentsDetail } from './InstallmentsDetail';

/**
 * 15·4 · el detalle de una compra en cuotas, dibujado. Hoy: 19 de octubre.
 */

const TODAY = '2026-10-19';

const zapatillas = buildInstallmentsDetail({
  today: TODAY,
  purchaseDate: '2026-10-14',
  schedule: scheduleInstallments(180_000, {
    count: 6,
    firstMonth: '2026-11',
    impactDay: 5,
    approximate: false,
  }),
  shared: null,
  methodName: 'Visa Galicia',
});

const heladera = buildInstallmentsDetail({
  today: TODAY,
  purchaseDate: '2026-07-20',
  schedule: scheduleInstallments(240_000, {
    count: 6,
    firstMonth: '2026-08',
    impactDay: 5,
    approximate: false,
  }),
  shared: null,
  methodName: 'Visa Galicia',
});

describe('InstallmentsDetail · arriba', () => {
  it('el monto con el menos tipográfico, en texto normal, y la línea de la compra', async () => {
    const view = await renderWithTheme(
      <InstallmentsDetail detail={zapatillas} footnote="Las cuotas no se editan de a una." />,
    );

    const figure = view.getByText('−$180.000');
    expect(StyleSheet.flatten(figure.props.style as TextStyle).color).toBe(colorSchemes.light.text);
    expect(figure.props.accessibilityLabel).toBe('gasto de $180.000');
    expect(view.getByText('6 cuotas de $30.000 · compra del 14 de octubre')).toBeTruthy();
    // Una compra personal no tiene "de $X".
    expect(view.queryByText(/^de \$/)).toBeNull();
  });

  it('en un compartido, tu parte arriba y el total en gris, sin signo', async () => {
    const shared = buildInstallmentsDetail({
      today: TODAY,
      purchaseDate: '2026-10-14',
      schedule: scheduleInstallments(180_000, {
        count: 6,
        firstMonth: '2026-11',
        impactDay: 5,
        approximate: false,
      }),
      shared: {
        purchaseTotal: 360_000,
        installmentTotals: [60_000, 60_000, 60_000, 60_000, 60_000, 60_000],
        payerName: 'Martina',
        iPaid: false,
      },
      methodName: null,
    });
    const view = await renderWithTheme(<InstallmentsDetail detail={shared} footnote="x" />);

    expect(view.getByText('−$180.000')).toBeTruthy();
    expect(view.getByText('de $360.000')).toBeTruthy();
    expect(view.getByText('$30.000 de $60.000')).toBeTruthy();
    expect(view.getByText('Martina')).toBeTruthy();
  });
});

describe('InstallmentsDetail · el ciclo', () => {
  it('"Faltan $180.000" sin "N de N cuotas" a la derecha, y "Todavía no pasó ninguna cuota"', async () => {
    const view = await renderWithTheme(<InstallmentsDetail detail={zapatillas} footnote="x" />);

    expect(view.getByText('Faltan $180.000')).toBeTruthy();
    expect(view.queryByText(/\d de \d cuotas/)).toBeNull();
    expect(view.getByText('Todavía no pasó ninguna cuota')).toBeTruthy();
    // El primer y el último mes, debajo de la línea.
    expect(view.getAllByText('noviembre').length).toBeGreaterThan(0);
    expect(view.getAllByText('abril').length).toBeGreaterThan(0);
  });

  it('una línea de N segmentos: los pasados llenos, el próximo con contorno', async () => {
    const view = await renderWithTheme(<InstallmentsDetail detail={heladera} footnote="x" />);

    // La línea es decorativa para el lector de pantalla (el texto de abajo lo dice).
    const hidden = { hidden: true };
    expect(view.getAllByTestId('cycle-passed', hidden)).toHaveLength(3);
    expect(view.getAllByTestId('cycle-next', hidden)).toHaveLength(1);
    expect(view.getAllByTestId('cycle-future', hidden)).toHaveLength(2);

    const next = StyleSheet.flatten(view.getByTestId('cycle-next', hidden).props.style);
    const passed = StyleSheet.flatten(view.getAllByTestId('cycle-passed', hidden)[0]!.props.style);
    // El próximo se distingue por el contorno, no solo por el color.
    expect(next.borderWidth).toBeGreaterThan(0);
    expect(passed.borderWidth ?? 0).toBe(0);
    expect(passed.backgroundColor).toBeTruthy();
    expect(view.getByText('Ya pasaron 3 de 6 cuotas')).toBeTruthy();
  });

  it('debajo: Próxima, Termina y Medio', async () => {
    const view = await renderWithTheme(<InstallmentsDetail detail={zapatillas} footnote="x" />);

    expect(view.getByText('5 de noviembre · $30.000')).toBeTruthy();
    expect(view.getByText('en abril')).toBeTruthy();
    expect(view.getByText('Visa Galicia')).toBeTruthy();
  });

  it('G-06 · nunca "Pagado" ni "Vas pagando"', async () => {
    const view = await renderWithTheme(<InstallmentsDetail detail={heladera} footnote="x" />);

    expect(view.queryByText(/pagado|vas pagando/i)).toBeNull();
  });
});

describe('InstallmentsDetail · la lista de cuotas, abajo', () => {
  it('las pasadas dicen "ya pasó" y las demás, solo el mes', async () => {
    const view = await renderWithTheme(<InstallmentsDetail detail={heladera} footnote="x" />);

    expect(view.getByText('agosto · ya pasó')).toBeTruthy();
    expect(view.getByText('octubre · ya pasó')).toBeTruthy();
    expect(view.getByText('noviembre')).toBeTruthy();
    expect(view.getByText('Sus cuotas')).toBeTruthy();
  });
});
