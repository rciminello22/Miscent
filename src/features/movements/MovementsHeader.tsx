import { ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';
import { Button, Card, IconButton, Row, Stack, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import type { IsoDate } from '@domain/calendar';
import { recordDaysLabel, type MonthCalendar } from './calendarGrid';
import { MiniCalendar } from './MiniCalendar';

/**
 * El N1 de Movimientos (§16): la respuesta a "¿qué registré este mes?".
 *
 * Un panel teñido con el mes (con su stepper), la frase ("12 registros" y "en 9
 * días", o el vacío de §16) y el mini calendario, que es su forma visual y
 * lanza la lista de un día. Con el mes en curso
 * vacío trae su propio "Agregar": el botón flotante se esconde para no tener
 * dos. En un mes que ya pasó no hay Agregar: no se carga con fecha de un mes
 * cerrado.
 *
 * Presentacional: el container decide qué hay.
 */
export function MovementsHeader({
  monthLabel,
  headline,
  calendar,
  onOpenDay,
  onPrevious,
  onNext,
  onAdd,
}: {
  monthLabel: string;
  headline: string;
  calendar: MonthCalendar;
  /** Tocar un día con registros: abre la lista de ese día. */
  onOpenDay: (date: IsoDate) => void;
  onPrevious: () => void;
  /** `null` en el mes en curso: el futuro es de Futuro. */
  onNext: (() => void) | null;
  /** Solo el mes en curso vacío. */
  onAdd: (() => void) | null;
}) {
  const theme = useTheme();
  const recordDays = recordDaysLabel(calendar.recordDays);

  return (
    <Card tone="brand" style={{ borderRadius: theme.radius.xl, padding: theme.space['4'] }}>
      <Stack gap="3">
        <Row justify="space-between" align="center">
          {/* UX-12 · el dibujo mide 36; el área de toque llega a 44. */}
          <IconButton
            label="Mes anterior"
            filled={false}
            onPress={onPrevious}
            icon={<ChevronLeft size={20} color={theme.colors.textSecondary} />}
          />

          <Text variant="heading">{monthLabel}</Text>

          <IconButton
            label="Mes siguiente"
            filled={false}
            disabled={onNext == null}
            onPress={onNext ?? (() => undefined)}
            icon={<ChevronRight size={20} color={theme.colors.textSecondary} />}
          />
        </Row>

        <Stack gap="0">
          <Text variant="title">{headline}</Text>
          {recordDays != null && (
            <Text variant="caption" tone="secondary">
              {recordDays}
            </Text>
          )}
        </Stack>

        {/* Al cambiar de mes la frase de un día vacío se va: el calendario se rearma. */}
        <MiniCalendar key={monthLabel} calendar={calendar} onOpenDay={onOpenDay} />

        {onAdd != null && (
          <Button
            label="Agregar"
            fullWidth
            icon={<Plus size={16} color={theme.colors.textOnBrand} />}
            onPress={onAdd}
          />
        )}
      </Stack>
    </Card>
  );
}
