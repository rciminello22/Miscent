import { renderWithTheme, fireEvent } from '@/test/render';
import { MIN_TARGET } from '@/ui/touch';
import { Chip, Segmented } from './fields';

/**
 * UX-11 · UX-12 · los chips: lo elegido lleva un segundo portador además del
 * color (un tilde) y todos se tocan con 44pt de alto efectivo.
 */

function verticalSize(visual: number, slop: { top: number; bottom: number } | undefined) {
  return visual + (slop?.top ?? 0) + (slop?.bottom ?? 0);
}

describe('UX-11 · Chip', () => {
  it('el chip elegido lleva tilde y se anuncia como elegido', async () => {
    const view = await renderWithTheme(<Chip label="Comida" selected onPress={() => {}} />);

    expect(view.getByTestId('chip-selected')).toBeTruthy();
    expect(view.getByRole('radio', { name: 'Comida', selected: true })).toBeTruthy();
  });

  it('el chip sin elegir no lleva tilde', async () => {
    const view = await renderWithTheme(<Chip label="Comida" selected={false} onPress={() => {}} />);

    expect(view.queryByTestId('chip-selected')).toBeNull();
    expect(view.getByRole('radio', { name: 'Comida', selected: false })).toBeTruthy();
  });

  it('UX-12 · el chip de 38 de alto se toca con al menos 44', async () => {
    const onPress = jest.fn();
    const view = await renderWithTheme(<Chip label="Comida" selected={false} onPress={onPress} />);
    const chip = view.getByRole('radio', { name: 'Comida' });

    expect(verticalSize(38, chip.props.hitSlop)).toBeGreaterThanOrEqual(MIN_TARGET);
    await fireEvent.press(chip);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('UX-12 · Segmented', () => {
  it('cada segmento de 38 se toca con al menos 44', async () => {
    const view = await renderWithTheme(
      <Segmented
        options={[
          { value: 'a', label: 'Uno' },
          { value: 'b', label: 'Dos' },
        ]}
        value="a"
        onChange={() => {}}
      />,
    );

    expect(verticalSize(38, view.getByRole('tab', { name: 'Uno' }).props.hitSlop)).toBeGreaterThanOrEqual(
      MIN_TARGET,
    );
  });
});
