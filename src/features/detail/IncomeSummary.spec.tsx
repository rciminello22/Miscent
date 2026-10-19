import { StyleSheet, type TextStyle } from 'react-native';
import { renderWithTheme } from '@/test/render';
import { colorSchemes } from '@/ui/colors';
import { fixedIncomeDetail, oneOffIncomeDetail } from './incomeDetail';
import { IncomeSummary } from './IncomeSummary';

/**
 * 15·5 · el encabezado del detalle de un ingreso: "+" en color, qué es y la
 * tarjeta de "Qué es / Desde / Día" (o "Qué es / Cuándo / Categoría").
 */

const TODAY = '2026-10-19';

describe('IncomeSummary · un ingreso fijo', () => {
  const copy = fixedIncomeDetail(
    { dayOfMonth: 28, dayApprox: true, startMonth: '2026-10', endMonth: null },
    TODAY,
  );

  it('"+$1.200.000" en brand (entra), con "ingreso de" para el lector de pantalla', async () => {
    const view = await renderWithTheme(<IncomeSummary amount={1_200_000} copy={copy} />);
    const figure = view.getByText('+$1.200.000');

    expect(StyleSheet.flatten(figure.props.style as TextStyle).color).toBe(colorSchemes.light.brand);
    expect(figure.props.accessibilityLabel).toBe('ingreso de $1.200.000');
  });

  it('"Fijo · cada ~28 · desde octubre" y la tarjeta con Qué es, Desde y Día', async () => {
    const view = await renderWithTheme(<IncomeSummary amount={1_200_000} copy={copy} />);

    expect(view.getByText('Fijo · cada ~28 · desde octubre')).toBeTruthy();
    expect(view.getByText('Qué es')).toBeTruthy();
    expect(view.getByText('Fijo, se repite todos los meses')).toBeTruthy();
    expect(view.getByText('Desde')).toBeTruthy();
    expect(view.getByText('octubre')).toBeTruthy();
    expect(view.getByText('Día')).toBeTruthy();
    expect(view.getByText('cada ~28 · aproximado')).toBeTruthy();
  });
});

describe('IncomeSummary · un ingreso puntual', () => {
  const copy = oneOffIncomeDetail({ date: '2026-10-12', categoryLabel: 'Otros ingresos' }, TODAY);

  it('"+$85.000", "Extra · 12 de octubre" y la tarjeta Qué es, Cuándo y Categoría', async () => {
    const view = await renderWithTheme(<IncomeSummary amount={85_000} copy={copy} />);

    expect(view.getByText('+$85.000')).toBeTruthy();
    expect(view.getByText('Extra · 12 de octubre')).toBeTruthy();
    expect(view.getByText('Extra, entró una sola vez')).toBeTruthy();
    expect(view.getByText('Cuándo')).toBeTruthy();
    expect(view.getAllByText('12 de octubre').length).toBeGreaterThan(0);
    expect(view.getByText('Categoría')).toBeTruthy();
    expect(view.getByText('Otros ingresos')).toBeTruthy();
  });

  it('la etiqueta de la lista ("Ingreso registrado") no aparece en el detalle', async () => {
    const view = await renderWithTheme(<IncomeSummary amount={85_000} copy={copy} />);

    expect(view.queryByText(/Ingreso registrado/)).toBeNull();
  });
});
