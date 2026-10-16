import { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import type { Pesos } from '@domain/money';
import { barTransition } from '../motion';
import { radarBarValueText } from './radarBarCopy';
import { radarBarRatios, radarBarSeparators } from './radarBarRatios';
import { useTheme } from '../theme';

export type RadarBarProps = {
  registeredIncome: Pesos;
  spent: Pesos;
  committed: Pesos;
  height?: number;
  /** Color de la separación entre segmentos: el de la superficie sobre la que está la barra. */
  separatorColor?: string;
  style?: StyleProp<ViewStyle>;
};

/** UX-03 · separación entre segmentos y marca de exceso, en px. */
const SEPARATOR_WIDTH = 2;
const MARK_WIDTH = 6;
const MARK_HALO = 2;
const MARK_OVERHANG = 3;
/** El grosor del contorno de Sin asignar: el mismo anillo que su leyenda. */
const UNASSIGNED_OUTLINE = 1.5;

/**
 * La barra del radar (§15).
 *
 * Es "la forma visual principal de la pantalla", y su lectura es literal:
 * **lo lleno es lo que ya tiene destino; lo vacío es lo que todavía no.**
 *
 * Por eso Sin asignar no tiene relleno: se dibuja con contorno, el mismo anillo
 * hueco de su leyenda, y cierra la barra. No hay semáforo, no hay verde de
 * "bien" ni rojo de "mal". La app no juzga, muestra.
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
  height = 14,
  separatorColor,
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

  const separators = radarBarSeparators(ratios);
  const gap = (
    <View style={{ width: SEPARATOR_WIDTH, backgroundColor: separatorColor ?? theme.colors.surface }} />
  );

  return (
    // El contenedor no recorta: la marca de exceso sobresale de la barra (UX-03).
    <View
      style={[{ height }, style]}
      accessibilityRole="progressbar"
      accessibilityLabel="Destino de tus ingresos registrados"
      accessibilityValue={{
        text: radarBarValueText({ registeredIncome, spent, committed }),
      }}
    >
      <View
        style={{
          flex: 1,
          borderRadius: height / 2,
          // Con proporciones el vacío se dibuja con contorno (abajo); sin
          // ingresos (CA-03) no hay nada que dibujar y queda el track neutro.
          backgroundColor: ratios == null ? theme.colors.unassignedTrack : 'transparent',
          overflow: 'hidden',
          flexDirection: 'row',
        }}
      >
        {ratios != null && (
          <>
            <Animated.View
              testID="radar-bar-spent"
              style={[{ backgroundColor: theme.colors.spent }, spentStyle]}
            />
            {separators.spentCommitted && gap}
            <Animated.View
              testID="radar-bar-committed"
              style={[{ backgroundColor: theme.colors.committed }, committedStyle]}
            />
            {separators.assignedUnassigned && gap}
            {/*
              Sin asignar: lo que todavía no tiene destino se dibuja con CONTORNO,
              el mismo anillo hueco de su leyenda. Cierra la barra por la derecha y
              no lleva borde del lado de los tramos llenos. Con exceso (N-08) no
              queda nada sin asignar y no hay contorno.
            */}
            {ratios.unassigned > 0 && (
              <View
                testID="radar-bar-unassigned"
                style={{
                  flexGrow: ratios.unassigned,
                  borderWidth: UNASSIGNED_OUTLINE,
                  borderLeftWidth: 0,
                  borderColor: theme.colors.textMuted,
                  borderTopRightRadius: height / 2,
                  borderBottomRightRadius: height / 2,
                }}
              />
            )}
          </>
        )}
      </View>

      {ratios?.exceeds === true && (
        /* N-08 · la marca: un halo del color del fondo para que el ámbar se vea
           contra cualquier segmento, y sobresale 3px por arriba y por abajo. */
        <Animated.View
          testID="radar-bar-excess"
          style={[
            {
              position: 'absolute',
              top: -MARK_OVERHANG,
              bottom: -MARK_OVERHANG,
              width: MARK_WIDTH,
              marginLeft: -MARK_WIDTH / 2,
              borderRadius: MARK_WIDTH / 2,
              backgroundColor: separatorColor ?? theme.colors.surface,
              alignItems: 'center',
            },
            markStyle,
          ]}
        >
          <View
            style={{
              flex: 1,
              width: MARK_WIDTH - 2 * MARK_HALO,
              borderRadius: 1,
              backgroundColor: theme.colors.excess,
            }}
          />
        </Animated.View>
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
  // UX-03 · Sin asignar es lo VACÍO: un anillo hueco con borde de textMuted (>=4,5:1
  // contra el fondo), no un relleno del color del track, que se perdía.
  const backgroundColor = {
    spent: theme.colors.spent,
    committed: theme.colors.committed,
    unassigned: 'transparent',
  }[color];

  return (
    <View
      style={{
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor,
        borderWidth: color === 'unassigned' ? 1.5 : 0,
        borderColor: theme.colors.textMuted,
      }}
    />
  );
}
