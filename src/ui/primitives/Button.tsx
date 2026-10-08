import { ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { Pressable } from './Pressable';
import { Text } from './Text';

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'shared';
  size?: 'md' | 'lg';
  disabled?: boolean;
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
  }[variant];

  const textTone = {
    primary: 'onBrand' as const,
    secondary: 'default' as const,
    ghost: 'brand' as const,
    shared: 'onBrand' as const,
  }[variant];

  const height = size === 'lg' ? 54 : 46;

  return (
    <Pressable
      onPress={inactive ? undefined : onPress}
      haptic={inactive ? 'none' : haptic}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      accessibilityLabel={label}
      style={[
        {
          height,
          borderRadius: theme.radius.md,
          paddingHorizontal: theme.space['5'],
          backgroundColor: background,
          borderWidth: variant === 'secondary' ? 1 : 0,
          borderColor: theme.colors.border,
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
          color={variant === 'primary' || variant === 'shared' ? theme.colors.textOnBrand : theme.colors.brand}
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
