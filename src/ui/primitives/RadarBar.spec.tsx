import { colorSchemes } from '@/ui/colors';
import { fireEvent, renderWithTheme } from '@/test/render';
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

/**
 * Decisión 1A · N-08 · los ingresos son un recipiente y lo de más sale por la
 * derecha, a escala, como un tramo rayado con su propio contorno. Etiqueta
 * arriba con la cifra exacta; corchete abajo con "Tus ingresos registrados".
 */
describe('RadarBar · el exceso como recipiente a escala', () => {
  const measured = async (props: { income: number; spent: number; committed: number }) => {
    const view = await renderWithTheme(
      <RadarBar
        registeredIncome={props.income}
        spent={props.spent}
        committed={props.committed}
      />,
    );
    await fireEvent(view.getByTestId('radar-bar-body'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 293, height: 14 } },
    });
    return view;
  };

  const flatStyle = (node: { props: { style?: unknown } }) =>
    Object.assign({}, ...[node.props.style].flat(3).filter(Boolean));

  it('el recipiente lleno y el tramo de más son dos piezas; no queda nada sin asignar', async () => {
    const view = await renderWithTheme(
      <RadarBar registeredIncome={1_200_000} spent={520_000} committed={715_000} />,
    );

    expect(view.getByTestId('radar-bar-vessel')).toBeTruthy();
    expect(view.getByTestId('radar-bar-excess')).toBeTruthy();
    expect(view.getByTestId('radar-bar-spent')).toBeTruthy();
    expect(view.getByTestId('radar-bar-committed')).toBeTruthy();
    expect(view.queryByTestId('radar-bar-unassigned')).toBeNull();
  });

  it('la etiqueta lleva la cifra exacta y el corchete rotula los ingresos', async () => {
    const view = await renderWithTheme(
      <RadarBar registeredIncome={1_200_000} spent={520_000} committed={715_000} />,
    );

    expect(view.getByText('$35.000 de más')).toBeTruthy();
    expect(view.getByText('Tus ingresos registrados')).toBeTruthy();
    expect(view.getByTestId('radar-bar-excess-stick')).toBeTruthy();
    expect(view.getByTestId('radar-bar-bracket')).toBeTruthy();
  });

  it('el tramo de más mide lo que le toca a escala', async () => {
    const view = await measured({ income: 1_200_000, spent: 520_000, committed: 715_000 });

    // 35.000 / 1.235.000 de (293 - 3) = 8,22px
    expect(flatStyle(view.getByTestId('radar-bar-excess')).width).toBeCloseTo(8.22, 1);
  });

  it('si a escala mide menos de 6px se dibuja con 6px, y la etiqueta sigue diciendo la cifra', async () => {
    const view = await measured({ income: 1_200_000, spent: 500_000, committed: 705_000 });

    expect(flatStyle(view.getByTestId('radar-bar-excess')).width).toBe(6);
    expect(view.getByText('$5.000 de más')).toBeTruthy();
  });

  it('el exceso es ámbar, nunca rojo (§15)', async () => {
    const view = await renderWithTheme(
      <RadarBar registeredIncome={1_200_000} spent={520_000} committed={715_000} />,
    );

    const colors = [
      flatStyle(view.getByTestId('radar-bar-excess')).borderColor,
      flatStyle(view.getByText('$35.000 de más')).color,
    ];
    const ambers = [colorSchemes.light.excess, colorSchemes.dark.excess];
    for (const color of colors) expect(ambers).toContain(color);
  });

  it('el valor accesible dice cuánto se pasa, en palabras', async () => {
    const view = await renderWithTheme(
      <RadarBar registeredIncome={1_200_000} spent={520_000} committed={715_000} />,
    );

    expect(
      view.getByLabelText('Destino de tus ingresos registrados').props.accessibilityValue,
    ).toEqual({
      text: 'Gastado $520.000, Comprometido $715.000, $35.000 por encima de los $1.200.000 registrados',
    });
  });

  it('en el caso normal no hay etiqueta, ni tramo, ni corchete', async () => {
    const view = await renderWithTheme(
      <RadarBar registeredIncome={1_200_000} spent={320_000} committed={480_000} />,
    );

    expect(view.queryByTestId('radar-bar-excess')).toBeNull();
    expect(view.queryByTestId('radar-bar-bracket')).toBeNull();
    expect(view.queryByText(/de más/)).toBeNull();
  });

  it('CA-03 · sin ingresos tampoco hay tramo ni etiqueta', async () => {
    const view = await renderWithTheme(
      <RadarBar registeredIncome={0} spent={535_000} committed={0} />,
    );

    expect(view.queryByTestId('radar-bar-excess')).toBeNull();
    expect(view.queryByText(/de más/)).toBeNull();
  });
});
