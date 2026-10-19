import { fireEvent, renderWithTheme } from '@/test/render';
import type { FormerSpaceRow } from './formerSpaces';
import { FormerSpacesList } from './FormerSpacesList';

/**
 * Quitar un espacio de tu historial · la sección "Espacios que dejaste" de
 * Perfil: una fila por espacio, con su "Quitar". Si quedan cuotas por venir, el
 * botón está apagado y la frase del motivo se ve en la fila.
 */

const free: FormerSpaceRow = {
  spaceId: 'gonzalo',
  name: 'Con gonzalo',
  leftOn: '2026-10-12',
  leftLine: 'Saliste el 12 de octubre',
  blockedLine: null,
  canRemove: true,
};

const blocked: FormerSpaceRow = {
  spaceId: 'viaje',
  name: 'Viaje',
  leftOn: '2026-09-02',
  leftLine: 'Saliste el 2 de septiembre',
  blockedLine: 'Todavía quedan cuotas de Viaje hasta marzo: cuando terminen la vas a poder quitar.',
  canRemove: false,
};

describe('FormerSpacesList', () => {
  it('sin espacios dejados la sección no existe', async () => {
    const view = await renderWithTheme(<FormerSpacesList rows={[]} onRemove={jest.fn()} />);

    expect(view.queryByText('Espacios que dejaste')).toBeNull();
    expect(view.queryByRole('button')).toBeNull();
  });

  it('una fila por espacio: el nombre, "Saliste el 12 de octubre" y "Quitar"', async () => {
    const view = await renderWithTheme(<FormerSpacesList rows={[free]} onRemove={jest.fn()} />);

    expect(view.getByText('Espacios que dejaste')).toBeTruthy();
    expect(view.getByText('Con gonzalo')).toBeTruthy();
    expect(view.getByText('Saliste el 12 de octubre')).toBeTruthy();
    expect(view.getByText('Quitar')).toBeTruthy();
    expect(view.queryByText(/Todavía quedan cuotas/)).toBeNull();
  });

  it('"Quitar" avisa de qué espacio se trata', async () => {
    const onRemove = jest.fn();
    const view = await renderWithTheme(<FormerSpacesList rows={[free, blocked]} onRemove={onRemove} />);

    await fireEvent.press(view.getByRole('button', { name: 'Quitar Con gonzalo de tu historial' }));

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith('gonzalo');
  });

  it('con cuotas por venir: el botón apagado, la frase a la vista y tocarlo no hace nada', async () => {
    const onRemove = jest.fn();
    const view = await renderWithTheme(<FormerSpacesList rows={[blocked]} onRemove={onRemove} />);

    const button = view.getByRole('button', { name: 'Quitar Viaje de tu historial' });
    expect(button.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
    expect(button.props.accessibilityHint).toBe(blocked.blockedLine);
    expect(
      view.getByText(
        'Todavía quedan cuotas de Viaje hasta marzo: cuando terminen la vas a poder quitar.',
      ),
    ).toBeTruthy();

    await fireEvent.press(button);
    expect(onRemove).not.toHaveBeenCalled();
  });

  it('cada fila lleva lo suyo: uno se puede quitar y el otro no', async () => {
    const view = await renderWithTheme(<FormerSpacesList rows={[free, blocked]} onRemove={jest.fn()} />);

    const own = view.getByRole('button', { name: 'Quitar Con gonzalo de tu historial' });
    expect(own.props.accessibilityState).toEqual(expect.objectContaining({ disabled: false }));
    expect(view.getAllByText(/Todavía quedan cuotas/)).toHaveLength(1);
  });
});
