import { View } from 'react-native';
import { CalendarClock, CalendarRange } from 'lucide-react-native';
import type { Month } from '@domain/calendar';
import type { Radar } from '@domain/radar';
import { CardPurchasesThisMonth } from '@/features/radar/RadarSummary';
import { Door, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import type { NextMonthsDoorContent, UpcomingDoorContent } from './homeDoorsCopy';

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
 * Futuro). Un mes en exceso lleva una marca ámbar arriba; la frase de abajo es
 * lo que lo dice, así que la marca no es lo único.
 */
function MiniMonthBars({
  bars,
  maxCommitted,
}: {
  bars: NextMonthsDoorContent['bars'];
  maxCommitted: number;
}) {
  const theme = useTheme();
  const HEIGHT = 26;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 3,
        height: HEIGHT,
        marginVertical: theme.space['1'],
      }}
    >
      {bars.map((bar) => {
        const ratio = maxCommitted > 0 ? bar.committed / maxCommitted : 0;
        return (
          <View
            key={bar.month}
            testID={`mini-bar-${bar.month}`}
            style={{
              width: 10,
              height: Math.max(3, HEIGHT * ratio),
              borderTopLeftRadius: 3,
              borderTopRightRadius: 3,
              backgroundColor: theme.colors.committed,
            }}
          >
            {bar.exceeds && (
              <View
                testID={`mini-bar-excess-${bar.month}`}
                style={{
                  position: 'absolute',
                  top: -3,
                  left: -2,
                  right: -2,
                  height: 3,
                  borderRadius: 2,
                  backgroundColor: theme.colors.excess,
                }}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}
