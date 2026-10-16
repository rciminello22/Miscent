import { ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';
import { Button, Card, IconButton, Row, Stack, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import { DayStrip } from './DayStrip';
import type { StripDay } from './movementsView';

/**
 * El N1 de Movimientos (§16): la respuesta a "¿qué registré este mes?".
 *
 * Un panel teñido con el mes (con su stepper), la frase ("12 registros", o el
 * vacío de §16) y la tira de días, que es su forma visual. Con el mes en curso
 * vacío trae su propio "Agregar": el botón flotante se esconde para no tener
 * dos. En un mes que ya pasó no hay Agregar: no se carga con fecha de un mes
 * cerrado.
 *
 * Presentacional: el container decide qué hay.
 */
export function MovementsHeader({
  monthLabel,
  headline,
  strip,
  onPrevious,
  onNext,
  onAdd,
}: {
  monthLabel: string;
  headline: string;
  strip: readonly StripDay[];
  onPrevious: () => void;
  /** `null` en el mes en curso: el futuro es de Futuro. */
  onNext: (() => void) | null;
  /** Solo el mes en curso vacío. */
  onAdd: (() => void) | null;
}) {
  const theme = useTheme();

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

        <Text variant="title">{headline}</Text>

        <DayStrip days={strip} />

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
