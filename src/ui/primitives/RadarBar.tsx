import { useEffect, useState } from 'react';
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import type { Pesos } from '@domain/money';
import { formatPesos } from '@/lib/format';
import { barTransition } from '../motion';
import { HatchFill } from './HatchFill';
import { radarBarValueText } from './radarBarCopy';
import { radarBarRatios, radarBarSeparators, radarBarTail } from './radarBarRatios';
import { Text } from './Text';
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

/** UX-03 · separación entre segmentos, en px. */
const SEPARATOR_WIDTH = 2;
/** El grosor del contorno de Sin asignar y del recipiente: el mismo anillo que su leyenda. */
const OUTLINE = 1.5;
/** El palito que une la etiqueta con el tramo de más. */
const STICK_HEIGHT = 6;
/** El corchete de "Tus ingresos registrados". */
const BRACKET_HEIGHT = 7;
const HATCH_ID = 'radar-excess-hatch';

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
 * N-08 · los ingresos registrados son un RECIPIENTE, y cuando lo asignado lo
 * supera queda lleno y lo de más sale por la derecha, A ESCALA, como un tramo
 * rayado ámbar con su propio contorno. Arriba, "$X de más" unida al tramo por un
 * palito; abajo, un corchete que rotula el recipiente: "Tus ingresos
 * registrados". Sin alarma (§15). La geometría está en `radarBarTail`.
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
  // El ancho de la barra: el tramo de más se mide a escala contra él.
  const [width, setWidth] = useState(0);

  // UX-04 · CA-03 · sin ingresos registrados no hay proporciones: el track
  // queda neutro, sin segmentos.
  const ratios = radarBarRatios({ registeredIncome, spent, committed });
  const tail = radarBarTail({ registeredIncome, spent, committed }, width);
  const spentTarget = ratios?.spent ?? 0;
  const committedTarget = ratios?.committed ?? 0;

  const spentRatio = useSharedValue(0);
  const committedRatio = useSharedValue(0);

  useEffect(() => {
    spentRatio.value = barTransition(spentTarget);
    committedRatio.value = barTransition(committedTarget);
  }, [spentTarget, committedTarget, spentRatio, committedRatio]);

  const spentStyle = useAnimatedStyle(() => ({
    flexGrow: spentRatio.value,
  }));

  const committedStyle = useAnimatedStyle(() => ({
    flexGrow: committedRatio.value,
  }));

  const separators = radarBarSeparators(ratios);
  const gap = (
    <View style={{ width: SEPARATOR_WIDTH, backgroundColor: separatorColor ?? theme.colors.surface }} />
  );

  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    // Un píxel de diferencia no cambia el dibujo: no se re-renderiza por eso.
    if (Math.abs(next - width) >= 1) setWidth(next);
  };

  return (
    // El contenedor no recorta: la etiqueta, el palito y el corchete del exceso
    // viven fuera de la barra.
    <View
      style={style}
      accessibilityRole="progressbar"
      accessibilityLabel="Destino de tus ingresos registrados"
      accessibilityValue={{
        text: radarBarValueText({ registeredIncome, spent, committed }),
      }}
    >
      {tail != null && (
        // N-08 · la cifra exacta, siempre: el tramo puede medir 6px.
        <View style={{ alignItems: 'flex-end', marginBottom: 2 }}>
          <Text variant="smallMedium" tone="excess">
            {formatPesos(tail.amount, { sign: 'never' })} de más
          </Text>
          <View
            testID="radar-bar-excess-stick"
            style={{
              width: OUTLINE,
              height: STICK_HEIGHT,
              marginRight: Math.max(tail.width / 2 - OUTLINE / 2, 0),
              backgroundColor: theme.colors.excess,
            }}
          />
        </View>
      )}

      <View testID="radar-bar-body" onLayout={onLayout} style={{ height, flexDirection: 'row' }}>
        <View
          testID={ratios != null ? 'radar-bar-vessel' : undefined}
          style={{
            flex: 1,
            borderRadius: height / 2,
            // Con proporciones el vacío se dibuja con contorno (abajo); sin
            // ingresos (CA-03) no hay nada que dibujar y queda el track neutro.
            backgroundColor: ratios == null ? theme.colors.unassignedTrack : 'transparent',
            // Con exceso el recipiente se dibuja entero, para que se vea qué contiene.
            ...(tail != null && {
              borderWidth: OUTLINE,
              borderColor: theme.colors.textMuted,
            }),
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
                    borderWidth: OUTLINE,
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

        {tail != null && (
          // El tramo de más: rayado (se distingue por forma, no solo por el
          // ámbar) y con su propio contorno, abierto del lado del recipiente.
          <View
            testID="radar-bar-excess"
            style={{
              width: tail.width,
              marginLeft: tail.gap,
              borderWidth: OUTLINE,
              borderLeftWidth: 0,
              borderColor: theme.colors.excess,
              borderTopRightRadius: height / 2,
              borderBottomRightRadius: height / 2,
              overflow: 'hidden',
            }}
          >
            <HatchFill id={HATCH_ID} color={theme.colors.excess} />
          </View>
        )}
      </View>

      {tail != null && (
        // El corchete rotula el recipiente: dónde terminan los ingresos registrados.
        <View style={{ marginTop: 4 }}>
          <View style={{ flexDirection: 'row' }}>
            <View
              testID="radar-bar-bracket"
              style={{
                flex: 1,
                height: BRACKET_HEIGHT,
                borderWidth: OUTLINE,
                borderTopWidth: 0,
                borderColor: theme.colors.textMuted,
              }}
            />
            <View style={{ width: tail.width + tail.gap }} />
          </View>
          <View style={{ flexDirection: 'row' }}>
            <Text variant="caption" tone="secondary" align="center" style={{ flex: 1 }}>
              Tus ingresos registrados
            </Text>
            <View style={{ width: tail.width + tail.gap }} />
          </View>
        </View>
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
