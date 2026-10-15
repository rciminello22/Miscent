import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '../theme';
import { Text } from './Text';

/** UX-17 · el alto único de todo campo de texto. Es un MÍNIMO: crece con Dynamic Type. */
export const TEXT_FIELD_MIN_HEIGHT = 48;

export type TextFieldProps = Omit<TextInputProps, 'style' | 'placeholderTextColor'> & {
  /** Rótulo arriba del campo (también es su nombre accesible si no hay `accessibilityLabel`). */
  label?: string;
  /** Una línea de ayuda debajo. Un error la reemplaza. */
  helper?: string;
  /** El error de este campo: reemplaza la ayuda y pinta el borde de `danger`. */
  error?: string | null;
  /** `shared` pinta el foco en teal: para lo que ve la otra persona. */
  variant?: 'default' | 'shared';
};

/**
 * UX-17 · el campo de texto de la app.
 *
 * Antes cada pantalla armaba su propio `View` + `TextInput` (alturas de 44, 48,
 * 50, 54 y 60; foco `brand` en unos y `shared` en otros). Acá vive una sola vez:
 * alto mínimo de 48, borde que cambia con el foco, placeholder en `textMuted`,
 * ayuda y error. Todo lo demás (`keyboardType`, `returnKeyType`, `maxLength`,
 * `autoFocus`, `onSubmitEditing`...) pasa tal cual al `TextInput`.
 *
 * Fuera quedan `AmountInput` (monto grande con `$`), el campo del código de 8
 * dígitos (tipografía de título, centrado y espaciado) y el monto con prefijo
 * de `SplitPicker`: cada uno tiene su propio diseño.
 */
export function TextField({
  label,
  helper,
  error,
  variant = 'default',
  onFocus,
  onBlur,
  multiline,
  accessibilityLabel,
  testID,
  ...input
}: TextFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  let borderColor = theme.colors.border;
  if (error != null && error !== '') borderColor = theme.colors.danger;
  else if (focused) borderColor = variant === 'shared' ? theme.colors.shared : theme.colors.brand;

  const hasError = error != null && error !== '';

  return (
    <View style={{ gap: theme.space['2'] }}>
      {label != null && (
        <Text variant="smallMedium" tone="secondary">
          {label}
        </Text>
      )}

      <View
        testID={testID != null ? `${testID}-box` : undefined}
        style={{
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor,
          backgroundColor: theme.colors.surface,
          paddingHorizontal: theme.space['4'],
          paddingVertical: multiline ? theme.space['3'] : 0,
          minHeight: TEXT_FIELD_MIN_HEIGHT,
          justifyContent: 'center',
        }}
      >
        <TextInput
          {...input}
          testID={testID}
          multiline={multiline}
          accessibilityLabel={accessibilityLabel ?? label}
          placeholderTextColor={theme.colors.textMuted}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[theme.typography.body, { color: theme.colors.text }]}
        />
      </View>

      {hasError ? (
        <Text variant="small" tone="danger">
          {error}
        </Text>
      ) : (
        helper != null && (
          <Text variant="caption" tone="muted">
            {helper}
          </Text>
        )
      )}
    </View>
  );
}
