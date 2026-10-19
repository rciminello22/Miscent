import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay } from 'react-native-reanimated';
import { formatMonthShort } from '@/lib/format';
import type { Month } from '@domain/calendar';
import type { Pesos } from '@domain/money';
import { barTransition, stagger } from '../motion';
import { useTheme } from '../theme';
import { Money } from './Money';
import { Text } from './Text';

export type MonthBarProps = {
  month: Month;
  committed: Pesos;
  /** El mayor comprometido de la serie, para que las barras sean comparables. */
  maxCommitted: Pesos;
  /** Posición en la lista: las barras entran en cascada. */
  index?: number;
  highlighted?: boolean;
  /**
   * UX-24 · la barra se puede elegir (Futuro). Lo elegido se distingue por el
   * borde y el fondo, no solo por el color de la barra. Sin esto (Inicio, onboarding)
   * la fila no cambia de tamaño.
   */
  selectable?: boolean;
};

/**
 * Una barra por mes (§15 "Próximos meses" y §23.1 Futuro).
 *
 * Las barras son proporcionales entre sí, no al ingreso: la pregunta que
 * responden es "¿cómo vienen mis próximos meses?", o sea cómo se comparan
 * entre ellos. Que la barra de noviembre sea el doble que la de marzo es la
 * información; cuánto ocupa del sueldo es otra pregunta, y la responde el
 * radar.
 *
 * La cascada al entrar no es decorativa: hace que la vista recorra los meses
 * en orden, que es cómo se leen.
 */
export function MonthBar({
  month,
  committed,
  maxCommitted,
  index = 0,
  highlighted = false,
  selectable = false,
}: MonthBarProps) {
  const theme = useTheme();
  const ratio = useSharedValue(0);

  useEffect(() => {
    const target = maxCommitted > 0 ? committed / maxCommitted : 0;
    ratio.value = withDelay(stagger(index), barTransition(target));
  }, [committed, maxCommitted, index, ratio]);

  const barStyle = useAnimatedStyle(() => ({
    flexGrow: ratio.value,
  }));

  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', gap: theme.space['3'] },
        selectable && {
          paddingHorizontal: theme.space['3'],
          paddingVertical: theme.space['2'],
          borderRadius: theme.radius.md,
          borderWidth: 1.5,
          borderColor: highlighted ? theme.colors.brand : 'transparent',
          backgroundColor: highlighted ? theme.colors.surface : 'transparent',
        },
      ]}
    >
      <Text
        variant="smallMedium"
        tone={highlighted ? 'default' : 'secondary'}
        style={{ width: 34 }}
      >
        {formatMonthShort(month)}
      </Text>

      <View
        style={{
          flex: 1,
          height: 10,
          borderRadius: 5,
          backgroundColor: theme.colors.surfaceSunken,
          overflow: 'hidden',
          flexDirection: 'row',
        }}
      >
        <Animated.View
          style={[
            {
              backgroundColor: highlighted ? theme.colors.spent : theme.colors.committed,
              borderRadius: 5,
            },
            barStyle,
          ]}
        />
        <View style={{ flexGrow: Math.max(1 - (maxCommitted > 0 ? committed / maxCommitted : 0), 0) }} />
      </View>

      <Money
        amount={committed}
        variant="smallMedium"
        tone={highlighted ? 'default' : 'secondary'}
        numberOfLines={1}
        style={{ minWidth: 92, flexShrink: 0, textAlign: 'right' }}
      />
    </View>
  );
}

/**
 * §24 · la barra de "puso" de cada miembro, con una marca en lo que le
 * corresponde. La marca es el punto del dibujo: muestra de un vistazo si
 * alguien puso más o menos de lo que le tocaba.
 */
export function ContributionBar({
  put,
  share,
  max,
  tone = 'viewer',
  index = 0,
}: {
  put: Pesos;
  share: Pesos;
  max: Pesos;
  tone?: 'viewer' | 'other';
  index?: number;
}) {
  const theme = useTheme();
  const ratio = useSharedValue(0);

  useEffect(() => {
    ratio.value = withDelay(stagger(index, 60), barTransition(max > 0 ? put / max : 0));
  }, [put, max, index, ratio]);

  const barStyle = useAnimatedStyle(() => ({ flexGrow: ratio.value }));
  const shareRatio = max > 0 ? share / max : 0;

  return (
    <View
      style={{
        height: 12,
        borderRadius: 6,
        backgroundColor: theme.colors.surfaceSunken,
        overflow: 'hidden',
        flexDirection: 'row',
      }}
    >
      <Animated.View
        style={[
          {
            backgroundColor: tone === 'viewer' ? theme.colors.shared : theme.colors.committed,
            borderRadius: 6,
          },
          barStyle,
        ]}
      />
      <View style={{ flexGrow: Math.max(1 - (max > 0 ? put / max : 0), 0) }} />

      {/* La marca de "le corresponde". */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: `${shareRatio * 100}%`,
          width: 2,
          backgroundColor: theme.colors.text,
          opacity: 0.55,
        }}
      />
    </View>
  );
}
