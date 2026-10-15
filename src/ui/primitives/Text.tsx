import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { useTheme } from '../theme';
import type { TypographyVariant } from '../tokens';

/**
 * `excess` es SOLO de N-08 (sin alarma); `danger` es SOLO de errores y de lo
 * destructivo (UX-13).
 */
type Tone =
  | 'default'
  | 'secondary'
  | 'muted'
  | 'brand'
  | 'shared'
  | 'onBrand'
  | 'excess'
  | 'danger';

export type TextProps = RNTextProps & {
  variant?: TypographyVariant;
  tone?: Tone;
  /**
   * Dígitos de ancho fijo. Obligatorio en montos: sin esto, un número que se
   * anima de $320.000 a $350.000 hace saltar el texto de al lado.
   */
  tabular?: boolean;
  align?: TextStyle['textAlign'];
};

export function Text({
  variant = 'body',
  tone = 'default',
  tabular = false,
  align,
  style,
  ...rest
}: TextProps) {
  const theme = useTheme();

  const color = {
    default: theme.colors.text,
    secondary: theme.colors.textSecondary,
    muted: theme.colors.textMuted,
    brand: theme.colors.brand,
    shared: theme.colors.shared,
    onBrand: theme.colors.textOnBrand,
    excess: theme.colors.excess,
    danger: theme.colors.danger,
  }[tone];

  return (
    <RNText
      {...rest}
      style={[
        theme.typography[variant],
        { color },
        tabular && { fontVariant: ['tabular-nums'] },
        align != null && { textAlign: align },
        style,
      ]}
    />
  );
}
