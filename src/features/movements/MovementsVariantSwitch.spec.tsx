// TEMPORAL: variante B en prueba. Se borra junto con MovementsVariantSwitch.tsx.
import { fireEvent, renderWithTheme } from '@/test/render';
import { MovementsVariantSwitch } from './MovementsVariantSwitch';

describe('MovementsVariantSwitch · el interruptor temporal', () => {
  it('dice cuál variante está activa y ofrece la otra', async () => {
    const view = await renderWithTheme(<MovementsVariantSwitch variant="A" onToggle={jest.fn()} />);

    expect(view.getByText('Movimientos: variante A')).toBeTruthy();
    expect(view.getByText('Cambiar a B')).toBeTruthy();
  });

  it('con la B activa, ofrece volver a la A', async () => {
    const view = await renderWithTheme(<MovementsVariantSwitch variant="B" onToggle={jest.fn()} />);

    expect(view.getByText('Movimientos: variante B')).toBeTruthy();
    expect(view.getByText('Cambiar a A')).toBeTruthy();
  });

  it('al tocarlo, cambia', async () => {
    const onToggle = jest.fn();
    const view = await renderWithTheme(<MovementsVariantSwitch variant="A" onToggle={onToggle} />);

    await fireEvent.press(view.getByRole('switch', { name: 'Movimientos: variante A' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
