import { useState } from 'react';
import { Platform, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { CalendarDays } from 'lucide-react-native';
import {
  addDays,
  earliestEntryDate,
  isYesterdayAllowed,
  parseDate,
  toIso,
  type IsoDate,
} from '@domain/calendar';
import { formatDayMonth, formatLongDate } from '@/lib/format';
import { Pressable, Row, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import { Chip } from './fields';

/**
 * §17 campo 10 · "Fecha: Hoy". Editable, con hoy por defecto.
 *
 * Las fechas de negocio son strings ISO (calendar.ts). `Date` aparece SOLO en
 * la frontera con el picker nativo, que no entiende otra cosa: se arma a las
 * 12 del mediodía local para que ningún cambio de horario lo corra de día.
 */

function toNativeDate(iso: IsoDate): Date {
  const { year, month, day } = parseDate(iso);
  return new Date(year, month - 1, day, 12);
}

function fromNativeDate(date: Date): IsoDate {
  return toIso(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function NativeDatePicker({
  value,
  onPick,
  onClose,
  minimumDate,
  maximumDate,
}: {
  value: IsoDate;
  onPick: (date: IsoDate) => void;
  onClose: () => void;
  minimumDate?: IsoDate;
  maximumDate?: IsoDate;
}) {
  const theme = useTheme();

  function handleChange(event: DateTimePickerEvent, date?: Date) {
    // En Android el picker es un diálogo que se cierra solo; en iOS es un
    // calendario en línea que se cierra al elegir un día.
    onClose();
    if (event.type === 'set' && date != null) onPick(fromNativeDate(date));
  }

  return (
    <DateTimePicker
      value={toNativeDate(value)}
      mode="date"
      display={Platform.OS === 'ios' ? 'inline' : 'default'}
      locale="es-AR"
      themeVariant={theme.scheme}
      accentColor={theme.colors.brand}
      minimumDate={minimumDate != null ? toNativeDate(minimumDate) : undefined}
      maximumDate={maximumDate != null ? toNativeDate(maximumDate) : undefined}
      onChange={handleChange}
    />
  );
}

/**
 * La fecha de algo que YA ocurrió: un gasto o un pago entre miembros.
 *
 * Hoy y Ayer son casi todos los casos y cuestan un toque (§4.4: un gasto
 * cotidiano no suma pasos). Cualquier otra fecha abre el picker, con tope en
 * hoy: lo que se viene se registra como cuota o como fijo, no como un gasto
 * con fecha futura. Y con piso en el día 1 del mes en curso: un mes que ya
 * pasó se ve completo, pero no se le agrega nada (`earliestEntryDate`).
 */
export function PastDateField({
  value,
  onChange,
  today,
}: {
  value: IsoDate;
  onChange: (next: IsoDate) => void;
  today: IsoDate;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  const yesterday = addDays(today, -1);
  // El día 1, "Ayer" cae en un mes que ya pasó: no se ofrece.
  const showYesterday = isYesterdayAllowed(today);
  const isOther = value !== today && !(showYesterday && value === yesterday);
  const otherSelected = isOther || open;

  function pick(date: IsoDate) {
    setOpen(false);
    onChange(date);
  }

  return (
    <View style={{ gap: theme.space['3'] }}>
      <Row gap="2" style={{ flexWrap: 'wrap' }}>
        <Chip label="Hoy" selected={value === today && !open} onPress={() => pick(today)} />
        {showYesterday && (
          <Chip
            label="Ayer"
            selected={value === yesterday && !open}
            onPress={() => pick(yesterday)}
          />
        )}
        <Chip
          label={isOther ? formatDayMonth(value) : 'Otra fecha'}
          selected={otherSelected}
          onPress={() => setOpen(!open)}
          icon={
            <CalendarDays
              size={14}
              color={otherSelected ? theme.colors.textOnBrand : theme.colors.textSecondary}
            />
          }
        />
      </Row>

      {open && (
        <NativeDatePicker
          value={value}
          minimumDate={earliestEntryDate(today)}
          maximumDate={today}
          onPick={pick}
          onClose={() => setOpen(false)}
        />
      )}
    </View>
  );
}

/**
 * Una fecha cualquiera, sin atajos. Para el vencimiento de un resumen
 * pendiente (T-07), que puede ser pasado o futuro.
 *
 * `value === null` es "todavía no la sé": la app no inventa un día (T-05).
 */
export function DateField({
  value,
  onChange,
  fallback,
  placeholder,
  accessibilityLabel,
}: {
  value: IsoDate | null;
  onChange: (next: IsoDate) => void;
  /** Desde dónde abre el picker cuando todavía no hay fecha. */
  fallback: IsoDate;
  placeholder: string;
  accessibilityLabel: string;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={{ gap: theme.space['3'] }}>
      <Pressable
        onPress={() => setOpen(!open)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ text: value != null ? formatLongDate(value) : placeholder }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.space['3'],
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: open ? theme.colors.brand : theme.colors.border,
          backgroundColor: theme.colors.surface,
          paddingHorizontal: theme.space['4'],
          height: 48,
        }}
      >
        <CalendarDays size={18} color={theme.colors.textSecondary} />
        <Text variant="body" tone={value != null ? 'default' : 'muted'}>
          {value != null ? formatLongDate(value) : placeholder}
        </Text>
      </Pressable>

      {open && (
        <NativeDatePicker
          value={value ?? fallback}
          onPick={onChange}
          onClose={() => setOpen(false)}
        />
      )}
    </View>
  );
}
