import { fireEvent } from '@testing-library/react-native';
import { renderWithTheme } from '@/test/render';
import { DeletedWhileEditing } from './DeletedWhileEditing';

/**
 * Nivel 3 · SY-02 · "Si el otro eliminó un registro mientras se edita:
 * 'Martina eliminó este gasto. ¿Querés volver a crearlo?'"
 *
 * El nombre sale del registro de borrados, no de una suposición: si lo
 * eliminó el propio usuario desde otro teléfono, culpar al otro convierte a
 * la app en árbitro de la pareja (§39).
 */

const base = {
  otherName: 'Martina',
  spaceName: 'Casa',
  recreating: false,
  onRecreate: () => {},
  onDiscard: () => {},
};

describe('DeletedWhileEditing · SY-02', () => {
  it('si lo eliminó el otro miembro, lo nombra', async () => {
    const view = await renderWithTheme(<DeletedWhileEditing {...base} deletedBy="other" />);
    expect(view.getByText('Martina eliminó este gasto. ¿Querés volver a crearlo?')).toBeTruthy();
  });

  it('si lo eliminó el propio usuario en otro lado, no culpa al otro', async () => {
    const view = await renderWithTheme(<DeletedWhileEditing {...base} deletedBy="me" />);
    expect(
      view.getByText('Eliminaste este gasto desde otro dispositivo. ¿Querés volver a crearlo?'),
    ).toBeTruthy();
    expect(view.queryByText(/Martina eliminó/)).toBeNull();
  });

  it('si no se sabe quién, no inventa a nadie', async () => {
    const view = await renderWithTheme(<DeletedWhileEditing {...base} deletedBy="unknown" />);
    expect(view.getByText('Este gasto ya no está en Casa. ¿Querés volver a crearlo?')).toBeTruthy();
  });

  it('PR-03 · aclara quién va a verlo si se vuelve a crear', async () => {
    const view = await renderWithTheme(<DeletedWhileEditing {...base} deletedBy="other" />);
    expect(view.getByText(/Martina lo va a ver/)).toBeTruthy();
  });

  it('las dos salidas: volver a crearlo o descartar', async () => {
    const onRecreate = jest.fn();
    const onDiscard = jest.fn();
    const view = await renderWithTheme(
      <DeletedWhileEditing {...base} deletedBy="other" onRecreate={onRecreate} onDiscard={onDiscard} />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'Volver a crearlo' }));
    await fireEvent.press(view.getByRole('button', { name: 'Descartar' }));

    expect(onRecreate).toHaveBeenCalledTimes(1);
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });
});
