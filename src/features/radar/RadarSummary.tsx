import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { Month } from '@domain/calendar';
import type { Radar } from '@domain/radar';
import { formatMonth } from '@/lib/format';
import {
  Money,
  RadarBar,
  RadarLegendDot,
  Row,
  Stack,
  Text,
  Pressable,
} from '@/ui/primitives';
import { duration } from '@/ui/motion';

/**
 * §15 · el bloque del radar del mes.
 *
 * Está extraído de la pantalla por una razón concreta: es el lugar donde más
 * importa el lenguaje exacto, y así se puede renderizar en un test sin montar
 * navegación ni sesión.
 *
 * Los textos NO son editables desde afuera, a propósito. CA-01 exige que Sin
 * asignar aparezca con "todavía sin destino, según lo que registraste", y
 * CA-02 fija la frase del caso negativo. Si estos textos fueran props, el
 * criterio se podría violar desde cualquier pantalla que use el componente.
 */

/** §33 · el microcopy del radar, literal. */
export const RADAR_COPY = {
  spent: {
    label: 'Gastado',
    help: 'lo que registraste como pagado en el día a día',
  },
  committed: {
    label: 'Comprometido',
    help: 'fijos, cuotas y tarjetas de este mes',
  },
  unassigned: {
    label: 'Sin asignar',
    /** CA-01 · este texto va SIEMPRE con la cifra. */
    help: 'todavía sin destino, según lo que registraste',
  },
  /** CA-03 · sin ingresos registrados, no se calcula. */
  noIncome: 'Registrá tu ingreso para ver qué parte ya tiene destino.',
  /** N-08 / CA-02 · la frase del caso negativo, sin alarma. */
  exceeds: 'Tus gastos y compromisos superan tus ingresos registrados por',
  registered: 'registrados',
} as const;

export function RadarSummary({
  radar,
  month,
  onOpenBreakdown,
}: {
  radar: Radar;
  month: Month;
  /** M18 · cada cifra se puede abrir y ver de qué está hecha. */
  onOpenBreakdown?: (target: 'spent' | 'committed' | 'unassigned') => void;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(duration.deliberate)}>
      <Stack gap="5">
        <Stack gap="1">
          <Text variant="small" tone="secondary">
            Tus ingresos de {formatMonth(month, month)}
          </Text>
          <Row gap="2" align="baseline">
            <Money amount={radar.registeredIncome} variant="display" animate />
            <Text variant="small" tone="muted">
              {RADAR_COPY.registered}
            </Text>
          </Row>
        </Stack>

        <RadarBar
          registeredIncome={radar.registeredIncome}
          spent={radar.spent}
          committed={radar.committed}
        />

        <Stack gap="3">
          <RadarRow
            dot="spent"
            label={RADAR_COPY.spent.label}
            help={RADAR_COPY.spent.help}
            amount={radar.spent}
            onPress={() => onOpenBreakdown?.('spent')}
          />
          <RadarRow
            dot="committed"
            label={RADAR_COPY.committed.label}
            help={RADAR_COPY.committed.help}
            amount={radar.committed}
            onPress={() => onOpenBreakdown?.('committed')}
          />

          {/*
            Tres estados excluyentes, y son excluyentes a propósito:

            sin ingresos registrados → CA-03, no se calcula
            asignado > ingresos      → N-08, la frase REEMPLAZA a la cifra. Si
                                       se mostraran las dos, el mismo monto
                                       aparecería dos veces y "Sin asignar
                                       $35.000" se leería como si quedara algo,
                                       cuando lo que pasa es lo contrario
            normal                   → CA-01, la cifra con su ayuda
          */}
          {radar.unassigned == null ? (
            <Text variant="small" tone="secondary">
              {RADAR_COPY.noIncome}
            </Text>
          ) : radar.exceedsIncome ? (
            <Text variant="small" tone="excess">
              {RADAR_COPY.exceeds}{' '}
              <Money
                amount={radar.unassigned}
                sign="never"
                variant="smallMedium"
                tone="excess"
              />
              .
            </Text>
          ) : (
            <RadarRow
              dot="unassigned"
              label={RADAR_COPY.unassigned.label}
              help={RADAR_COPY.unassigned.help}
              amount={radar.unassigned}
              onPress={() => onOpenBreakdown?.('unassigned')}
            />
          )}
        </Stack>
      </Stack>
    </Animated.View>
  );
}

function RadarRow({
  dot,
  label,
  help,
  amount,
  onPress,
}: {
  dot: 'spent' | 'committed' | 'unassigned';
  label: string;
  help: string;
  amount: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      scaleOnPress={false}
      haptic="none"
      accessibilityRole="button"
      accessibilityHint="Ver de dónde sale esta cifra"
      accessibilityLabel={label}
    >
      <Row gap="3" align="flex-start">
        <View style={{ marginTop: 6 }}>
          <RadarLegendDot color={dot} />
        </View>

        <View style={{ flex: 1, gap: 1 }}>
          <Row justify="space-between" align="baseline">
            <Text variant="bodyMedium">{label}</Text>
            <Money amount={amount} variant="bodyMedium" animate sign="never" />
          </Row>
          <Text variant="caption" tone="muted">
            {help}
          </Text>
        </View>
      </Row>
    </Pressable>
  );
}

/** §15 · "Con tarjeta este mes: $95.000 → se paga en noviembre". */
export function CardPurchasesThisMonth({
  entries,
  month,
}: {
  entries: Radar['cardPurchasesThisMonth'];
  month: Month;
}) {
  if (entries.length === 0) return null;

  return (
    <Stack gap="2">
      {entries.map((entry) => (
        <Row key={entry.month} gap="2" align="baseline" style={{ flexWrap: 'wrap' }}>
          <Text variant="small" tone="secondary">
            Con tarjeta este mes:
          </Text>
          <Money amount={entry.amount} variant="smallMedium" />
          <Text variant="small" tone="muted">
            → se paga en {formatMonth(entry.month, month)}
          </Text>
        </Row>
      ))}
    </Stack>
  );
}
