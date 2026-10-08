import { useMemo } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { monthOf } from '@domain/calendar';
import { radarForMonth } from '@domain/radar';
import { formatMonth } from '@/lib/format';
import { useSession } from '@/features/auth/SessionProvider';
import { useToday } from '@/features/shared/useToday';
import { demoPersonalFacts } from '@/features/shared/demoFacts';
import {
  AudienceBadge,
  Money,
  RadarBar,
  RadarLegendDot,
  Row,
  Screen,
  Stack,
  Text,
} from '@/ui/primitives';
import { duration, stagger } from '@/ui/motion';
import { useTheme } from '@/ui/theme';

/**
 * §15 · Inicio.
 *
 * ⚠️ Fase 3: la pantalla está armada con su forma y su lenguaje definitivos,
 * pero los datos salen de un juego de hechos de muestra. En la Fase 5 se
 * conecta a los hechos reales del usuario; el cálculo ya es el del dominio,
 * no hay números escritos a mano.
 *
 * Lo que NO va a cambiar: el lenguaje. "Ingresos registrados", "Gastado",
 * "Comprometido", "Sin asignar" y el texto de ayuda son los de §33, y el lint
 * de CA-00 impide que se cuelen sinónimos prohibidos.
 */
export default function Inicio() {
  const theme = useTheme();
  const today = useToday();
  const { profile } = useSession();

  const month = monthOf(today);
  const radar = useMemo(() => radarForMonth(demoPersonalFacts, month), [month]);

  return (
    <Screen>
      <Stack gap="7">
        <Row justify="space-between" align="center">
          <Text variant="overline" tone="muted">
            {formatMonth(month, month)}
          </Text>
          <AudienceBadge audience={{ kind: 'private' }} />
        </Row>

        {/* ── El radar del mes ───────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(duration.deliberate)}>
          <Stack gap="5">
            <Stack gap="1">
              <Text variant="small" tone="secondary">
                Tus ingresos de {formatMonth(month, month)}
              </Text>
              <Row gap="2" align="baseline">
                <Money amount={radar.registeredIncome} variant="display" animate />
                <Text variant="small" tone="muted">
                  registrados
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
                label="Gastado"
                amount={radar.spent}
                help="lo que registraste como pagado en el día a día"
              />
              <RadarRow
                dot="committed"
                label="Comprometido"
                amount={radar.committed}
                help="fijos, cuotas y tarjetas de este mes"
              />
              {radar.unassigned != null ? (
                <RadarRow
                  dot="unassigned"
                  label="Sin asignar"
                  amount={radar.unassigned}
                  help="todavía sin destino, según lo que registraste"
                />
              ) : (
                <Text variant="small" tone="secondary">
                  Registrá tu ingreso para ver qué parte ya tiene destino.
                </Text>
              )}
            </Stack>

            {radar.exceedsIncome && radar.unassigned != null && (
              <Text variant="small" tone="excess">
                Tus gastos y compromisos superan tus ingresos registrados por{' '}
                <Money amount={radar.unassigned} sign="never" variant="smallMedium" tone="excess" />
                .
              </Text>
            )}
          </Stack>
        </Animated.View>

        {/* ── §15 · "Con tarjeta este mes" ──────────────────────────────── */}
        {radar.cardPurchasesThisMonth.length > 0 && (
          <Animated.View entering={FadeInDown.delay(stagger(1, 80)).duration(duration.base)}>
            <Stack gap="2">
              {radar.cardPurchasesThisMonth.map((entry) => (
                <Row key={entry.month} gap="2" align="baseline">
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
          </Animated.View>
        )}

        <View
          style={{
            padding: theme.space['4'],
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.surfaceSunken,
          }}
        >
          <Text variant="caption" tone="muted">
            Fase 3 · la forma y el lenguaje de Inicio son los definitivos. Próximos pagos,
            Próximos meses y Tus espacios llegan en la Fase 5, con tus hechos reales.
            {profile != null ? ` Sesión: ${profile.displayName}.` : ''}
          </Text>
        </View>
      </Stack>
    </Screen>
  );
}

function RadarRow({
  dot,
  label,
  amount,
  help,
}: {
  dot: 'spent' | 'committed' | 'unassigned';
  label: string;
  amount: number;
  help: string;
}) {
  return (
    <Row gap="3" align="flex-start">
      <View style={{ marginTop: 7 }}>
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
  );
}
