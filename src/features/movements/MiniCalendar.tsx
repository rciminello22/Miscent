import { useState } from 'react';
import { View } from 'react-native';
import { CalendarDays } from 'lucide-react-native';
import type { IsoDate } from '@domain/calendar';
import { Pressable, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import { emptyDayMessage, type CalendarDay, type MonthCalendar } from './calendarGrid';

/** UX-12 · cada día es la columna entera: 44pt de alto (y ~44 de ancho en 7 columnas). */
const DAY_HEIGHT = 44;
const DAY_CIRCLE = 28;
const DOT = 5;

/**
 * §16 · el mini calendario del N1 (variante B): L M M J V S D, las semanas de
 * lunes a domingo y un punto bajo los días con registros. Hoy va resaltado y
 * los días que todavía no llegaron, atenuados y sin responder.
 *
 * Cuenta REGISTROS, nunca plata (CA-00): el punto es "hay" o "no hay", siempre
 * del mismo tamaño. Nada se distingue solo por color: el punto es otra forma
 * que su ausencia, hoy lleva el círculo lleno y el día tocado, un aro.
 *
 * Tocar un día con registros abre la lista de ese día. Tocar uno sin registros
 * no navega: la frase aparece acá abajo y se va al tocar otro día (o al cambiar
 * de mes: quien lo usa le pone `key={month}`). El filtro por día vive solo en
 * la lista; este calendario nunca filtra nada.
 */
export function MiniCalendar({
  calendar,
  onOpenDay,
}: {
  calendar: MonthCalendar;
  onOpenDay: (date: IsoDate) => void;
}) {
  const theme = useTheme();
  const [emptyDate, setEmptyDate] = useState<IsoDate | null>(null);

  function press(day: CalendarDay) {
    if (day.count > 0) {
      setEmptyDate(null);
      onOpenDay(day.date);
      return;
    }
    setEmptyDate(day.date);
  }

  return (
    <View style={{ gap: theme.space['1'] }}>
      <View>
        <View style={{ flexDirection: 'row' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {calendar.weekdays.map((weekday, index) => (
            <View key={index} style={{ flex: 1, alignItems: 'center', height: 20, justifyContent: 'center' }}>
              <Text variant="caption" tone="muted">
                {weekday}
              </Text>
            </View>
          ))}
        </View>

        {calendar.weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={{ flexDirection: 'row' }}>
            {week.map((day, slotIndex) =>
              day == null ? (
                <View key={slotIndex} style={{ flex: 1, height: DAY_HEIGHT }} />
              ) : (
                <DayCell
                  key={day.date}
                  day={day}
                  selected={emptyDate === day.date}
                  onSelect={() => press(day)}
                />
              ),
            )}
          </View>
        ))}
      </View>

      {emptyDate != null && (
        <View
          accessible
          role="status"
          accessibilityLiveRegion="polite"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.space['2'],
            minHeight: DAY_HEIGHT,
          }}
        >
          <CalendarDays size={16} color={theme.colors.textMuted} />
          <Text variant="small" tone="secondary" style={{ flex: 1 }}>
            {emptyDayMessage(emptyDate)}
          </Text>
        </View>
      )}
    </View>
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
      <View
        style={{
          width: DAY_CIRCLE,
          height: DAY_CIRCLE,
          borderRadius: DAY_CIRCLE / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: day.isToday ? theme.colors.brand : 'transparent',
          borderWidth: selected ? 2 : 0,
          borderColor: theme.colors.brand,
        }}
      >
        <Text variant="small" tone={day.isToday ? 'onBrand' : 'default'} tabular>
          {day.day}
        </Text>
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
    gap: 2,
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
      style={cellStyle}
    >
      {content}
    </Pressable>
  );
}
