import { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import type { Pesos } from '@domain/money';
import { barTransition } from '../motion';
import { radarBarRatios } from './radarBarRatios';
import { useTheme } from '../theme';

export type RadarBarProps = {
  registeredIncome: Pesos;
  spent: Pesos;
  committed: Pesos;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * La barra del radar (§15).
 *
 * Es "la forma visual principal de la pantalla", y su lectura es literal:
 * **lo lleno es lo que ya tiene destino; lo vacío es lo que todavía no.**
 *
 * Por eso Sin asignar no tiene color propio: es el track. No hay semáforo, no
 * hay verde de "bien" ni rojo de "mal". La app no juzga, muestra.
 *
 * N-08 · cuando lo asignado supera los ingresos registrados, la barra se llena
 * entera y aparece una marca en el punto de los ingresos, para que se vea
 * cuánto se pasó. Sin alarma (§15).
 *
 * La animación es deliberadamente más lenta que el resto: acá el movimiento ES
 * la información. Al guardar un gasto se ve QUÉ segmento creció y cuánto, que
 * es exactamente el aha moment de §3.
 */
export function RadarBar({
  registeredIncome,
  spent,
  committed,
  height = 12,
  style,
}: RadarBarProps) {
  const theme = useTheme();

  // UX-04 · CA-03 · sin ingresos registrados no hay proporciones: el track
  // queda neutro, sin segmentos.
  const ratios = radarBarRatios({ registeredIncome, spent, committed });
  const spentTarget = ratios?.spent ?? 0;
  const committedTarget = ratios?.committed ?? 0;
  const incomeMarkTarget = ratios?.incomeMark ?? 0;

  const spentRatio = useSharedValue(0);
  const committedRatio = useSharedValue(0);
  const incomeMarkRatio = useSharedValue(0);

  useEffect(() => {
    spentRatio.value = barTransition(spentTarget);
    committedRatio.value = barTransition(committedTarget);
    incomeMarkRatio.value = barTransition(incomeMarkTarget);
  }, [spentTarget, committedTarget, incomeMarkTarget, spentRatio, committedRatio, incomeMarkRatio]);

  const spentStyle = useAnimatedStyle(() => ({
    flexGrow: spentRatio.value,
  }));

  const committedStyle = useAnimatedStyle(() => ({
    flexGrow: committedRatio.value,
  }));

  const markStyle = useAnimatedStyle(() => ({
    left: `${incomeMarkRatio.value * 100}%`,
  }));

  return (
    <View
      style={[
        {
          height,
          borderRadius: height / 2,
          backgroundColor: theme.colors.unassignedTrack,
          overflow: 'hidden',
          flexDirection: 'row',
        },
        style,
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel="Destino de tus ingresos registrados"
    >
      {ratios != null && (
        <>
          <Animated.View
            testID="radar-bar-spent"
            style={[{ backgroundColor: theme.colors.spent }, spentStyle]}
          />
          <Animated.View
            testID="radar-bar-committed"
            style={[{ backgroundColor: theme.colors.committed }, committedStyle]}
          />
          {/* El resto del flex queda vacío: eso es Sin asignar. */}
          <View style={{ flexGrow: ratios.unassigned }} />
        </>
      )}

      {ratios?.exceeds === true && (
        <Animated.View
          testID="radar-bar-excess"
          style={[
            {
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: 2,
              backgroundColor: theme.colors.excess,
            },
            markStyle,
          ]}
        />
      )}
    </View>
  );
}

/**
 * La leyenda de la barra. Va siempre con ella: §4.2 pide que toda cifra diga
 * de qué está hecha.
 */
export function RadarLegend({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: theme.space['4'], flexWrap: 'wrap' }}>
      {children}
    </View>
  );
}

export function RadarLegendDot({ color }: { color: 'spent' | 'committed' | 'unassigned' }) {
  const theme = useTheme();
  const backgroundColor = {
    spent: theme.colors.spent,
    committed: theme.colors.committed,
    unassigned: theme.colors.unassignedTrack,
  }[color];

  return (
    <View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor,
        borderWidth: color === 'unassigned' ? 1 : 0,
        borderColor: theme.colors.borderStrong,
      }}
    />
  );
}
