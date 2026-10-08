import { useEffect, type ReactNode } from 'react';
import { View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  ReduceMotion,
} from 'react-native-reanimated';
import { duration, easing } from '../motion';
import { useTheme } from '../theme';
import { Button } from './Button';
import { Stack } from './layout';
import { Text } from './Text';

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Skeleton con la forma del contenido real.
 *
 * Nunca un spinner centrado: un spinner no dice nada y después hace saltar
 * todo el layout cuando llegan los datos. El skeleton le dice al usuario qué
 * va a aparecer y dónde, y el salto no existe.
 */
export function Skeleton({
  width = '100%',
  height = 16,
  radius,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: duration.deliberate * 2, easing: easing.inOut, reduceMotion: ReduceMotion.System }),
        withTiming(0.6, { duration: duration.deliberate * 2, easing: easing.inOut, reduceMotion: ReduceMotion.System }),
      ),
      -1,
      false,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius ?? theme.radius.sm,
          backgroundColor: theme.colors.skeleton,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

/** El skeleton del radar de Inicio: misma forma que la pantalla cargada. */
export function RadarSkeleton() {
  const theme = useTheme();
  return (
    <Stack gap="5">
      <Skeleton width={160} height={14} />
      <Skeleton width={220} height={32} />
      <Skeleton height={12} radius={theme.radius.pill} />
      <Stack gap="3">
        <Skeleton width="70%" height={18} />
        <Skeleton width="70%" height={18} />
        <Skeleton width="70%" height={18} />
      </Stack>
    </Stack>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Estado vacío. §33 tiene los textos literales de cada pantalla.
 *
 * Un vacío no es un error: es una invitación. Por eso no lleva ícono de
 * advertencia ni tono de disculpa.
 */
export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}) {
  const theme = useTheme();

  return (
    <View style={{ alignItems: 'center', paddingVertical: theme.space['8'], gap: theme.space['3'] }}>
      {icon != null && <View style={{ marginBottom: theme.space['1'] }}>{icon}</View>}
      <Text variant="bodyMedium" align="center">
        {title}
      </Text>
      {description != null && (
        <Text variant="small" tone="secondary" align="center" style={{ maxWidth: 280 }}>
          {description}
        </Text>
      )}
      {actionLabel != null && onAction != null && (
        <Button label={actionLabel} onPress={onAction} style={{ marginTop: theme.space['2'] }} />
      )}
    </View>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Error. Dice qué pasó y ofrece una salida; nunca culpa al usuario ni muestra
 * un stack trace.
 */
export function ErrorState({
  title = 'No pudimos cargar esto',
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  const theme = useTheme();

  return (
    <View style={{ alignItems: 'center', paddingVertical: theme.space['8'], gap: theme.space['3'] }}>
      <Text variant="bodyMedium" align="center">
        {title}
      </Text>
      <Text variant="small" tone="secondary" align="center" style={{ maxWidth: 280 }}>
        {description ?? 'Puede ser la conexión. Probá de nuevo en un momento.'}
      </Text>
      {onRetry != null && (
        <Button
          label="Probar de nuevo"
          variant="secondary"
          onPress={onRetry}
          style={{ marginTop: theme.space['2'] }}
        />
      )}
    </View>
  );
}
