import { useMemo, useState, type ReactNode } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, CircleUser, MoreHorizontal, Plus, UserPlus } from 'lucide-react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addMonths, monthOf } from '@domain/calendar';
import type { SpaceOccurrence } from '@domain/occurrences';
import { formatDayMonth, formatInstallment, formatMonth } from '@/lib/format';
import { prettyLabel } from '@/features/add/categories';
import {
  balanceSentence,
  prepaidInstallmentsSentence,
  previousMonthSentence,
  putExtraSentence,
} from '@/features/spaces/balanceCopy';
import { useSpace } from '@/features/spaces/useSpaces';
import { SpaceMenu } from '@/features/spaces/SpaceMenu';
import {
  AudienceBadge,
  Button,
  Card,
  ContributionBar,
  Divider,
  EmptyState,
  ErrorState,
  Money,
  Pressable,
  Row,
  SectionHeader,
  Skeleton,
  Stack,
  Text,
} from '@/ui/primitives';
import { duration, stagger } from '@/ui/motion';
import { useTheme } from '@/ui/theme';

/**
 * §24 · la pantalla del espacio compartido.
 *
 * "Igual para los dos miembros, en segunda persona; igual en Estado A y B."
 *
 * Responde dos preguntas: ¿quién le debe a quién? y ¿quién viene poniendo más?
 *
 * Y tiene una prohibición que es el corazón de CA-25: **nunca se muestra la
 * diferencia entre lo que pusieron como si fuera la deuda**. Si Renzo puso
 * $700.000 y Martina $100.000 con reparto 50/50, la deuda es $300.000, no
 * $600.000. Por eso el saldo sale de `calculateSharedBalance` y la barra de
 * "puso" es otra cosa, con su marca aparte en lo que le corresponde a cada uno.
 *
 * E-09 · el espacio no muestra ni infiere cuánto dinero tiene cada miembro.
 */
/**
 * Qué va arriba a la izquierda. Lo decide la ruta que muestra el espacio:
 *   back    · una flecha con su destino
 *   profile · el invitado con un solo espacio, para quien el espacio ES su
 *             pantalla principal (§33 U1): no hay a dónde volver
 */
export type SpaceLeading = { kind: 'back'; onPress: () => void } | { kind: 'profile' };

/**
 * La pantalla del espacio, sin ruta propia. La muestran dos:
 *   /(personal)/compartidos/…  · Estado A, CON la barra de pestañas
 *   /space/[id]                · Estado B, sin pestañas (CA-06)
 */
export function SpaceScreen({
  spaceId,
  leading,
  footer,
}: {
  spaceId: string;
  leading: SpaceLeading;
  /** Lo que la ruta quiera sumar al final (p. ej. "Crear otro espacio"). */
  footer?: ReactNode;
}) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { derived, today, isLoading, isError, refetch } = useSpace(spaceId);
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const currentMonth = monthOf(today);

  // §23.4 · los compromisos compartidos de los próximos meses.
  const upcomingShared = useMemo(() => {
    if (derived == null) return [];
    return derived.occurrences
      .filter((occurrence) => occurrence.month > currentMonth)
      .slice(0, 12);
  }, [derived, currentMonth]);

  // §24 · los movimientos del espacio, del mes en curso hacia atrás.
  const movements = useMemo(() => {
    if (derived == null) return [];
    return [...derived.occurrences]
      .filter((occurrence) => occurrence.month <= currentMonth)
      .sort((a, b) => (a.balanceDate < b.balanceDate ? 1 : -1))
      .slice(0, 30);
  }, [derived, currentMonth]);

  async function onRefresh() {
    setRefreshing(true);
    // SY-01 · deslizar para ver los cambios del otro miembro.
    await refetch();
    setRefreshing(false);
  }


  if (isLoading) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={{ padding: theme.space['5'], paddingTop: insets.top + 24 }}
      >
        <Stack gap="5">
          <Skeleton width={140} height={24} />
          <Skeleton width={220} height={30} />
          <Skeleton height={80} />
        </Stack>
      </ScrollView>
    );
  }

  if (isError || derived == null) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center' }}>
        <ErrorState onRetry={() => void refetch()} />
      </View>
    );
  }

  const { balance, month, other, me, settlement, pendingInstallments } = derived;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + theme.space['3'],
        paddingBottom: insets.bottom + 120,
        paddingHorizontal: theme.space['5'],
      }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void onRefresh()}
          tintColor={theme.colors.brand}
        />
      }
    >
      <Stack gap="7">
        <Row justify="space-between" align="center">
          {leading.kind === 'profile' ? (
            <Pressable
              onPress={() => router.push('/(guest)/perfil')}
              accessibilityRole="button"
              accessibilityLabel="Perfil"
              style={{ padding: theme.space['1'], marginLeft: -theme.space['1'] }}
            >
              <CircleUser size={22} color={theme.colors.textSecondary} />
            </Pressable>
          ) : (
            <Pressable
              onPress={leading.onPress}
              accessibilityRole="button"
              accessibilityLabel="Volver"
              style={{ padding: theme.space['1'], marginLeft: -theme.space['1'] }}
            >
              <ArrowLeft size={20} color={theme.colors.textSecondary} />
            </Pressable>
          )}

          <Row gap="3" align="center">
            {/* §12 · el encabezado dice quién lo ve. */}
            <AudienceBadge
              audience={{ kind: 'shared', otherMemberName: other.displayName }}
            />

            {/* §24 · Renombrar · Invitar · Salir */}
            <Pressable
              onPress={() => setMenuOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Opciones del espacio"
              style={{
                width: 32,
                height: 32,
                borderRadius: theme.radius.pill,
                backgroundColor: theme.colors.surfaceSunken,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MoreHorizontal size={16} color={theme.colors.textSecondary} />
            </Pressable>
          </Row>
        </Row>

        {/* ── El saldo compartido ──────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(duration.deliberate)}>
          <Stack gap="4">
            <Text variant="overline" tone="muted">
              {derived.facts.space.name}
            </Text>

            <Text variant="title">{balanceSentence(balance)}</Text>

            {/* §24 · "Martina · todavía no entró · Invitar" y "ex miembro". */}
            {other.status === 'no_access' && (
              <Row gap="2" align="center">
                <Text variant="small" tone="muted">
                  {other.displayName} todavía no entró
                </Text>
                <Pressable
                  onPress={() => router.push(`/space/${spaceId}/invitar`)}
                  haptic="none"
                >
                  <Text variant="smallMedium" tone="brand">
                    Invitar
                  </Text>
                </Pressable>
              </Row>
            )}
            {other.status === 'former' && (
              <Text variant="small" tone="muted">
                {other.displayName} · ex miembro
              </Text>
            )}

            {/* §25 · el aviso de adelanto, para que el número no se lea mal. */}
            {prepaidInstallmentsSentence(balance, pendingInstallments) != null && (
              <Card tone="shared">
                <Text variant="small">
                  {prepaidInstallmentsSentence(balance, pendingInstallments)}
                </Text>
              </Card>
            )}

            {!balance.settled && settlement != null && (
              <Button
                label="Registrar pago"
                variant="shared"
                onPress={() => router.push(`/space/${spaceId}/pago`)}
              />
            )}
          </Stack>
        </Animated.View>

        {/* ── §24 · el mes del espacio ─────────────────────────────────── */}
        {month.total > 0 && (
          <Animated.View entering={FadeInDown.delay(stagger(1, 80)).duration(duration.base)}>
            <Stack gap="4">
              <Row justify="space-between" align="baseline">
                <Text variant="smallMedium" tone="secondary">
                  {formatMonth(currentMonth, currentMonth)} · gastos compartidos
                </Text>
                <Money amount={month.total} variant="bodyMedium" animate />
              </Row>

              <Stack gap="4">
                <MemberContribution
                  name="Vos"
                  put={month.viewer.put}
                  share={month.viewer.share}
                  max={Math.max(month.viewer.put, month.other.put, 1)}
                  tone="viewer"
                  index={0}
                />
                <MemberContribution
                  name={other.displayName}
                  put={month.other.put}
                  share={month.other.share}
                  max={Math.max(month.viewer.put, month.other.put, 1)}
                  tone="other"
                  index={1}
                />
              </Stack>

              {/* S-05 · la frase es "puso de más", nunca la diferencia. */}
              {putExtraSentence(month) != null && (
                <Text variant="small">{putExtraSentence(month)}</Text>
              )}

              {previousMonthSentence(month, formatMonth(addMonths(currentMonth, -1), currentMonth)) !=
                null && (
                <Text variant="caption" tone="muted">
                  {previousMonthSentence(
                    month,
                    formatMonth(addMonths(currentMonth, -1), currentMonth),
                  )}
                </Text>
              )}

              <Text variant="caption" tone="muted">
                La marca en cada barra es lo que le corresponde según el reparto.
              </Text>
            </Stack>
          </Animated.View>
        )}

        {/* ── §23.4 · Próximos meses del espacio ───────────────────────── */}
        {upcomingShared.length > 0 && (
          <Stack gap="4">
            <SectionHeader title="Próximos meses" />
            <Stack gap="0">
              {upcomingShared.map((occurrence, index) => (
                <View key={occurrence.id}>
                  <SharedRow
                    occurrence={occurrence}
                    mySlot={derived.mySlot}
                    otherName={other.displayName}
                    myName={me.displayName}
                    showMonth
                  />
                  {index < upcomingShared.length - 1 && <Divider />}
                </View>
              ))}
            </Stack>
            <Text variant="caption" tone="muted">
              Lo que ya está comprometido entre los dos. Lo ven ambos.
            </Text>
          </Stack>
        )}

        {/* ── §24 · Movimientos del espacio ────────────────────────────── */}
        <Stack gap="4">
          <SectionHeader title={`Movimientos de ${derived.facts.space.name}`} />

          {movements.length === 0 ? (
            <EmptyState
              title="Anoten acá lo que pagan para la casa."
              description="La app hace las cuentas."
              actionLabel="Agregar el primero"
              onAction={() => router.push(`/space/${spaceId}/agregar`)}
            />
          ) : (
            <Stack gap="0">
              {movements.map((occurrence, index) => (
                <Animated.View
                  key={occurrence.id}
                  layout={LinearTransition}
                  entering={FadeInDown.delay(stagger(index, 35)).duration(duration.base)}
                >
                  <SharedRow
                    occurrence={occurrence}
                    mySlot={derived.mySlot}
                    otherName={other.displayName}
                    myName={me.displayName}
                    onPress={
                      // Un fijo compartido se edita desde su propio fijo; un
                      // gasto, desde el detalle del gasto.
                      occurrence.sourceKind === 'expense'
                        ? () => router.push(`/space/${spaceId}/gasto/${occurrence.sourceId}`)
                        : undefined
                    }
                  />
                  {index < movements.length - 1 && <Divider />}
                </Animated.View>
              ))}
            </Stack>
          )}
        </Stack>

        {movements.length > 0 && (
          <Button
            label="Agregar un gasto"
            variant="shared"
            fullWidth
            icon={<Plus size={16} color={theme.colors.textOnBrand} />}
            onPress={() => router.push(`/space/${spaceId}/agregar`)}
          />
        )}

        {other.status === 'no_access' && (
          <Button
            label={`Invitar a ${other.displayName}`}
            variant="secondary"
            fullWidth
            icon={<UserPlus size={16} color={theme.colors.text} />}
            onPress={() => router.push(`/space/${spaceId}/invitar`)}
          />
        )}

        {footer}
      </Stack>

      <SpaceMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        spaceId={spaceId}
        spaceName={derived.facts.space.name}
        otherMemberName={other.displayName}
        otherHasAccess={other.status !== 'no_access'}
      />
    </ScrollView>
  );
}

/** §24 · la barra de lo que puso cada uno, con la marca de "le corresponde". */
function MemberContribution({
  name,
  put,
  share,
  max,
  tone,
  index,
}: {
  name: string;
  put: number;
  share: number;
  max: number;
  tone: 'viewer' | 'other';
  index: number;
}) {
  return (
    <Stack gap="2">
      <Row justify="space-between" align="baseline">
        <Text variant="small" tone="secondary">
          {name} puso
        </Text>
        <Money amount={put} variant="smallMedium" />
      </Row>

      <ContributionBar put={put} share={share} max={max} tone={tone} index={index} />

      <Row justify="flex-end">
        <Text variant="caption" tone="muted">
          le corresponden{' '}
        </Text>
        <Money amount={share} variant="caption" tone="muted" />
      </Row>
    </Stack>
  );
}

/**
 * Una ocurrencia del espacio.
 *
 * Muestra el TOTAL, no la parte: en el espacio la cifra principal es lo que se
 * gastó entre los dos (§7.3, lente del espacio). La parte de cada uno aparece
 * en el reparto, debajo.
 */
function SharedRow({
  occurrence,
  mySlot,
  otherName,
  myName,
  showMonth = false,
  onPress,
}: {
  occurrence: SpaceOccurrence;
  mySlot: 1 | 2;
  otherName: string;
  myName: string;
  showMonth?: boolean;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const iPaid = occurrence.payerSlot === mySlot;
  const myShare = mySlot === 1 ? occurrence.shares.slot1 : occurrence.shares.slot2;

  return (
    <Pressable
      onPress={onPress}
      haptic="none"
      scaleOnPress={false}
      accessibilityRole={onPress != null ? 'button' : undefined}
      accessibilityLabel={prettyLabel(occurrence.label)}
      style={{ paddingVertical: theme.space['3'] }}
    >
      <Row gap="3" align="flex-start">
        <View style={{ flex: 1, gap: 3 }}>
          <Text variant="bodyMedium" numberOfLines={1}>
            {prettyLabel(occurrence.label)}
          </Text>

          <Text variant="caption" tone="muted">
            {[
              showMonth
                ? formatMonth(occurrence.month, occurrence.month)
                : formatDayMonth(occurrence.balanceDate),
              // G-06 · "pagó X" es una declaración, no una verificación.
              `pagó ${iPaid ? myName : otherName}`,
              occurrence.installment != null
                ? `cuota ${formatInstallment(occurrence.installment.index, occurrence.installment.count)}`
                : null,
              occurrence.isRecurrence ? 'fijo' : null,
            ]
              .filter((part) => part != null)
              .join(' · ')}
          </Text>

          <Text variant="caption" tone="shared">
            te corresponde{' '}
            <Money amount={myShare} variant="caption" tone="shared" />
          </Text>
        </View>

        <Money amount={occurrence.amount} variant="bodyMedium" />
      </Row>
    </Pressable>
  );
}
