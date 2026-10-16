import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { Month } from '@domain/calendar';
import type { Radar } from '@domain/radar';
import { formatMonth } from '@/lib/format';
import {
  Card,
  Money,
  RadarBar,
  RadarLegendDot,
  Row,
  RowChevron,
  Stack,
  Text,
  Pressable,
} from '@/ui/primitives';
import { duration } from '@/ui/motion';
import { useTheme } from '@/ui/theme';

/**
 * §15 · el N1 de Inicio: el bloque del radar del mes.
 *
 * Un panel grande teñido con la respuesta —"Tus ingresos de octubre" y lo
 * registrado—, su forma visual —la barra de hoy— y la leyenda con las tres
 * cifras, cada una tocable (M18). La única ayuda es la de Sin asignar (CA-01),
 * una sola vez.
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
  spent: 'Gastado',
  committed: 'Comprometido',
  unassigned: 'Sin asignar',
  /**
   * CA-01 · la ayuda de Sin asignar va SIEMPRE con la cifra, y una sola vez
   * (las de Gastado y Comprometido no son obligatorias y se quitaron).
   */
  unassignedHelp: 'Sin asignar: todavía sin destino, según lo que registraste.',
  /** CA-03 · sin ingresos registrados, no se calcula. */
  noIncome: 'Registrá tu ingreso para ver qué parte ya tiene destino.',
  /** N-08 / CA-02 · la frase del caso negativo, sin alarma. */
  exceeds: 'Tus gastos y compromisos superan tus ingresos registrados por',
  registered: 'registrados',
} as const;

type Figure = 'spent' | 'committed' | 'unassigned';

export function RadarSummary({
  radar,
  month,
  onOpenBreakdown,
}: {
  radar: Radar;
  month: Month;
  /** M18 · cada cifra se puede abrir y ver de qué está hecha. */
  onOpenBreakdown?: (target: Figure) => void;
}) {
  const theme = useTheme();
  const opener = (target: Figure) =>
    onOpenBreakdown != null ? () => onOpenBreakdown(target) : undefined;

  return (
    <Animated.View entering={FadeInDown.duration(duration.deliberate)}>
      <Card
        tone="brand"
        style={{ borderRadius: theme.radius.xl, padding: theme.space['5'] }}
      >
        <Stack gap="4">
          <Stack gap="1">
            <Text variant="small" tone="secondary">
              Tus ingresos de {formatMonth(month, month)}
            </Text>
            <Row gap="2" align="baseline">
              <Money amount={radar.registeredIncome} variant="display" animate />
              <Text variant="small" tone="secondary">
                {RADAR_COPY.registered}
              </Text>
            </Row>
          </Stack>

          <RadarBar
            registeredIncome={radar.registeredIncome}
            spent={radar.spent}
            committed={radar.committed}
            separatorColor={theme.colors.brandSoft}
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
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6 }}>
            <LegendItem
              dot="spent"
              label={RADAR_COPY.spent}
              amount={radar.spent}
              onPress={opener('spent')}
            />
            <LegendItem
              dot="committed"
              label={RADAR_COPY.committed}
              amount={radar.committed}
              onPress={opener('committed')}
            />
            {radar.unassigned != null && !radar.exceedsIncome && (
              <LegendItem
                dot="unassigned"
                label={RADAR_COPY.unassigned}
                amount={radar.unassigned}
                onPress={opener('unassigned')}
              />
            )}
          </View>

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
            <Text variant="caption" tone="secondary">
              {RADAR_COPY.unassignedHelp}
            </Text>
          )}
        </Stack>
      </Card>
    </Animated.View>
  );
}

function LegendItem({
  dot,
  label,
  amount,
  onPress,
}: {
  dot: Figure;
  label: string;
  amount: number;
  /** Sin esto el ítem es informativo: ni rol de botón ni chevron (UX-11). */
  onPress?: () => void;
}) {
  const item = (
    <Row gap="2" align="center">
      <RadarLegendDot color={dot} />
      <Text variant="small">{label}</Text>
      <Money amount={amount} variant="smallMedium" sign="never" />
      {/* UX-11 · M18 · el chevron avisa que la cifra se abre: es la defensa de D1. */}
      {onPress != null && <RowChevron size={14} />}
    </Row>
  );

  if (onPress == null) return item;

  return (
    <Pressable
      onPress={onPress}
      scaleOnPress={false}
      haptic="none"
      accessibilityRole="button"
      accessibilityHint="Ver de dónde sale esta cifra"
      accessibilityLabel={label}
      style={{ minHeight: 32, justifyContent: 'center' }}
    >
      {item}
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
