import { monthOf } from '@domain/calendar';
import { formatMonth } from '@/lib/format';
import { useToday } from '@/features/shared/useToday';
import { AudienceBadge, EmptyState, Row, Screen, Stack, Text } from '@/ui/primitives';

/**
 * §16 · Movimientos.
 *
 * Objetivo: ver qué se registró en un mes y corregir errores.
 *
 * §39 declara el riesgo de esta pantalla: puede empujar a "registrar por
 * registrar". Se mitiga con Inicio primero y con que cada movimiento muestre
 * su efecto ("se paga en noviembre", "tu parte").
 *
 * ⚠️ Fase 3 · la lista, los filtros y el detalle llegan en la Fase 4, junto
 * con las mutaciones. Acá está el estado vacío definitivo de §33.
 */
export default function Movimientos() {
  const today = useToday();
  const month = monthOf(today);

  return (
    <Screen>
      <Stack gap="7">
        <Row justify="space-between" align="center">
          <Text variant="overline" tone="muted">
            {formatMonth(month, month)}
          </Text>
          <AudienceBadge audience={{ kind: 'private' }} />
        </Row>

        <EmptyState
          title={`Todavía no registraste nada en ${formatMonth(month, month)}.`}
          description="Lo que cargues va a aparecer acá, con su efecto en tu mes."
        />
      </Stack>
    </Screen>
  );
}
