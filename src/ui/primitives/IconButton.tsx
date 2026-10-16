import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { hitSlopFor } from '../touch';
import { Pressable } from './Pressable';

/**
 * UX-12 · un botón que es solo un ícono (cerrar, perfil, volver, menú).
 *
 * El dibujo mide `size` y el área de toque se completa hasta 44×44 con
 * `hitSlop`: el layout y el aspecto no cambian. `label` es obligatorio porque
 * sin texto es lo único que el lector de pantalla puede decir.
 */
export function IconButton({
  label,
  icon,
  onPress,
  size = 36,
  filled = true,
  disabled = false,
  style,
}: {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  /** El tamaño del dibujo; el área de toque se completa sola. */
  size?: number;
  /** Con círculo de fondo (cerrar, perfil) o solo el ícono (volver). */
  filled?: boolean;
  /** No responde y se ve apagado (la flecha de un mes que no existe todavía). */
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={hitSlopFor(size, size)}
      style={[
        {
          width: size,
          height: size,
          borderRadius: theme.radius.pill,
          backgroundColor: filled ? theme.colors.surfaceSunken : undefined,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      {icon}
    </Pressable>
  );
}
