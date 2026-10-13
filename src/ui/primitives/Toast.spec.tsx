import { Pressable, Text } from 'react-native';
import { act, fireEvent } from '@testing-library/react-native';
import { renderWithTheme } from '@/test/render';
import { ToastProvider, useToast, type ToastInput } from './Toast';

/**
 * Nivel 3 · el aviso después de guardar o eliminar (§17, §12).
 *
 * Vive en la raíz de la app y no en la pantalla que guardó: Agregar se cierra
 * al guardar, y el aviso (con su "Deshacer") tiene que sobrevivirla.
 */

function Trigger({ input, label = 'Mostrar' }: { input: ToastInput; label?: string }) {
  const toast = useToast();
  return (
    <Pressable accessibilityRole="button" onPress={() => toast.show(input)}>
      <Text>{label}</Text>
    </Pressable>
  );
}

async function renderTrigger(...triggers: { input: ToastInput; label?: string }[]) {
  return renderWithTheme(
    <ToastProvider>
      {triggers.map((trigger) => (
        <Trigger key={trigger.label ?? 'Mostrar'} {...trigger} />
      ))}
    </ToastProvider>,
  );
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('Toast', () => {
  it('muestra el título y el detalle', async () => {
    const view = await renderTrigger({
      input: { title: 'Guardado · Solo vos lo ves', detail: 'Se paga en noviembre.' },
    });

    await fireEvent.press(view.getByRole('button', { name: 'Mostrar' }));

    expect(view.getByText('Guardado · Solo vos lo ves')).toBeTruthy();
    expect(view.getByText('Se paga en noviembre.')).toBeTruthy();
  });

  it('"Deshacer" corre la acción y cierra el aviso', async () => {
    const onUndo = jest.fn();
    const view = await renderTrigger({
      input: {
        title: 'Agregado a Casa · Martina lo ve',
        action: { label: 'Deshacer', onPress: onUndo },
      },
    });

    await fireEvent.press(view.getByRole('button', { name: 'Mostrar' }));
    await fireEvent.press(view.getByRole('button', { name: 'Deshacer' }));

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(view.queryByText('Agregado a Casa · Martina lo ve')).toBeNull();
  });

  it('se va solo después de unos segundos', async () => {
    const view = await renderTrigger({ input: { title: 'Guardado · Solo vos lo ves' } });

    await fireEvent.press(view.getByRole('button', { name: 'Mostrar' }));
    await act(() => jest.advanceTimersByTime(10_000));

    expect(view.queryByText('Guardado · Solo vos lo ves')).toBeNull();
  });

  it('uno nuevo reemplaza al anterior: nunca se apilan', async () => {
    const view = await renderTrigger(
      { input: { title: 'Primero' }, label: 'Uno' },
      { input: { title: 'Segundo' }, label: 'Dos' },
    );

    await fireEvent.press(view.getByRole('button', { name: 'Uno' }));
    await fireEvent.press(view.getByRole('button', { name: 'Dos' }));

    expect(view.queryByText('Primero')).toBeNull();
    expect(view.getByText('Segundo')).toBeTruthy();
  });

  it('un error se anuncia como alerta, para el lector de pantalla', async () => {
    const view = await renderTrigger({
      input: { title: 'No pudimos eliminarlo', detail: 'Probá de nuevo en un momento.', tone: 'error' },
    });

    await fireEvent.press(view.getByRole('button', { name: 'Mostrar' }));

    expect(view.getByRole('alert')).toBeTruthy();
  });
});
