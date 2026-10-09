import { fireEvent } from '@testing-library/react-native';
import { renderWithTheme } from '@/test/render';
import { MagicLinkStatusView } from './MagicLinkStatusView';

/**
 * Nivel 3 · la pantalla a la que vuelve el enlace mágico (P1, CA-49).
 *
 * Mientras se arma la sesión, el usuario tiene que ver que algo está pasando.
 * Si el enlace no sirve, tiene que saberlo y tener la salida a mano: §13 O1
 * paso 4 · "Enlace vencido: 'Pedí uno nuevo'". Antes, un enlace vencido
 * dejaba al usuario en una pantalla sin explicación.
 */

describe('MagicLinkStatusView', () => {
  it('mientras entra, lo dice', async () => {
    const view = await renderWithTheme(<MagicLinkStatusView status={{ kind: 'pending' }} onRetry={() => {}} />);
    expect(view.getByText('Entrando…')).toBeTruthy();
    expect(view.queryByRole('button')).toBeNull();
  });

  it('si el enlace no sirve, muestra el motivo y la salida', async () => {
    const onRetry = jest.fn();
    const view = await renderWithTheme(
      <MagicLinkStatusView
        status={{ kind: 'failed', message: 'El enlace venció. Pedí uno nuevo.' }}
        onRetry={onRetry}
      />,
    );

    expect(view.getByText('El enlace venció. Pedí uno nuevo.')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Pedir un enlace nuevo' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
