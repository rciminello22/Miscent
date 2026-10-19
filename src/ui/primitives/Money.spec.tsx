import { renderWithTheme } from '@/test/render';
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

  it('nunca abrevia', async () => {
    const view = await renderWithTheme(<Money amount={1_234_567} variant="display" />);

    expect(view.getByText('$1.234.567')).toBeTruthy();
    expect(view.queryByText(/\bM\b/)).toBeNull();
  });
});
