import { fireEvent, renderWithTheme } from '@/test/render';
import type { FormerSpaceRow } from './formerSpaces';
import { FormerSpacesList } from './FormerSpacesList';

/**
 * "Espacios que dejaste" (N3, P26): una tarjeta por espacio, con el resumen fijo
 * del saldo al salir (P6) y su "Quitar de tu historial", siempre disponible.
 */

const gonzalo: FormerSpaceRow = {
  spaceId: 'gonzalo',
  name: 'Con gonzalo',
  leftOn: '2026-10-12',
  leftLine: 'Saliste el 12 de octubre',
  otherName: 'Gonzalo',
  balanceLine: 'Al salir, Gonzalo te debía $12.000.',
};

const viaje: FormerSpaceRow = {
  spaceId: 'viaje',
  name: 'Viaje',
  leftOn: '2026-09-02',
  leftLine: 'Saliste el 2 de septiembre',
  otherName: 'Martina',
  balanceLine: 'Al salir, estaban a mano.',
};

describe('FormerSpacesList', () => {
  it('sin espacios dejados lo dice y no ofrece nada', async () => {
    const view = await renderWithTheme(<FormerSpacesList rows={[]} keepsFuture onRemove={jest.fn()} />);

    expect(view.getByText('No tenés espacios dejados en tu historial.')).toBeTruthy();
    expect(view.queryByRole('button')).toBeNull();
  });

  it('una tarjeta por espacio: el nombre, "Saliste el …" y la frase fija del saldo', async () => {
    const view = await renderWithTheme(
      <FormerSpacesList rows={[gonzalo, viaje]} keepsFuture onRemove={jest.fn()} />,
    );

    expect(view.getByText('Con gonzalo')).toBeTruthy();
    expect(view.getByText('Saliste el 12 de octubre')).toBeTruthy();
    expect(view.getByText('Al salir, Gonzalo te debía $12.000.')).toBeTruthy();
    expect(view.getByText('Viaje')).toBeTruthy();
    expect(view.getByText('Al salir, estaban a mano.')).toBeTruthy();
  });

  it('con cuenta personal, aclara que tu parte de las cuotas sigue en Futuro', async () => {
    const view = await renderWithTheme(<FormerSpacesList rows={[gonzalo]} keepsFuture onRemove={jest.fn()} />);

    expect(
      view.getByText(
        'Tu parte de las cuotas que quedaban sigue en tu Futuro. Lo que cambie después lo ve Gonzalo.',
      ),
    ).toBeTruthy();
  });

  it('sin cuenta personal no hay Futuro que nombrar', async () => {
    const view = await renderWithTheme(
      <FormerSpacesList rows={[gonzalo]} keepsFuture={false} onRemove={jest.fn()} />,
    );

    expect(view.getByText('Lo que cambie después lo ve Gonzalo.')).toBeTruthy();
    expect(view.queryByText(/Futuro/)).toBeNull();
  });

  it('"Quitar de tu historial" avisa de qué espacio se trata', async () => {
    const onRemove = jest.fn();
    const view = await renderWithTheme(
      <FormerSpacesList rows={[gonzalo, viaje]} keepsFuture onRemove={onRemove} />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'Quitar Con gonzalo de tu historial' }));

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith('gonzalo');
  });

  it('todos los "Quitar" están activos: ya no hay espacios bloqueados', async () => {
    const view = await renderWithTheme(
      <FormerSpacesList rows={[gonzalo, viaje]} keepsFuture onRemove={jest.fn()} />,
    );

    for (const name of ['Quitar Con gonzalo de tu historial', 'Quitar Viaje de tu historial']) {
      const button = view.getByRole('button', { name });
      expect(button.props.accessibilityState).toEqual(expect.objectContaining({ disabled: false }));
    }
  });
});
