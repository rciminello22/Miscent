import { StyleSheet } from 'react-native';
import { renderWithTheme, fireEvent } from '@/test/render';
import { colorSchemes } from '../colors';
import { TextField } from './TextField';

/**
 * UX-17 · un solo campo de texto: alto único de 48 (minHeight, para Dynamic
 * Type), borde de foco `brand` (o `shared` para lo compartido), label opcional,
 * ayuda y error. Antes había ~18 TextInput con alturas de 44, 48, 50, 54 y 60.
 */

const light = colorSchemes.light;

function flat(node: { props: { style?: unknown } }) {
  return StyleSheet.flatten(node.props.style as never) as Record<string, unknown>;
}

function box(view: { getByTestId: (id: string) => { props: { style?: unknown } } }) {
  return flat(view.getByTestId('campo-box'));
}

describe('UX-17 · TextField', () => {
  it('tiene un alto único de 48 como mínimo (no fijo, para Dynamic Type)', async () => {
    const view = await renderWithTheme(
      <TextField testID="campo" value="" onChangeText={() => {}} placeholder="Nombre" />,
    );

    expect(box(view).minHeight).toBe(48);
    expect(box(view).height).toBeUndefined();
  });

  it('el placeholder usa textMuted y el texto, el color del tema', async () => {
    const view = await renderWithTheme(
      <TextField testID="campo" value="" onChangeText={() => {}} placeholder="Nombre" />,
    );
    const input = view.getByPlaceholderText('Nombre');

    expect(input.props.placeholderTextColor).toBe(light.textMuted);
    expect(flat(input).color).toBe(light.text);
  });

  it('el foco pinta el borde de brand; sin foco, el borde neutro', async () => {
    const view = await renderWithTheme(
      <TextField testID="campo" value="" onChangeText={() => {}} placeholder="Nombre" />,
    );
    expect(box(view).borderColor).toBe(light.border);

    await fireEvent(view.getByPlaceholderText('Nombre'), 'focus');
    expect(box(view).borderColor).toBe(light.brand);

    await fireEvent(view.getByPlaceholderText('Nombre'), 'blur');
    expect(box(view).borderColor).toBe(light.border);
  });

  it('la variante shared pinta el foco en teal, el color de lo compartido', async () => {
    const view = await renderWithTheme(
      <TextField
        testID="campo"
        variant="shared"
        value=""
        onChangeText={() => {}}
        placeholder="Martina"
      />,
    );

    await fireEvent(view.getByPlaceholderText('Martina'), 'focus');
    expect(box(view).borderColor).toBe(light.shared);
  });

  it('muestra el label, y la ayuda debajo', async () => {
    const view = await renderWithTheme(
      <TextField
        label="¿Cómo se llama?"
        helper="Opcional."
        value=""
        onChangeText={() => {}}
        placeholder="Nombre"
      />,
    );

    expect(view.getByText('¿Cómo se llama?')).toBeTruthy();
    expect(view.getByText('Opcional.')).toBeTruthy();
  });

  it('el error reemplaza a la ayuda, va en danger y pinta el borde de danger', async () => {
    const view = await renderWithTheme(
      <TextField
        testID="campo"
        helper="Opcional."
        error="Escribí un nombre."
        value=""
        onChangeText={() => {}}
        placeholder="Nombre"
      />,
    );

    expect(view.queryByText('Opcional.')).toBeNull();
    expect(flat(view.getByText('Escribí un nombre.')).color).toBe(light.danger);
    expect(box(view).borderColor).toBe(light.danger);
  });

  it('un campo sin label usa su placeholder o su accessibilityLabel como nombre accesible', async () => {
    const view = await renderWithTheme(
      <TextField
        value=""
        onChangeText={() => {}}
        placeholder="vos@email.com"
        accessibilityLabel="Tu email"
      />,
    );

    expect(view.getByLabelText('Tu email')).toBeTruthy();
  });

  it('con label y sin accessibilityLabel, el label es el nombre accesible', async () => {
    const view = await renderWithTheme(
      <TextField label="Descripción" value="" onChangeText={() => {}} />,
    );

    expect(view.getByLabelText('Descripción')).toBeTruthy();
  });

  it('refactor puro: pasa tal cual keyboardType, returnKeyType, maxLength, autoCapitalize y autoFocus', async () => {
    const onSubmitEditing = jest.fn();
    const view = await renderWithTheme(
      <TextField
        value=""
        onChangeText={() => {}}
        placeholder="vos@email.com"
        keyboardType="email-address"
        returnKeyType="go"
        maxLength={60}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
        onSubmitEditing={onSubmitEditing}
      />,
    );
    const input = view.getByPlaceholderText('vos@email.com');

    expect(input.props.keyboardType).toBe('email-address');
    expect(input.props.returnKeyType).toBe('go');
    expect(input.props.maxLength).toBe(60);
    expect(input.props.autoCapitalize).toBe('none');
    expect(input.props.autoCorrect).toBe(false);
    expect(input.props.autoFocus).toBe(true);

    await fireEvent(input, 'submitEditing');
    expect(onSubmitEditing).toHaveBeenCalledTimes(1);
  });

  it('escribir llama a onChangeText, y los onFocus/onBlur del uso se siguen llamando', async () => {
    const onChangeText = jest.fn();
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    const view = await renderWithTheme(
      <TextField
        value=""
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder="Nombre"
      />,
    );
    const input = view.getByPlaceholderText('Nombre');

    await fireEvent.changeText(input, 'Martina');
    await fireEvent(input, 'focus');
    await fireEvent(input, 'blur');

    expect(onChangeText).toHaveBeenCalledWith('Martina');
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('multiline crece con el contenido: mantiene el mínimo de 48 sin fijar el alto', async () => {
    const view = await renderWithTheme(
      <TextField testID="campo" multiline value="" onChangeText={() => {}} placeholder="Enlace" />,
    );

    expect(box(view).minHeight).toBe(48);
    expect(box(view).height).toBeUndefined();
  });
});
