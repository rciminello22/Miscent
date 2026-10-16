import { renderWithTheme } from '@/test/render';
import { RadarBar } from './RadarBar';

/**
 * §15 · lo que NO tiene destino se dibuja con contorno: cierra la barra y
 * repite el anillo hueco de la leyenda de Sin asignar. No es un track gris
 * (que se perdía): el vacío tiene forma.
 *
 * Los casos de borde no se inventan un contorno: sin ingresos (CA-03) no hay
 * proporciones y el exceso (N-08) llena la barra con su marca.
 */

describe('RadarBar · Sin asignar con contorno', () => {
  it('con ingresos y algo sin asignar, ese tramo lleva contorno', async () => {
    const view = await renderWithTheme(
      <RadarBar registeredIncome={1_200_000} spent={320_000} committed={480_000} />,
    );

    expect(view.getByTestId('radar-bar-unassigned')).toBeTruthy();
    expect(view.getByTestId('radar-bar-spent')).toBeTruthy();
  });

  it('el contorno no cierra el lado de los tramos llenos: no hay borde izquierdo', async () => {
    const view = await renderWithTheme(
      <RadarBar registeredIncome={1_200_000} spent={320_000} committed={480_000} />,
    );

    const style = view.getByTestId('radar-bar-unassigned').props.style;
    const flat = Object.assign({}, ...[style].flat(3).filter(Boolean));
    expect(flat.borderLeftWidth).toBe(0);
    expect(flat.borderTopWidth ?? flat.borderWidth).toBeGreaterThan(0);
  });

  it('CA-03 · sin ingresos no hay proporciones ni contorno: el track queda neutro', async () => {
    const view = await renderWithTheme(
      <RadarBar registeredIncome={0} spent={250_000} committed={100_000} />,
    );

    expect(view.queryByTestId('radar-bar-unassigned')).toBeNull();
    expect(view.queryByTestId('radar-bar-spent')).toBeNull();
  });

  it('N-08 · con exceso la barra se llena con su marca y no queda nada sin asignar', async () => {
    const view = await renderWithTheme(
      <RadarBar registeredIncome={500_000} spent={535_000} committed={0} />,
    );

    expect(view.queryByTestId('radar-bar-unassigned')).toBeNull();
    expect(view.getByTestId('radar-bar-excess')).toBeTruthy();
  });

  it('sin nada asignado todo es contorno', async () => {
    const view = await renderWithTheme(
      <RadarBar registeredIncome={1_000_000} spent={0} committed={0} />,
    );

    expect(view.getByTestId('radar-bar-unassigned')).toBeTruthy();
  });
});
