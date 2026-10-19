import { StyleSheet } from 'react-native';
import { renderWithTheme } from '@/test/render';
import { colorSchemes } from '../colors';
import { Money } from './Money';

/**
 * Nivel 3 · las cifras grandes entran en una línea y se achican solas hasta
 * 20pt, sin abreviar. Las chicas no se tocan.
 */

describe('Money · cifras que se ajustan', () => {
  it('display: una línea, se achica hasta 20pt y la cifra sale completa', async () => {
    const view = await renderWithTheme(<Money amount={999_999_999} variant="display" />);
    const text = view.getByText('$999.999.999');

    expect(text.props.numberOfLines).toBe(1);
    expect(text.props.adjustsFontSizeToFit).toBe(true);
    expect(text.props.minimumFontScale * 34).toBeCloseTo(20, 5);
  });

  it('title: también se ajusta', async () => {
    const view = await renderWithTheme(<Money amount={999_999_999} variant="title" />);
    const text = view.getByText('$999.999.999');

    expect(text.props.adjustsFontSizeToFit).toBe(true);
    expect(text.props.minimumFontScale * 24).toBeCloseTo(20, 5);
  });

  it('una cifra de fila no se ajusta: cede el texto vecino, no el monto', async () => {
    const view = await renderWithTheme(<Money amount={4_500} variant="bodyMedium" />);
    const text = view.getByText('$4.500');

    expect(text.props.adjustsFontSizeToFit).toBeUndefined();
    expect(text.props.numberOfLines).toBeUndefined();
  });

  it('15 · sign="out": el menos tipográfico, en texto normal (nunca rojo)', async () => {
    const view = await renderWithTheme(<Money amount={4_500} sign="out" variant="bodyMedium" />);
    const text = view.getByText('−$4.500');
    const style = StyleSheet.flatten(text.props.style);

    expect(style.color).toBe(colorSchemes.light.text);
    expect(style.color).not.toBe(colorSchemes.light.danger);
  });

  it('15 · sign="in": el más y el color brand', async () => {
    const view = await renderWithTheme(<Money amount={85_000} sign="in" variant="bodyMedium" />);
    const text = view.getByText('+$85.000');

    expect(StyleSheet.flatten(text.props.style).color).toBe(colorSchemes.light.brand);
  });

  it('15 · sin sign sigue como siempre (sin signo ni color)', async () => {
    const view = await renderWithTheme(<Money amount={4_500} variant="bodyMedium" />);

    expect(view.getByText('$4.500')).toBeTruthy();
    expect(view.queryByText(/[+−]/)).toBeNull();
  });

  it('15 · sign=null equivale a no pasar nada', async () => {
    const view = await renderWithTheme(<Money amount={4_500} sign={null} variant="bodyMedium" />);

    expect(view.getByText('$4.500')).toBeTruthy();
  });

  it('nunca abrevia', async () => {
    const view = await renderWithTheme(<Money amount={1_234_567} variant="display" />);

    expect(view.getByText('$1.234.567')).toBeTruthy();
    expect(view.queryByText(/\bM\b/)).toBeNull();
  });
});
