import { useState } from 'react';
import { renderWithTheme, fireEvent } from '@/test/render';
import { MIN_TARGET } from '@/ui/touch';
import { Chip, InstallmentCountPicker, Segmented } from './fields';

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

/**
 * UX-06 · §17 campo 8 · "Cantidad (3, 6, 9, 12, 18, otra)".
 */

function PickerHarness({
  initial = null,
  onValue,
}: {
  initial?: number | null;
  onValue?: (value: number | null) => void;
}) {
  const [value, setValue] = useState<number | null>(initial);
  return (
    <InstallmentCountPicker
      value={value}
      onChange={(next) => {
        setValue(next);
        onValue?.(next);
      }}
    />
  );
}

describe('UX-06 · InstallmentCountPicker', () => {
  it('ofrece los chips de siempre más "Otra"', async () => {
    const view = await renderWithTheme(<PickerHarness />);

    for (const label of ['3', '6', '9', '12', '18', 'Otra']) {
      expect(view.getByRole('radio', { name: label })).toBeTruthy();
    }
    expect(view.queryByLabelText('Cantidad de cuotas')).toBeNull();
  });

  it('"Otra" abre un campo numérico y 24 se puede cargar', async () => {
    const onValue = jest.fn();
    const view = await renderWithTheme(<PickerHarness onValue={onValue} />);

    await fireEvent.press(view.getByRole('radio', { name: 'Otra' }));
    const input = view.getByLabelText('Cantidad de cuotas');
    await fireEvent.changeText(input, '24');

    expect(onValue).toHaveBeenLastCalledWith(24);
    expect(view.getByRole('radio', { name: 'Otra', selected: true })).toBeTruthy();
    expect(view.queryByText('Para una sola cuota, desactivá En cuotas.')).toBeNull();
  });

  it('con 1 en "Otra" el hint de una sola cuota se muestra', async () => {
    const onValue = jest.fn();
    const view = await renderWithTheme(<PickerHarness onValue={onValue} />);

    await fireEvent.press(view.getByRole('radio', { name: 'Otra' }));
    await fireEvent.changeText(view.getByLabelText('Cantidad de cuotas'), '1');

    expect(onValue).toHaveBeenLastCalledWith(1);
    expect(view.getByText('Para una sola cuota, desactivá En cuotas.')).toBeTruthy();
  });

  it('con más de 36 explica el tope', async () => {
    const view = await renderWithTheme(<PickerHarness />);

    await fireEvent.press(view.getByRole('radio', { name: 'Otra' }));
    await fireEvent.changeText(view.getByLabelText('Cantidad de cuotas'), '50');

    expect(view.getByText('Hasta 36 cuotas.')).toBeTruthy();
  });

  it('elegir un chip cierra el campo y elige ese número', async () => {
    const onValue = jest.fn();
    const view = await renderWithTheme(<PickerHarness onValue={onValue} />);

    await fireEvent.press(view.getByRole('radio', { name: 'Otra' }));
    await fireEvent.changeText(view.getByLabelText('Cantidad de cuotas'), '24');
    await fireEvent.press(view.getByRole('radio', { name: '6' }));

    expect(onValue).toHaveBeenLastCalledWith(6);
    expect(view.queryByLabelText('Cantidad de cuotas')).toBeNull();
    expect(view.getByRole('radio', { name: '6', selected: true })).toBeTruthy();
  });

  it('tocar "Otra" de nuevo la desarma y deja sin cuotas', async () => {
    const onValue = jest.fn();
    const view = await renderWithTheme(<PickerHarness onValue={onValue} />);

    await fireEvent.press(view.getByRole('radio', { name: 'Otra' }));
    await fireEvent.changeText(view.getByLabelText('Cantidad de cuotas'), '24');
    await fireEvent.press(view.getByRole('radio', { name: 'Otra' }));

    expect(onValue).toHaveBeenLastCalledWith(null);
    expect(view.queryByLabelText('Cantidad de cuotas')).toBeNull();
  });

  it('un valor que no es de los chips arranca con "Otra" abierta', async () => {
    const view = await renderWithTheme(<PickerHarness initial={24} />);

    expect(view.getByRole('radio', { name: 'Otra', selected: true })).toBeTruthy();
    expect(view.getByLabelText('Cantidad de cuotas').props.value).toBe('24');
  });
});
