import { Text } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { renderWithTheme } from '@/test/render';
import { Disclosure } from './Disclosure';

/**
 * UX-05 · la fila plegable del espacio: el título dice cuánto hay adentro y
 * el contenido solo se ve abierta.
 */
describe('Disclosure', () => {
  it('plegada muestra el título y esconde el contenido', async () => {
    const view = await renderWithTheme(
      <Disclosure title="3 cosas para completar o revisar" open={false} onToggle={() => {}}>
        <Text>contenido</Text>
      </Disclosure>,
    );

    expect(view.getByText('3 cosas para completar o revisar')).toBeTruthy();
    expect(view.queryByText('contenido')).toBeNull();
  });

  it('abierta muestra el contenido y lo anuncia como expandida', async () => {
    const view = await renderWithTheme(
      <Disclosure title="Ver detalle del mes" open onToggle={() => {}}>
        <Text>contenido</Text>
      </Disclosure>,
    );

    expect(view.getByText('contenido')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Ver detalle del mes', expanded: true })).toBeTruthy();
  });

  it('tocar la fila avisa', async () => {
    const onToggle = jest.fn();
    const view = await renderWithTheme(
      <Disclosure title="Ver detalle del mes" open={false} onToggle={onToggle}>
        <Text>contenido</Text>
      </Disclosure>,
    );

    await fireEvent.press(view.getByRole('button', { name: 'Ver detalle del mes' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
