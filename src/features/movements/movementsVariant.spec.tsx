// TEMPORAL: variante B en prueba. Se borra junto con movementsVariant.ts.
import { Pressable, Text } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { resetMovementsVariantForTests, useMovementsVariant } from './movementsVariant';

/** Perfil escribe, la pestaña Movimientos (montada aparte) lee. */
function Perfil() {
  const { variant, toggle } = useMovementsVariant();
  return (
    <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel="alternar">
      <Text testID="perfil">{String(variant)}</Text>
    </Pressable>
  );
}

function Movimientos() {
  const { variant } = useMovementsVariant();
  return <Text testID="movimientos">{String(variant)}</Text>;
}

describe('useMovementsVariant · estado compartido entre pantallas', () => {
  beforeEach(async () => {
    await act(async () => resetMovementsVariantForTests());
  });

  it('al alternar en una pantalla, la otra cambia sin remontar', async () => {
    const view = await render(
      <>
        <Perfil />
        <Movimientos />
      </>,
    );
    await waitFor(() => expect(view.getByTestId('movimientos').props.children).toBe('A'));

    await fireEvent.press(view.getByRole('button', { name: 'alternar' }));

    await waitFor(() => expect(view.getByTestId('perfil').props.children).toBe('B'));
    expect(view.getByTestId('movimientos').props.children).toBe('B');

    await fireEvent.press(view.getByRole('button', { name: 'alternar' }));
    await waitFor(() => expect(view.getByTestId('movimientos').props.children).toBe('A'));
  });
});
