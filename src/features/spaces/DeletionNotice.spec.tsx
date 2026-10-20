import { fireEvent, renderWithTheme } from '@/test/render';
import { DeletionNotice } from './DeletionNotice';

/**
 * P27 · el aviso de lo que eliminó el otro: una línea que se toca para abrir la
 * actividad reciente. Sin decisiones: eliminar no pide aprobación (K3).
 */

const TEXT = 'Martina eliminó Super · $100.000 · ayer (y 2 más)';

describe('DeletionNotice', () => {
  it('dice lo que pasó, tal como lo armó el copy', async () => {
    const view = await renderWithTheme(<DeletionNotice text={TEXT} onPress={jest.fn()} />);

    expect(view.getByText(TEXT)).toBeTruthy();
  });

  it('se toca para ver la actividad reciente', async () => {
    const onPress = jest.fn();
    const view = await renderWithTheme(<DeletionNotice text={TEXT} onPress={onPress} />);

    await fireEvent.press(view.getByRole('button', { name: `${TEXT}. Ver la actividad reciente` }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('no ofrece aprobar ni rechazar nada', async () => {
    const view = await renderWithTheme(<DeletionNotice text={TEXT} onPress={jest.fn()} />);

    expect(view.getAllByRole('button')).toHaveLength(1);
    expect(view.queryByText(/Aprobar|Rechazar|Deshacer/)).toBeNull();
  });
});
