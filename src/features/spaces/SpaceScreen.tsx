import { useMemo, useState, type ReactNode } from 'react';
import { Alert, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, CircleUser, MoreHorizontal, Plus, UserPlus } from 'lucide-react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addMonths, monthOf } from '@domain/calendar';
import type { SpaceOccurrence } from '@domain/occurrences';
import { pendingStoppedFixed } from '@domain/departure';
import { formatDayMonth, formatInstallment, formatMonth, formatPesos } from '@/lib/format';
import { prettyLabel } from '@/features/add/categories';
import { useSession } from '@/features/auth/SessionProvider';
import { StoppedFixedCard } from './StoppedFixedCard';
import {
  balanceSentence,
  paymentSentence,
  prepaidInstallmentsSentence,
  previousMonthSentence,
  putExtraSentence,
} from '@/features/spaces/balanceCopy';
import {
  useDeleteMemberPayment,
  useResolveStoppedRecurrence,
  useSpace,
} from '@/features/spaces/useSpaces';
import { spaceAudience, useFeedback } from '@/features/shared/useFeedback';
import { calculateSharedBalance } from '@domain/shared-balance';
import type { MemberPayment } from '@domain/types';
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
  Sheet,
  Skeleton,
  Stack,
  Text,
} from '@/ui/primitives';
import { PaymentDetail } from './PaymentDetail';
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
  const [selectedPayment, setSelectedPayment] = useState<MemberPayment | null>(null);

  const currentMonth = monthOf(today);

  // §23.4 · los compromisos compartidos de los próximos meses.
  const upcomingShared = useMemo(() => {
    if (derived == null) return [];
    return derived.occurrences
      .filter((occurrence) => occurrence.month > currentMonth)
      .slice(0, 12);
  }, [derived, currentMonth]);

  // §24 · los movimientos del espacio, del mes en curso hacia atrás.
  /**
   * §24 / §25 · los movimientos del espacio: gastos Y pagos entre miembros,
   * por fecha. Solo lo que ya pasó, igual que el saldo: lo que viene está en
   * "Se vienen este mes" y en Próximos meses.
   */
  const movements = useMemo((): SpaceMovement[] => {
    if (derived == null) return [];
    const expenses: SpaceMovement[] = derived.occurrences
      .filter((occurrence) => occurrence.balanceDate <= today)
      .map((occurrence) => ({ kind: 'occurrence', date: occurrence.balanceDate, occurrence }));
    const payments: SpaceMovement[] = derived.facts.payments
      .filter((payment) => payment.date <= today)
      .map((payment) => ({ kind: 'payment', date: payment.date, payment }));

    return [...expenses, ...payments]
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 30);
  }, [derived, today]);

  const deletePayment = useDeleteMemberPayment(spaceId);
  const feedback = useFeedback();
  const { accountState } = useSession();

  // SA-04 · los fijos que detuvo una salida y que quien queda todavía no decidió.
  const stopped = useMemo(
    () => (derived == null ? [] : pendingStoppedFixed(derived.facts, derived.mySlot)),
    [derived],
  );
  const resolveStopped = useResolveStoppedRecurrence(spaceId);
  const [resolving, setResolving] = useState<string | null>(null);

  function resolve(recurrenceId: string, keep: boolean) {
    const item = stopped.find((candidate) => candidate.recurrenceId === recurrenceId);
    if (item == null) return;
    // Desde el mes siguiente al último en que fue compartido.
    const from = formatMonth(addMonths(item.endMonth, 1), currentMonth);

    setResolving(recurrenceId);
    resolveStopped
      .mutateAsync({ recurrenceId, keep })
      .then(() =>
        feedback.updated(
          keep
            ? `Ahora está en tus fijos: ${formatPesos(item.amount)} por mes desde ${from}.`
            : `Deja de contar desde ${from}.`,
        ),
      )
      .catch((cause: unknown) => feedback.error('No pudimos guardarlo', cause))
      .finally(() => setResolving(null));
  }

  /** §25 · "confirmación al eliminar con el nuevo saldo y 'Martina también lo va a dejar de ver'". */
  function confirmDeletePayment(payment: MemberPayment) {
    if (derived == null) return;
    const after = calculateSharedBalance(
      {
        ...derived.facts,
        payments: derived.facts.payments.filter((item) => item.id !== payment.id),
      },
      derived.mySlot,
      today,
    );
    Alert.alert(
      `¿Eliminar este pago?`,
      `${paymentSentence(payment, derived.mySlot, derived.other.displayName)}. ${derived.other.displayName} también lo va a dejar de ver. El saldo pasa a: ${balanceSentence(after).toLowerCase()}.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            setSelectedPayment(null);
            deletePayment
              .mutateAsync(payment.id)
              .then(() =>
                feedback.deleted(
                  spaceAudience(derived.facts.space.name, derived.other),
                  `${balanceSentence(after)}.`,
                ),
              )
              .catch((cause: unknown) => feedback.error('No pudimos eliminar el pago', cause));
          },
        },
      ],
    );
  }

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

        {/* SA-04 · §27 · "¿Lo seguís pagando vos?", arriba de todo: es lo
            que explica por qué cambió el radar. */}
        {stopped.length > 0 && (
          <Animated.View entering={FadeInDown.duration(duration.base)}>
            <StoppedFixedCard
              otherName={stopped[0]!.otherName}
              spaceName={derived.facts.space.name}
              items={stopped.map((item) => ({
                recurrenceId: item.recurrenceId,
                label: item.description ?? prettyLabel(item.category),
                amount: item.amount,
              }))}
              canKeep={accountState === 'personal'}
              busyId={resolving}
              onKeep={(recurrenceId) => resolve(recurrenceId, true)}
              onEnd={(recurrenceId) => resolve(recurrenceId, false)}
            />
          </Animated.View>
        )}

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
            {/* P7 · el lugar de un ex miembro se puede volver a invitar. */}
            {other.status === 'former' && (
              <Row gap="2" align="center">
                <Text variant="small" tone="muted">
                  {other.displayName} · ex miembro
                </Text>
                <Pressable
                  onPress={() => router.push(`/space/${spaceId}/invitar`)}
                  haptic="none"
                >
                  <Text variant="smallMedium" tone="brand">
                    Invitar de nuevo
                  </Text>
                </Pressable>
              </Row>
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
        {(month.total > 0 || month.payments.length > 0 || month.upcoming.length > 0) && (
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
                La marca en cada barra es la parte de cada uno según el reparto. Cuenta lo
                que ya pasó, igual que lo que se deben.
              </Text>

              {/* §25 · "en el mes: Pagos entre ustedes". No cambian lo que cada
                  uno puso (P-04): por eso van aparte, y no en las barras. */}
              {month.payments.length > 0 && (
                <Stack gap="2">
                  <Text variant="smallMedium" tone="secondary">
                    Pagos entre ustedes
                  </Text>
                  {month.payments.map((payment, index) => (
                    <Row key={`${payment.date}-${index}`} justify="space-between" align="baseline">
                      <Text variant="small">
                        {paymentSentence(payment, derived.mySlot, other.displayName)}
                      </Text>
                      <Text variant="caption" tone="muted">
                        {formatDayMonth(payment.date)}
                      </Text>
                    </Row>
                  ))}
                </Stack>
              )}

              {/* Lo que falta del mes: todavía no cuenta (S-02). */}
              {month.upcoming.length > 0 && (
                <Stack gap="2">
                  <Text variant="smallMedium" tone="secondary">
                    Se vienen este mes
                  </Text>
                  {month.upcoming.map((item, index) => (
                    <Row key={`${item.date}-${index}`} justify="space-between" align="baseline">
                      <Text variant="small">
                        {prettyLabel(item.label)} · {formatDayMonth(item.date)}
                      </Text>
                      <Money amount={item.amount} variant="small" />
                    </Row>
                  ))}
                </Stack>
              )}
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
              {movements.map((movement, index) => (
                <Animated.View
                  key={
                    movement.kind === 'occurrence'
                      ? movement.occurrence.id
                      : `payment-${movement.payment.id}`
                  }
                  layout={LinearTransition}
                  entering={FadeInDown.delay(stagger(index, 35)).duration(duration.base)}
                >
                  {movement.kind === 'occurrence' ? (
                    <SharedRow
                      occurrence={movement.occurrence}
                      mySlot={derived.mySlot}
                      otherName={other.displayName}
                      myName={me.displayName}
                      onPress={
                        // Un fijo compartido se edita desde su propio fijo; un
                        // gasto, desde el detalle del gasto.
                        movement.occurrence.sourceKind === 'expense'
                          ? () =>
                              router.push(
                                `/space/${spaceId}/gasto/${movement.occurrence.sourceId}`,
                              )
                          : undefined
                      }
                    />
                  ) : (
                    <PaymentRow
                      sentence={paymentSentence(movement.payment, derived.mySlot, other.displayName)}
                      date={movement.payment.date}
                      amount={movement.payment.amount}
                      onPress={() => setSelectedPayment(movement.payment)}
                    />
                  )}
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
        // P7 · el lugar de un ex miembro también se puede invitar.
        otherHasAccess={other.status === 'active'}
        // §26 · solo quien creó el espacio, y solo si el otro está adentro.
        canRemoveOther={me.isCreator && other.status === 'active'}
      />

      {/* §25 · tocar un pago lo muestra; eliminar queda adentro. */}
      <Sheet
        visible={selectedPayment != null}
        onClose={() => setSelectedPayment(null)}
        title="Pago entre ustedes"
      >
        {selectedPayment != null && (
          <PaymentDetail
            sentence={paymentSentence(selectedPayment, derived.mySlot, other.displayName)}
            date={selectedPayment.date}
            recordedBy={{
              isMe: selectedPayment.recordedBySlot === derived.mySlot,
              name:
                derived.facts.space.members.find(
                  (member) => member.slot === selectedPayment.recordedBySlot,
                )?.displayName ?? other.displayName,
            }}
            // La confirmación sale sobre la hoja abierta: cerrar un Modal y
            // abrir un Alert a la vez puede perder el Alert en iOS. Cancelar
            // vuelve al detalle; eliminar cierra la hoja.
            onDelete={() => confirmDeletePayment(selectedPayment)}
          />
        )}
      </Sheet>
    </ScrollView>
  );
}

/**
 * §24 · la barra de lo que puso cada uno, con la marca de su parte.
 *
 * "Parte" y no "le corresponde" (decisión del 10/10): en la pantalla de las
 * deudas, "te corresponden $350.000" se leía como plata que te deben. "Parte"
 * es el sinónimo exacto del glosario (§7.2).
 */
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
  const isViewer = tone === 'viewer';

  return (
    <Stack gap="2">
      <Row justify="space-between" align="baseline">
        <Text variant="small" tone="secondary">
          {isViewer ? 'Pusiste' : `${name} puso`}
        </Text>
        <Money amount={put} variant="smallMedium" />
      </Row>

      <ContributionBar put={put} share={share} max={max} tone={tone} index={index} />

      <Row justify="flex-end">
        <Text variant="caption" tone="muted">
          {isViewer ? 'tu parte ' : 'su parte '}
        </Text>
        <Money amount={share} variant="caption" tone="muted" />
      </Row>
    </Stack>
  );
}

type SpaceMovement =
  | { kind: 'occurrence'; date: string; occurrence: SpaceOccurrence }
  | { kind: 'payment'; date: string; payment: MemberPayment };

/**
 * §25 · un pago entre miembros en los movimientos del espacio. P-04: no cambia
 * lo que cada uno puso ni el radar; solo lo que se deben.
 */
function PaymentRow({
  sentence,
  date,
  amount,
  onPress,
}: {
  sentence: string;
  date: string;
  amount: number;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      haptic="none"
      scaleOnPress={false}
      accessibilityRole="button"
      accessibilityLabel={sentence}
      style={{ paddingVertical: theme.space['3'] }}
    >
      <Row gap="3" align="flex-start">
        <View style={{ flex: 1, gap: 3 }}>
          <Text variant="bodyMedium" numberOfLines={1}>
            {sentence}
          </Text>
          <Text variant="caption" tone="muted">
            {formatDayMonth(date)} · pago entre ustedes · no cambia lo que cada uno puso
          </Text>
        </View>
        <Money amount={amount} variant="bodyMedium" tone="muted" />
      </Row>
    </Pressable>
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
            tu parte <Money amount={myShare} variant="caption" tone="shared" />
          </Text>
        </View>

        <Money amount={occurrence.amount} variant="bodyMedium" />
      </Row>
    </Pressable>
  );
}
