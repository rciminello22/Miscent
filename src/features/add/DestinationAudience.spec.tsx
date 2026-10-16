import { colorSchemes } from '@/ui/colors';
import { renderWithTheme } from '@/test/render';
import type { Audience } from '@/ui/primitives';
import { DestinationAudience } from './DestinationAudience';

/**
 * Decisión 6B · §12 y §17 · la audiencia queda pegada a la elección del
 * destino, con un ícono: una persona para "Solo vos lo ves", dos (en el color de
 * lo compartido) para "Lo ven vos y Martina". La del pie junto a Guardar sigue
 * (SaveFooter): esta es la que se lee al ELEGIR.
 */

const PRIVATE: Audience = { kind: 'private' };
const SHARED: Audience = { kind: 'shared', otherMemberName: 'Martina' };

const iconColor = (node: { props: { color?: string } }) => node.props.color;

describe('DestinationAudience', () => {
  it('lo personal dice "Solo vos lo ves" con el ícono de una persona', async () => {
    const view = await renderWithTheme(<DestinationAudience audience={PRIVATE} />);

    expect(view.getByText('Solo vos lo ves')).toBeTruthy();
    expect(view.getByTestId('destination-audience-icon-private')).toBeTruthy();
    expect(view.queryByTestId('destination-audience-icon-shared')).toBeNull();
  });

  it('lo compartido nombra a quien lo ve, con el ícono de dos personas', async () => {
    const view = await renderWithTheme(<DestinationAudience audience={SHARED} />);

    expect(view.getByText('Lo ven vos y Martina')).toBeTruthy();
    expect(view.getByTestId('destination-audience-icon-shared')).toBeTruthy();
    expect(view.queryByTestId('destination-audience-icon-private')).toBeNull();
    expect(view.queryByText('Solo vos lo ves')).toBeNull();
  });

  it('lo compartido se pinta con el color de lo compartido; lo personal, no', async () => {
    const shared = await renderWithTheme(<DestinationAudience audience={SHARED} />);
    const sharedColors = [colorSchemes.light.shared, colorSchemes.dark.shared];
    expect(sharedColors).toContain(
      iconColor(shared.getByTestId('destination-audience-icon-shared')),
    );

    const priv = await renderWithTheme(<DestinationAudience audience={PRIVATE} />);
    expect(sharedColors).not.toContain(
      iconColor(priv.getByTestId('destination-audience-icon-private')),
    );
  });

  it('cambia en el lugar al cambiar el destino (de personal a un espacio y de vuelta)', async () => {
    const view = await renderWithTheme(<DestinationAudience audience={PRIVATE} />);
    expect(view.getByText('Solo vos lo ves')).toBeTruthy();

    await view.rerender(<DestinationAudience audience={SHARED} />);
    expect(view.getByText('Lo ven vos y Martina')).toBeTruthy();
    expect(view.queryByText('Solo vos lo ves')).toBeNull();

    await view.rerender(<DestinationAudience audience={PRIVATE} />);
    expect(view.getByText('Solo vos lo ves')).toBeTruthy();
  });

  it('es una línea que se anuncia al cambiar el destino', async () => {
    const view = await renderWithTheme(<DestinationAudience audience={SHARED} />);

    expect(view.getByText('Lo ven vos y Martina').props.accessibilityLiveRegion).toBe('polite');
  });
});
