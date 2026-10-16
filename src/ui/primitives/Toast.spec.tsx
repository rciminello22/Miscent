import { Keyboard, Pressable, Text } from 'react-native';
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

  it('con dos acciones, cada una corre lo suyo y cierra el aviso', async () => {
    const onSeeFuture = jest.fn();
    const onUndo = jest.fn();
    const input: ToastInput = {
      title: 'Guardado · Solo vos lo ves',
      detail: '6 cuotas de $50.000 · la primera suma a noviembre',
      actions: [
        { label: 'Ver en Futuro', onPress: onSeeFuture },
        { label: 'Deshacer', onPress: onUndo },
      ],
    };
    const view = await renderTrigger({ input });

    await fireEvent.press(view.getByRole('button', { name: 'Mostrar' }));
    expect(view.getByRole('button', { name: 'Ver en Futuro' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'Deshacer' })).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Ver en Futuro' }));
    expect(onSeeFuture).toHaveBeenCalledTimes(1);
    expect(onUndo).not.toHaveBeenCalled();
    expect(view.queryByText('Guardado · Solo vos lo ves')).toBeNull();
  });

  it('con dos acciones, la otra también se puede tocar', async () => {
    const onUndo = jest.fn();
    const view = await renderTrigger({
      input: {
        title: 'Guardado · Solo vos lo ves',
        actions: [
          { label: 'Ver en Futuro', onPress: jest.fn() },
          { label: 'Deshacer', onPress: onUndo },
        ],
      },
    });

    await fireEvent.press(view.getByRole('button', { name: 'Mostrar' }));
    await fireEvent.press(view.getByRole('button', { name: 'Deshacer' }));

    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('con acciones se queda el tiempo de leer y decidir (más que uno sin ellas)', async () => {
    const view = await renderTrigger({
      input: {
        title: 'Con acciones',
        actions: [
          { label: 'Ver en Futuro', onPress: jest.fn() },
          { label: 'Deshacer', onPress: jest.fn() },
        ],
      },
    });

    await fireEvent.press(view.getByRole('button', { name: 'Mostrar' }));
    await act(() => jest.advanceTimersByTime(5_000));

    expect(view.getByText('Con acciones')).toBeTruthy();
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

  describe('UX-09 · el teclado no tapa un error', () => {
    // El toast se ancla abajo; con el teclado numérico abierto quedaría detrás.
    it('un error cierra el teclado para que el aviso se vea', async () => {
      const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
      const view = await renderTrigger({
        input: { title: 'No pudimos guardarlo', tone: 'error' },
      });

      await fireEvent.press(view.getByRole('button', { name: 'Mostrar' }));

      expect(dismiss).toHaveBeenCalledTimes(1);
      dismiss.mockRestore();
    });

    it('un aviso normal NO toca el teclado: se muestra al navegar a otra pantalla', async () => {
      const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
      const view = await renderTrigger({ input: { title: 'Guardado · Solo vos lo ves' } });

      await fireEvent.press(view.getByRole('button', { name: 'Mostrar' }));

      expect(dismiss).not.toHaveBeenCalled();
      dismiss.mockRestore();
    });
  });
});
