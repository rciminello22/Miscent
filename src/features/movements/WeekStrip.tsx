import { View } from 'react-native';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react-native';
import type { IsoDate } from '@domain/calendar';
import { IconButton, Pressable, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import { hitSlopFor } from '@/ui/touch';
import type { CalendarDay } from './calendarGrid';
import { DOT_LEGEND, type StripView } from './movementsTab';

/** UX-12 · cada día es un área de 44pt de alto (y ~44 de ancho en 7 columnas). */
const DAY_HEIGHT = 44;
const DAY_RING = 34;
const DAY_CIRCLE = 26;
const DOT = 5;
const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const;

/**
 * §16 · la franja de una semana (16A): de lunes a domingo, con flechas de 44pt,
 * el rango ("12 al 18 de octubre") y el interruptor "Todo el mes".
 *
 * Tocar un día NO navega: elige qué día muestra la lista de abajo. Con "Todo el
 * mes" prendido la franja se atenúa (ningún día elegido) y tocar un día lo apaga.
 * Hoy va resaltado, el día elegido con un anillo, un punto bajo los días con
 * registros, y los futuros atenuados y sin responder.
 *
 * Cuenta REGISTROS, nunca plata (CA-00). Nada se distingue solo por color: el
 * punto es otra forma que su ausencia, hoy lleva el círculo lleno, el día
 * elegido un aro y "Todo el mes" una tilde.
 */
export function WeekStrip({
  strip,
  selectedDate,
  wholeMonth,
  onSelectDay,
  onPrevious,
  onNext,
  onToggleMonth,
}: {
  strip: StripView;
  /** `null` con "Todo el mes": ningún día está elegido. */
  selectedDate: IsoDate | null;
  wholeMonth: boolean;
  onSelectDay: (date: IsoDate) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToggleMonth: () => void;
}) {
  const theme = useTheme();
  const dim = wholeMonth ? 0.45 : 1;

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: theme.space['2'],
        paddingTop: theme.space['1'],
        paddingBottom: theme.space['2'],
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', opacity: dim }}>
          <IconButton
            label="Semana anterior"
            size={44}
            filled={false}
            disabled={!strip.canPrevious}
            onPress={onPrevious}
            icon={<ChevronLeft size={20} color={theme.colors.textSecondary} />}
          />
          <Text variant="smallMedium">{strip.range}</Text>
          <IconButton
            label="Semana siguiente"
            size={44}
            filled={false}
            disabled={!strip.canNext}
            onPress={onNext}
            icon={<ChevronRight size={20} color={theme.colors.textSecondary} />}
          />
        </View>

        <MonthToggle on={wholeMonth} onPress={onToggleMonth} />
      </View>

      <View style={{ opacity: dim }}>
        <View
          style={{ flexDirection: 'row' }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {WEEKDAYS.map((weekday, index) => (
            <View
              key={index}
              style={{ flex: 1, alignItems: 'center', height: 20, justifyContent: 'center' }}
            >
              <Text variant="caption" tone="muted">
                {weekday}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row' }}>
          {strip.week.map((day, slot) =>
            day == null ? (
              <View key={slot} style={{ flex: 1, height: DAY_HEIGHT }} />
            ) : (
              <DayCell
                key={day.date}
                day={day}
                selected={day.date === selectedDate}
                onSelect={() => onSelectDay(day.date)}
              />
            ),
          )}
        </View>
      </View>

      {/* La leyenda queda siempre: explica el punto de arriba. */}
      <View
        accessible
        accessibilityLabel={`El punto marca los ${DOT_LEGEND}`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space['1'], paddingHorizontal: theme.space['2'] }}
      >
        <View
          style={{ width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: theme.colors.spent }}
        />
        <Text variant="caption" tone="muted">
          {DOT_LEGEND}
        </Text>
      </View>
    </View>
  );
}

/** "Todo el mes": se prende y se apaga. Prendido lleva tilde, no solo color. */
function MonthToggle({ on, onPress }: { on: boolean; onPress: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      haptic="none"
      scaleOnPress={false}
      accessibilityRole="switch"
      accessibilityLabel="Todo el mes"
      accessibilityState={{ checked: on }}
      hitSlop={hitSlopFor(104, 40)}
      style={{
        height: 40,
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space['2'],
        paddingHorizontal: theme.space['3'],
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        borderColor: on ? theme.colors.brand : theme.colors.border,
        backgroundColor: on ? theme.colors.brand : theme.colors.surface,
      }}
    >
      <Text variant="small" tone={on ? 'onBrand' : 'secondary'}>
        Todo el mes
      </Text>
      {on && <Check size={14} color={theme.colors.textOnBrand} />}
    </Pressable>
  );
}

/**
 * Ojo con el nombre del prop: `onSelect` y no `onPress`. Un día futuro no tiene
 * que responder, y las herramientas de test (y las de accesibilidad) buscan un
 * `onPress` subiendo por los componentes: con ese nombre lo darían por tocable.
 */
function DayCell({
  day,
  selected,
  onSelect,
}: {
  day: CalendarDay;
  selected: boolean;
  onSelect: () => void;
}) {
  const theme = useTheme();

  const content = (
    <>
      {/* El aro del día elegido rodea al círculo de hoy: se ven los dos a la vez. */}
      <View
        style={{
          width: DAY_RING,
          height: DAY_RING,
          borderRadius: DAY_RING / 2,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: selected ? theme.colors.brand : 'transparent',
        }}
      >
        <View
          style={{
            width: DAY_CIRCLE,
            height: DAY_CIRCLE,
            borderRadius: DAY_CIRCLE / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: day.isToday ? theme.colors.brand : 'transparent',
          }}
        >
          <Text variant="small" tone={day.isToday ? 'onBrand' : 'default'} tabular>
            {day.day}
          </Text>
        </View>
      </View>
      <View
        style={{
          width: DOT,
          height: DOT,
          borderRadius: DOT / 2,
          backgroundColor: day.count > 0 ? theme.colors.spent : 'transparent',
        }}
      />
    </>
  );

  const cellStyle = {
    flex: 1,
    height: DAY_HEIGHT,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  // Un día que todavía no llegó no es un botón: no responde y se anuncia como tal.
  if (day.isFuture) {
    return (
      <View accessible accessibilityLabel={day.label} style={[cellStyle, { opacity: 0.35 }]}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onSelect}
      haptic="none"
      scaleOnPress={false}
      accessibilityRole="button"
      accessibilityLabel={day.label}
      accessibilityState={{ selected }}
      style={cellStyle}
    >
      {content}
    </Pressable>
  );
}
