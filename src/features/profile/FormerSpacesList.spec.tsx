import { fireEvent, renderWithTheme } from '@/test/render';
import type { FormerSpaceRow } from './formerSpaces';
import { FormerSpacesList } from './FormerSpacesList';

/**
 * Quitar un espacio de tu historial · la sección "Espacios que dejaste" de
 * Perfil: una fila por espacio, con su "Quitar", siempre disponible (P26).
 */

const gonzalo: FormerSpaceRow = {
  spaceId: 'gonzalo',
  name: 'Con gonzalo',
  leftOn: '2026-10-12',
  leftLine: 'Saliste el 12 de octubre',
};

const viaje: FormerSpaceRow = {
  spaceId: 'viaje',
  name: 'Viaje',
  leftOn: '2026-09-02',
  leftLine: 'Saliste el 2 de septiembre',
};

describe('FormerSpacesList', () => {
  it('sin espacios dejados la sección no existe', async () => {
    const view = await renderWithTheme(<FormerSpacesList rows={[]} onRemove={jest.fn()} />);

    expect(view.queryByText('Espacios que dejaste')).toBeNull();
    expect(view.queryByRole('button')).toBeNull();
  });

  it('una fila por espacio: el nombre, "Saliste el 12 de octubre" y "Quitar"', async () => {
    const view = await renderWithTheme(<FormerSpacesList rows={[gonzalo]} onRemove={jest.fn()} />);

    expect(view.getByText('Espacios que dejaste')).toBeTruthy();
    expect(view.getByText('Con gonzalo')).toBeTruthy();
    expect(view.getByText('Saliste el 12 de octubre')).toBeTruthy();
    expect(view.getByText('Quitar')).toBeTruthy();
  });

  it('"Quitar" avisa de qué espacio se trata', async () => {
    const onRemove = jest.fn();
    const view = await renderWithTheme(<FormerSpacesList rows={[gonzalo, viaje]} onRemove={onRemove} />);

    await fireEvent.press(view.getByRole('button', { name: 'Quitar Con gonzalo de tu historial' }));

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith('gonzalo');
  });

  it('todos los "Quitar" están activos: ya no hay espacios bloqueados', async () => {
    const view = await renderWithTheme(<FormerSpacesList rows={[gonzalo, viaje]} onRemove={jest.fn()} />);

    for (const name of ['Quitar Con gonzalo de tu historial', 'Quitar Viaje de tu historial']) {
      const button = view.getByRole('button', { name });
      expect(button.props.accessibilityState).toEqual(expect.objectContaining({ disabled: false }));
    }
  });
});
