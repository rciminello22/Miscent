import { StyleSheet } from 'react-native';
import { renderWithTheme, fireEvent } from '@/test/render';
import { colorSchemes } from '../colors';
import { Button } from './Button';
import { Text } from './Text';

/**
 * UX-13 · lo destructivo tiene lenguaje propio: la variante `destructive` usa
 * `danger` (texto y borde) sobre la superficie, sin el relleno índigo de una
 * acción neutra. Sobria: no es una alarma, pero no se confunde con Guardar.
 */

const light = colorSchemes.light;

function styleOf(node: { props: { style?: unknown } }) {
  return StyleSheet.flatten(node.props.style as never) as Record<string, unknown>;
}

describe('UX-13 · Button destructive', () => {
  it('el texto va en danger, no en excess ni en el blanco de un botón primario', async () => {
    const view = await renderWithTheme(<Button label="Eliminar" variant="destructive" onPress={() => {}} />);

    expect(styleOf(view.getByText('Eliminar')).color).toBe(light.danger);
    expect(styleOf(view.getByText('Eliminar')).color).not.toBe(light.excess);
  });

  it('lleva borde danger y fondo de superficie: no es un botón primario índigo', async () => {
    const view = await renderWithTheme(<Button label="Eliminar" variant="destructive" onPress={() => {}} />);
    const button = styleOf(view.getByRole('button', { name: 'Eliminar' }));

    expect(button.borderColor).toBe(light.danger);
    expect(button.borderWidth).toBe(1);
    expect(button.backgroundColor).toBe(light.surface);
    expect(button.backgroundColor).not.toBe(light.brand);
  });

  it('sigue siendo un botón de 44 o más y responde al toque', async () => {
    const onPress = jest.fn();
    const view = await renderWithTheme(<Button label="Eliminar" variant="destructive" onPress={onPress} />);
    const button = view.getByRole('button', { name: 'Eliminar' });

    expect(styleOf(button).height).toBeGreaterThanOrEqual(44);
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('Button size sm · el botón chico de una fila', () => {
  it('se dibuja de 36 de alto, pero el área de toque llega a 44 (UX-12)', async () => {
    const view = await renderWithTheme(
      <Button label="Quitar" variant="secondary" size="sm" onPress={() => {}} />,
    );
    const button = view.getByRole('button', { name: 'Quitar' });
    const slop = button.props.hitSlop as { top: number; bottom: number };

    expect(styleOf(button).height).toBe(36);
    expect(36 + slop.top + slop.bottom).toBeGreaterThanOrEqual(44);
  });

  it('apagado se ve apagado y no responde, pero el lector de pantalla lo encuentra con su pista', async () => {
    const onPress = jest.fn();
    const view = await renderWithTheme(
      <Button
        label="Quitar"
        variant="secondary"
        size="sm"
        disabled
        accessibilityHint="Quedan cuotas hasta marzo"
        onPress={onPress}
      />,
    );
    const button = view.getByRole('button', { name: 'Quitar' });

    expect(button.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
    expect(button.props.accessibilityHint).toBe('Quedan cuotas hasta marzo');
    expect(styleOf(button).opacity).toBe(0.45);
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('UX-13 · Text tone danger', () => {
  it('pinta con el token danger', async () => {
    const view = await renderWithTheme(<Text tone="danger">No pudimos guardarlo</Text>);

    expect(styleOf(view.getByText('No pudimos guardarlo')).color).toBe(light.danger);
  });
});
