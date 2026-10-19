import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { View } from 'react-native';
import { Card, IconButton, Row, Stack, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import { MonthShape } from './MonthShape';
import type { MonthFigures, ShapeDot } from './movementsTab';

/**
 * El N1 de Movimientos (§16): lo de hoy y lo del mes, arriba de todo.
 *
 * Un panel teñido con el stepper del mes, el día ("Hoy, domingo 18 de octubre"),
 * dos cifras grandes y la forma del mes. Todo cuenta REGISTROS, nunca plata
 * (CA-00), y NO cambia al elegir un día ni un filtro: esas dos cosas son de la
 * lista de abajo. En un mes pasado no hay "Hoy": el título es el mes.
 *
 * Presentacional: el container decide qué hay.
 */
export function MonthSummary({
  monthLabel,
  figures,
  shape,
  review,
  onPrevious,
  onNext,
}: {
  monthLabel: string;
  figures: MonthFigures;
  shape: readonly ShapeDot[];
  /** K10 · "1 para revisar en Casa", si hay. */
  review: string | null;
  onPrevious: () => void;
  /** `null` en el mes en curso: el futuro es de Futuro. */
  onNext: (() => void) | null;
}) {
  const theme = useTheme();
  // En un mes pasado el título ya es el mes: repetirlo en el stepper sobra.
  const showMonthLabel = figures.heading !== monthLabel;

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

          {showMonthLabel && <Text variant="bodyMedium">{monthLabel}</Text>}

          <IconButton
            label="Mes siguiente"
            filled={false}
            disabled={onNext == null}
            onPress={onNext ?? (() => undefined)}
            icon={<ChevronRight size={20} color={theme.colors.textSecondary} />}
          />
        </Row>

        <Text variant="heading" accessibilityRole="header">
          {figures.heading}
        </Text>

        <Row gap="6" align="flex-end">
          {[figures.primary, figures.secondary].map((figure) => (
            <View
              key={figure.label}
              accessible
              accessibilityLabel={`${figure.value} ${figure.label}`}
              style={{ flexShrink: 1 }}
            >
              <Text variant="display" tabular>
                {figure.value}
              </Text>
              <Text variant="caption" tone="secondary">
                {figure.label}
              </Text>
            </View>
          ))}
        </Row>

        <MonthShape dots={shape} />

        {review != null && (
          <Text variant="caption" tone="shared">
            {review}
          </Text>
        )}
      </Stack>
    </Card>
  );
}
