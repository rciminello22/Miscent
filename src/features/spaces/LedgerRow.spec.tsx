import { StyleSheet, type TextStyle } from 'react-native';
import { ArrowRightLeft, ShoppingCart } from 'lucide-react-native';
import { fireEvent, renderWithTheme } from '@/test/render';
import { colorSchemes } from '@/ui/colors';
import { LedgerRow } from './SpaceRows';

/**
 * 15 · la regla de signos dentro del espacio: la fila dice lo mismo que la de
 * Movimientos. "−" sale, "+" entra, solo lo que entra lleva color.
 */

const colorOf = (node: { props: { style?: unknown } }) =>
  StyleSheet.flatten(node.props.style as TextStyle).color;

describe('LedgerRow · la regla de signos', () => {
  it('un gasto: tu parte con "−" en texto normal y el total en gris, sin signo', async () => {
    const view = await renderWithTheme(
      <LedgerRow
        icon={ShoppingCart}
        title="Supermercado"
        amount={50_000}
        sign="out"
        ofTotal={100_000}
        speech="gasto de $50.000"
        onPress={jest.fn()}
      />,
    );

    expect(colorOf(view.getByText('−$50.000'))).toBe(colorSchemes.light.text);
    expect(view.getByText('de $100.000')).toBeTruthy();
    expect(view.queryByText(/[+−]\$100\.000/)).toBeNull();
  });

  it('un pago recibido: "+" en brand, con el ⇄ en un recuadro teal a la izquierda', async () => {
    const view = await renderWithTheme(
      <LedgerRow
        icon={ArrowRightLeft}
        iconTone="shared"
        title="Martina te pagó"
        caption="Entre ustedes · no cambia tu radar"
        amount={20_000}
        sign="in"
        speech="te pagaron $20.000"
      />,
    );

    expect(colorOf(view.getByText('+$20.000'))).toBe(colorSchemes.light.brand);
    expect(StyleSheet.flatten(view.getByTestId('ledger-icon').props.style).backgroundColor).toBe(
      colorSchemes.light.sharedSoft,
    );
    expect(view.getByText('Entre ustedes · no cambia tu radar')).toBeTruthy();
  });

  it('un pago hecho por vos: "−", sin color', async () => {
    const view = await renderWithTheme(
      <LedgerRow icon={ArrowRightLeft} iconTone="shared" title="Le pagaste a Martina" amount={20_000} sign="out" />,
    );

    expect(colorOf(view.getByText('−$20.000'))).toBe(colorSchemes.light.text);
  });

  it('lector de pantalla: las palabras, nunca "menos" ni "más"', async () => {
    const onPress = jest.fn();
    const view = await renderWithTheme(
      <LedgerRow
        icon={ArrowRightLeft}
        title="Martina te pagó"
        caption="Entre ustedes · no cambia tu radar"
        amount={20_000}
        sign="in"
        speech="te pagaron $20.000"
        onPress={onPress}
      />,
    );

    const row = view.getByRole('button', {
      name: 'Martina te pagó. te pagaron $20.000. Entre ustedes · no cambia tu radar',
    });
    await fireEvent.press(row);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('sin sign sigue como antes (totales por categoría: sin signo)', async () => {
    const view = await renderWithTheme(<LedgerRow icon={ShoppingCart} title="Hogar" amount={30_000} />);

    expect(view.getByText('$30.000')).toBeTruthy();
  });
});
