import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, renderWithTheme, waitFor } from '@/test/render';
import { DOT_HELP_FLAG, DotHelp } from './DotHelp';

/**
 * Explicar el punto: la ayuda aparece UNA sola vez, y solo si hay un punto a la
 * vista. "Entendido" la cierra y la marca queda guardada.
 */

const HELP = 'El punto debajo de un día indica que registraste algo ese día.';

describe('DotHelp · qué significa el punto', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('la primera vez explica el punto', async () => {
    const view = await renderWithTheme(<DotHelp recordDays={4} />);

    await waitFor(() => expect(view.getByText(HELP)).toBeTruthy());
    expect(view.getByRole('button', { name: 'Entendido' })).toBeTruthy();
  });

  it('"Entendido" la cierra y se recuerda', async () => {
    const view = await renderWithTheme(<DotHelp recordDays={4} />);
    await waitFor(() => expect(view.getByText(HELP)).toBeTruthy());

    await fireEvent.press(view.getByRole('button', { name: 'Entendido' }));

    expect(view.queryByText(HELP)).toBeNull();
    expect(await AsyncStorage.getItem(DOT_HELP_FLAG)).toBe('1');
  });

  it('una sola vez: al volver a abrir la pantalla ya no aparece', async () => {
    const first = await renderWithTheme(<DotHelp recordDays={4} />);
    await waitFor(() => expect(first.getByText(HELP)).toBeTruthy());
    await fireEvent.press(first.getByRole('button', { name: 'Entendido' }));
    await first.unmount();

    const second = await renderWithTheme(<DotHelp recordDays={4} />);
    // Espera a que lea la marca guardada: si no hubiera ayuda que mostrar, nada aparece.
    await waitFor(async () => expect(await AsyncStorage.getItem(DOT_HELP_FLAG)).toBe('1'));
    await waitFor(() => expect(second.queryByText(HELP)).toBeNull());
    expect(second.queryByRole('button', { name: 'Entendido' })).toBeNull();
  });

  it('sin ningún punto a la vista no aparece (y no gasta la única vez)', async () => {
    const view = await renderWithTheme(<DotHelp recordDays={0} />);

    await waitFor(() => expect(view.queryByText(HELP)).toBeNull());
    expect(await AsyncStorage.getItem(DOT_HELP_FLAG)).toBeNull();
  });
});
