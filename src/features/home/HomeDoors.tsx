import { View } from 'react-native';
import { CalendarClock, CalendarRange } from 'lucide-react-native';
import type { Month } from '@domain/calendar';
import type { Radar } from '@domain/radar';
import { CardPurchasesThisMonth } from '@/features/radar/RadarSummary';
import { Door, HatchFill, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import type { NextMonthsDoorContent, UpcomingDoorContent } from './homeDoorsCopy';
import { MINI_BAR_MIN_CAP, miniBarSegments } from './miniBars';

/** El alto de la barra del mes mayor, en px. */
const MINI_BAR_HEIGHT = 26;

/**
 * Las puertas (N2) de Inicio. Presentacionales: el container arma el contenido
 * con `homeDoors` y navega.
 */

/** §15 · Próximos pagos: el primero, con "resumen estimado" si lo es, y "y N más". */
export function UpcomingDoor({
  content,
  onPress,
}: {
  content: UpcomingDoorContent;
  onPress: () => void;
}) {
  return (
    <Door
      icon={CalendarClock}
      title="Próximos pagos"
      accessibilityLabel={['Próximos pagos', content.line, content.more]
        .filter((part) => part != null)
        .join('. ')}
      onPress={onPress}
    >
      <Text variant="small" tabular>
        {content.line}
      </Text>
      {content.more != null && (
        <Text variant="caption" tone="muted">
          {content.more}
        </Text>
      )}
    </Door>
  );
}

/**
 * §15 · Próximos meses: mini barras de los tres que vienen, "Con tarjeta este
 * mes: $X → se paga en noviembre" y, si algún mes queda con lo asignado por
 * encima de lo previsto, la frase de N-08 en ámbar, sin rojo y con borde de
 * atención. La frase es lo que dice el aviso: el color solo lo acompaña.
 */
export function NextMonthsDoor({
  content,
  cardPurchases,
  month,
  onPress,
}: {
  content: NextMonthsDoorContent;
  cardPurchases: Radar['cardPurchasesThisMonth'];
  /** El mes en curso, para decir "se paga en noviembre" sin año. */
  month: Month;
  onPress: () => void;
}) {
  return (
    <Door
      icon={CalendarRange}
      title="Próximos meses"
      attention={content.excessPhrase != null ? 'excess' : 'none'}
      accessibilityLabel={['Próximos meses', content.excessPhrase]
        .filter((part) => part != null)
        .join('. ')}
      onPress={onPress}
      // 2D · el monto va a la derecha, como el valor de una fila, alineado con el título.
      trailing={
        content.excessValue != null ? (
          <View style={{ alignSelf: 'flex-start' }}>
            <Text variant="bodyMedium" tone="excess" tabular>
              {content.excessValue}
            </Text>
          </View>
        ) : undefined
      }
    >
      <MiniMonthBars bars={content.bars} maxCommitted={content.maxCommitted} />
      <CardPurchasesThisMonth entries={cardPurchases} month={month} />
      {content.excessPhrase != null && (
        <Text variant="caption" tone="excess">
          {content.excessPhrase}
        </Text>
      )}
    </Door>
  );
}

/**
 * Tres barras chicas, una por mes, proporcionales entre sí (como las de
 * Futuro). Un mes en exceso lleva arriba el tope rayado ámbar, A ESCALA (el
 * lenguaje del recipiente de 1A, `miniBarSegments`); la cifra va a la derecha
 * de la puerta y la frase de abajo lo dice con palabras.
 */
function MiniMonthBars({
  bars,
  maxCommitted,
}: {
  bars: NextMonthsDoorContent['bars'];
  maxCommitted: number;
}) {
  const theme = useTheme();

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 3,
        // Lugar para el tope mínimo de un mes que no es el mayor.
        height: MINI_BAR_HEIGHT + MINI_BAR_MIN_CAP,
        marginVertical: theme.space['1'],
      }}
    >
      {bars.map((bar) => {
        const { body, cap } = miniBarSegments(
          { committed: bar.committed, excess: bar.excess, maxCommitted },
          MINI_BAR_HEIGHT,
        );
        return (
          <View key={bar.month} testID={`mini-bar-${bar.month}`} style={{ width: 10 }}>
            {cap > 0 && (
              <View
                testID={`mini-bar-cap-${bar.month}`}
                style={{
                  height: cap,
                  borderWidth: 1,
                  borderBottomWidth: 0,
                  borderColor: theme.colors.excess,
                  borderTopLeftRadius: 3,
                  borderTopRightRadius: 3,
                  overflow: 'hidden',
                }}
              >
                <HatchFill id={`mini-hatch-${bar.month}`} color={theme.colors.excess} />
              </View>
            )}
            <View
              style={{
                height: body,
                backgroundColor: theme.colors.committed,
                ...(cap === 0 && { borderTopLeftRadius: 3, borderTopRightRadius: 3 }),
              }}
            />
          </View>
        );
      })}
    </View>
  );
}
