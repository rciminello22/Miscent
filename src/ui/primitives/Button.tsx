import { ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { MIN_TARGET, hitSlopFor } from '../touch';
import { Pressable } from './Pressable';
import { Text } from './Text';

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  /**
   * `destructive` (UX-13): lo que elimina o saca algo. Superficie con borde y
   * texto `danger`: se distingue de una acción neutra sin gritar.
   */
  variant?: 'primary' | 'secondary' | 'ghost' | 'shared' | 'destructive';
  /** `sm` es el botón de una fila (36 de alto; el toque llega a 44 con `hitSlop`). */
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  /** Lo que el lector de pantalla dice si el texto solo no alcanza ("Quitar Con gonzalo"). */
  accessibilityLabel?: string;
  /** Lo que el lector de pantalla agrega: por qué está apagado, por ejemplo. */
  accessibilityHint?: string;
  loading?: boolean;
  /** Feedback físico al confirmar algo que se guardó. */
  haptic?: 'light' | 'success' | 'none';
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  loading = false,
  haptic = 'light',
  icon,
  fullWidth = false,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const inactive = disabled || loading;

  const background = {
    primary: theme.colors.brand,
    secondary: theme.colors.surface,
    ghost: 'transparent',
    shared: theme.colors.shared,
    destructive: theme.colors.surface,
  }[variant];

  const textTone = {
    primary: 'onBrand' as const,
    secondary: 'default' as const,
    ghost: 'brand' as const,
    shared: 'onBrand' as const,
    destructive: 'danger' as const,
  }[variant];

  const bordered = variant === 'secondary' || variant === 'destructive';
  const borderColor = variant === 'destructive' ? theme.colors.danger : theme.colors.border;

  const height = size === 'lg' ? 54 : size === 'sm' ? 36 : 46;

  return (
    <Pressable
      onPress={inactive ? undefined : onPress}
      haptic={inactive ? 'none' : haptic}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      // UX-12 · el dibujo mide 36; el área de toque llega a 44.
      hitSlop={size === 'sm' ? hitSlopFor(MIN_TARGET, height) : undefined}
      style={[
        {
          height,
          borderRadius: theme.radius.md,
          paddingHorizontal: size === 'sm' ? theme.space['4'] : theme.space['5'],
          backgroundColor: background,
          borderWidth: bordered ? 1 : 0,
          borderColor,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: theme.space['2'],
          opacity: inactive ? 0.45 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === 'primary' || variant === 'shared'
              ? theme.colors.textOnBrand
              : variant === 'destructive'
                ? theme.colors.danger
                : theme.colors.brand
          }
        />
      ) : (
        <>
          {icon != null && <View>{icon}</View>}
          <Text variant={size === 'lg' ? 'bodyMedium' : 'smallMedium'} tone={textTone}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}
