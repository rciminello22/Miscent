import { renderWithTheme, fireEvent } from '@/test/render';
import { Text } from 'react-native';
import { IconButton } from './IconButton';
import { RowChevron } from './RowChevron';
import { TextLink } from './TextLink';
import { Button } from './Button';
import { MIN_TARGET } from '../touch';

/**
 * UX-11 · UX-12 · las pistas de interactividad y las áreas de toque (§7 de la
 * auditoría): lo tocable se nota y mide al menos 44×44pt efectivos.
 */

type Slop = { top: number; bottom: number; left: number; right: number } | number | undefined;

function effectiveSize(visual: number, slop: Slop): number {
  const extra = typeof slop === 'number' ? slop : slop != null ? slop.top + slop.bottom : 0;
  return visual + extra;
}

// El chevron es decorativo (oculto al lector de pantalla): se busca incluyendo ocultos.
function chevrons(view: {
  queryAllByTestId: (id: string, options?: { includeHiddenElements: boolean }) => unknown[];
}) {
  return view.queryAllByTestId('chevron', { includeHiddenElements: true });
}

describe('UX-12 · IconButton', () => {
  it('un botón de ícono de 32 mide al menos 44 efectivos', async () => {
    const view = await renderWithTheme(
      <IconButton label="Perfil" size={32} icon={<Text>i</Text>} onPress={() => {}} />,
    );
    const button = view.getByLabelText('Perfil');

    expect(effectiveSize(32, button.props.hitSlop)).toBeGreaterThanOrEqual(MIN_TARGET);
  });

  it('el cerrar de 36 de los formularios también llega a 44', async () => {
    const view = await renderWithTheme(
      <IconButton label="Cerrar" icon={<Text>x</Text>} onPress={() => {}} />,
    );

    expect(effectiveSize(36, view.getByLabelText('Cerrar').props.hitSlop)).toBeGreaterThanOrEqual(
      MIN_TARGET,
    );
  });

  it('es un botón con nombre accesible y responde al toque', async () => {
    const onPress = jest.fn();
    const view = await renderWithTheme(
      <IconButton label="Cerrar" icon={<Text>x</Text>} onPress={onPress} />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'Cerrar' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('UX-11 · TextLink', () => {
  it('es un botón con el texto del link y un área de toque de al menos 44', async () => {
    const onPress = jest.fn();
    const view = await renderWithTheme(<TextLink label="Ver todos" onPress={onPress} />);
    const link = view.getByRole('button', { name: 'Ver todos' });

    expect(effectiveSize(20, link.props.hitSlop)).toBeGreaterThanOrEqual(MIN_TARGET);
    await fireEvent.press(link);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('el link que navega lleva chevron; el que no, no', async () => {
    const withChevron = await renderWithTheme(
      <TextLink label="Futuro" onPress={() => {}} chevron />,
    );
    expect(chevrons(withChevron)).toHaveLength(1);

    const without = await renderWithTheme(<TextLink label="Quitar" onPress={() => {}} />);
    expect(chevrons(without)).toHaveLength(0);
  });
});

describe('UX-11 · RowChevron', () => {
  it('es una pista visual: no es un elemento accesible por sí mismo', async () => {
    const view = await renderWithTheme(<RowChevron />);

    expect(chevrons(view)).toHaveLength(1);
    expect(view.queryByRole('button')).toBeNull();
  });
});

describe('UX-12 · Button ghost', () => {
  it('la acción secundaria de pantalla es un botón real de al menos 44 de alto', async () => {
    const view = await renderWithTheme(
      <Button variant="ghost" label="Ahora no" onPress={() => {}} fullWidth />,
    );
    const button = view.getByRole('button', { name: 'Ahora no' });
    const flat = Object.assign({}, ...[button.props.style].flat(3).filter(Boolean));

    expect(flat.height).toBeGreaterThanOrEqual(MIN_TARGET);
  });
});
