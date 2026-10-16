import { useEffect, type ComponentProps } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { Check } from 'lucide-react-native';
import { useTheme } from '../theme';
import { Avatar } from './Avatar';
import { Text } from './Text';

/** Cuántos grados se inclina. Fijo: es un estado, no una proporción. */
export const SCALE_TILT_DEGREES = 8;

/**
 * Resorte sobrio: amortiguación alta (ζ ≈ 1,1), sin rebote de juguete. Termina
 * en ~0,6s, lo justo para seguir con la vista cómo cambió el estado.
 */
const SPRING = { damping: 26, stiffness: 140, mass: 1, overshootClamping: true } as const;

/** El último estado dibujado de cada balanza, para animar desde él al volver. */
const lastDirection = new Map<string, -1 | 0 | 1>();

export type ScalePersonProps = {
  initial: string;
  label: string;
  dashed: boolean;
};

export type BalanceScaleProps = {
  /** -1 baja el lado de la izquierda (vos), +1 el de la derecha, 0 nivelada. */
  direction: -1 | 0 | 1;
  /** El tilde en el eje: "Están a mano". */
  showCheck: boolean;
  me: ScalePersonProps;
  other: ScalePersonProps;
  accessibilityLabel: string;
  size?: 'full' | 'mini';
  /**
   * Identifica a esta balanza entre pantallas (p. ej. el id del espacio). Si el
   * estado cambió desde la última vez que se dibujó, gira desde el anterior al
   * nuevo en lugar de aparecer ya en su lugar.
   */
  memoryKey?: string;
};

/** Cuánto de la altura total ocupa la zona del travesaño (su centro es el eje). */
const BEAM_BAND = 92 / 126;

/**
 * La balanza: la forma visual del saldo compartido (N1 del espacio y, en
 * miniatura, cada tarjeta de la lista de Compartidos).
 *
 * Dos personas en los extremos de un travesaño; se inclina hacia quien puso de
 * más y queda nivelada, con un tilde, cuando están a mano. Sin rojo, sin flecha.
 * Presentacional: el estado lo calcula `balanceScaleState`.
 *
 * Animación: al cambiar el estado, el travesaño gira con un resorte sobrio; el
 * tilde aparece cuando termina de nivelarse. Con "Reducir movimiento" no hay
 * animación. Las iniciales se contra-rotan para quedar siempre derechas.
 */
export function BalanceScale({
  direction,
  showCheck,
  me,
  other,
  accessibilityLabel,
  size = 'full',
  memoryKey,
}: BalanceScaleProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();

  // Sin animación (Reducir movimiento) no hay "desde dónde": aparece en su lugar.
  const remembered = memoryKey == null || reduceMotion ? undefined : lastDirection.get(memoryKey);
  const start = remembered ?? direction;
  const angle = useSharedValue(start * SCALE_TILT_DEGREES);
  const check = useSharedValue(start === 0 ? 1 : 0);

  useEffect(() => {
    const target = direction * SCALE_TILT_DEGREES;
    if (reduceMotion) {
      angle.value = target;
      check.value = showCheck ? 1 : 0;
    } else {
      angle.value = withSpring(target, SPRING);
      // El tilde espera a que el travesaño llegue al nivel.
      check.value = showCheck ? withDelay(280, withTiming(1, { duration: 180 })) : withTiming(0, { duration: 120 });
    }
    if (memoryKey != null) lastDirection.set(memoryKey, direction);
  }, [direction, showCheck, reduceMotion, memoryKey, angle, check]);

  const beamStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${angle.value}deg` }],
  }));
  const counterStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-angle.value}deg` }],
  }));
  const checkStyle = useAnimatedStyle(() => ({
    opacity: check.value,
    transform: [{ scale: 0.8 + 0.2 * check.value }],
  }));

  const beamColor = theme.colors.textSecondary;
  const otherFill = theme.colors.committed;

  const checkBadge = (
    <Animated.View
      pointerEvents="none"
      testID="balance-scale-check"
      style={[
        {
          position: 'absolute',
          left: '50%',
          width: 28,
          height: 28,
          marginLeft: -14,
          marginTop: -14,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.surface,
          borderWidth: 2.5,
          borderColor: theme.colors.shared,
        },
        // El eje: y=46 de 126 en la grande, y=36 de 80 en la mini.
        size === 'full' ? { top: `${(46 / 126) * 100}%` } : { top: `${(36 / 80) * 100}%` },
        checkStyle,
      ]}
    >
      <Check size={16} color={theme.colors.shared} strokeWidth={3} />
    </Animated.View>
  );

  if (size === 'mini') {
    return (
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
        style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.space['2'] }}
      >
        <MiniPerson person={me} tone="me" />

        {/* El travesaño entre las dos personas; el eje queda quieto. */}
        <View style={{ flex: 1, aspectRatio: 300 / 80, marginTop: 2 }}>
          <Svg width="100%" height="100%" viewBox="0 0 300 80" style={{ position: 'absolute' }}>
            <Path d="M150 36 L138 72 H162 Z" fill={beamColor} />
          </Svg>
          <Animated.View
            testID="balance-scale-beam"
            style={[{ position: 'absolute', top: 0, left: 0, right: 0, height: '90%' }, beamStyle]}
          >
            <Svg width="100%" height="100%" viewBox="0 0 300 72">
              <Line x1={14} y1={36} x2={286} y2={36} stroke={beamColor} strokeWidth={5} strokeLinecap="round" />
            </Svg>
          </Animated.View>
          {checkBadge}
        </View>

        <MiniPerson person={other} tone="other" />
      </View>
    );
  }

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={{ width: '100%', aspectRatio: 300 / 126 }}
    >
      {/* El eje y la base, quietos. */}
      <Svg width="100%" height="100%" viewBox="0 0 300 126" style={{ position: 'absolute' }}>
        <Path d="M150 46 L137 94 H163 Z" fill={beamColor} />
        <Line x1={118} y1={94} x2={182} y2={94} stroke={beamColor} strokeWidth={4} strokeLinecap="round" />
      </Svg>

      {/* El travesaño con las dos personas: gira alrededor de su centro (el eje). */}
      <Animated.View
        testID="balance-scale-beam"
        style={[
          { position: 'absolute', top: 0, left: 0, right: 0, height: `${BEAM_BAND * 100}%` },
          beamStyle,
        ]}
      >
        <Svg width="100%" height="100%" viewBox="0 0 300 92">
          <Line x1={42} y1={46} x2={258} y2={46} stroke={beamColor} strokeWidth={4} strokeLinecap="round" />
          <Circle cx={42} cy={46} r={21} fill={theme.colors.shared} />
          {other.dashed ? (
            <Circle
              testID="balance-scale-other-circle"
              cx={258}
              cy={46}
              r={21}
              fill={theme.colors.surface}
              stroke={theme.colors.textMuted}
              strokeWidth={2.5}
              strokeDasharray="5 4"
            />
          ) : (
            <Circle testID="balance-scale-other-circle" cx={258} cy={46} r={21} fill={otherFill} />
          )}
        </Svg>
        <Initial left={42 / 300} initial={me.initial} dashed={false} style={counterStyle} />
        <Initial left={258 / 300} initial={other.initial} dashed={other.dashed} style={counterStyle} />
      </Animated.View>

      {checkBadge}

      <ScaleName left={42 / 300} text={me.label} />
      <ScaleName left={258 / 300} text={other.label} />
    </View>
  );
}

/** La inicial dentro de su círculo, siempre derecha aunque el travesaño gire. */
function Initial({
  left,
  initial,
  dashed,
  style,
}: {
  left: number;
  initial: string;
  dashed: boolean;
  style: ComponentProps<typeof Animated.View>['style'];
}) {
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: `${left * 100}%`,
          top: '50%',
          width: 44,
          height: 44,
          marginLeft: -22,
          marginTop: -22,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text variant="heading" tone={dashed ? 'muted' : 'onBrand'}>
        {initial}
      </Text>
    </Animated.View>
  );
}

function ScaleName({ left, text }: { left: number; text: string }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        bottom: 0,
        left: `${left * 100}%`,
        width: 110,
        marginLeft: -55,
        alignItems: 'center',
      }}
    >
      <Text variant="smallMedium" tone="secondary" numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

function MiniPerson({ person, tone }: { person: ScalePersonProps; tone: 'me' | 'other' }) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 2, width: 56 }}>
      <Avatar
        initial={person.initial}
        tone={tone}
        dashed={person.dashed}
        size={36}
        testID={`balance-scale-${tone}`}
      />
      <Text variant="caption" tone="muted" numberOfLines={1} style={{ maxWidth: 56, marginTop: theme.space['0'] }}>
        {person.label}
      </Text>
    </View>
  );
}
