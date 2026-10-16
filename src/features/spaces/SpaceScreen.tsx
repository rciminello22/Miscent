import { useMemo, useState, type ReactNode } from 'react';
import { Alert, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, CircleUser, MoreHorizontal, Plus, UserPlus } from 'lucide-react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addMonths, monthOf } from '@domain/calendar';
import { pendingStoppedFixed } from '@domain/departure';
import { paidByMeWithoutMethod } from '@domain/paidByMe';
import { formatMonth, formatPesos } from '@/lib/format';
import { prettyLabel } from '@/features/add/categories';
import { useSession } from '@/features/auth/SessionProvider';
import { StoppedFixedCard } from './StoppedFixedCard';
import { PaidByMeSection } from './PaidByMeSection';
import { paidByOtherTitle } from './paidByMeCopy';
import { deletedLabel, deletedTag, markAllLabel, reviewTag, toReviewLine } from './reviewCopy';
import { usePersonalFacts } from '@/features/shared/usePersonalFacts';
import { balanceSentence, paymentSentence, prepaidInstallmentsSentence } from '@/features/spaces/balanceCopy';
import {
  useDeleteMemberPayment,
  useMarkReviewed,
  useResolveStoppedRecurrence,
  useSpace,
} from '@/features/spaces/useSpaces';
import { spaceAudience, useFeedback } from '@/features/shared/useFeedback';
import { calculateSharedBalance } from '@domain/shared-balance';
import type { MemberPayment } from '@domain/types';
import { SpaceMenu } from '@/features/spaces/SpaceMenu';
import { spaceSummaryText } from './shareSummary';
import { ActivityList } from './ActivityList';
import { GuestWelcome, PersonalMoneyCard } from './GuestCards';
import { useRememberedFlag } from '@/features/shared/useRememberedFlag';
import { activityLine, activityWhen } from './activityCopy';
import {
  AudienceBadge,
  Button,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  IconButton,
  Pressable,
  Row,
  RowChevron,
  SectionHeader,
  Sheet,
  Skeleton,
  Stack,
  Text,
  TextLink,
} from '@/ui/primitives';
import { Disclosure } from './Disclosure';
import { PaymentDetail } from './PaymentDetail';
import { DeletedRow, PaymentRow, ReviewTag, SharedRow, type SpaceMovement } from './SpaceRows';
import { SpaceMonthCard } from './SpaceMonthCard';
import { limitMovements, pendingGroupTitle, planSpaceLayout } from './spaceLayout';
import { duration, stagger } from '@/ui/motion';
import { useTheme } from '@/ui/theme';
import { useBottomPadding } from '@/ui/useBottomPadding';

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
 *
 * UX-05 · el orden lo decide `planSpaceLayout` (puro): primero el saldo y las
 * dos acciones, después los pendientes en una sola fila, el mes, Próximos meses
 * y Movimientos. Este archivo es el container: trae los datos, y las piezas de
 * dibujo están en `SpaceMonthCard` y `SpaceRows`.
 */

/**
 * Qué va arriba a la izquierda. Lo decide la ruta que muestra el espacio:
 *   back    · una flecha con su destino
 *   profile · el invitado con un solo espacio, para quien el espacio ES su
 *             pantalla principal (§33 U1): no hay a dónde volver
 */
/** §33 U1 · "Ahora no" vale para siempre, en la lista y en el espacio. */
export const PERSONAL_CARD_NOT_NOW = 'radar.u1.personalCard.notNow';

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
  inTabs = false,
}: {
  spaceId: string;
  leading: SpaceLeading;
  /** Lo que la ruta quiera sumar al final (p. ej. "Crear otro espacio"). */
  footer?: ReactNode;
  /**
   * Dentro de la barra de pestañas (Estado A): la barra ya lleva el inset de
   * abajo y el botón Agregar flotante está oculto adentro de un espacio.
   */
  inTabs?: boolean;
}) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPad = useBottomPadding({ tabs: inTabs, fab: false });

  const { derived, today, isLoading, isError, refetch } = useSpace(spaceId);
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Should 6 · la actividad reciente, en su propia hoja.
  const [activityOpen, setActivityOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<MemberPayment | null>(null);
  // UX-05 · lo plegable. `null` = lo que decida `planSpaceLayout`.
  const [pendingOpen, setPendingOpen] = useState<boolean | null>(null);
  const [monthDetailOpen, setMonthDetailOpen] = useState(false);
  const [upcomingOpen, setUpcomingOpen] = useState(false);
  const [movementsExpanded, setMovementsExpanded] = useState(false);

  const currentMonth = monthOf(today);

  // §23.4 · los compromisos compartidos de los próximos meses. Se ven todos,
  // en su hoja: nada se corta sin avisar.
  const upcomingShared = useMemo(() => {
    if (derived == null) return [];
    return derived.occurrences.filter((occurrence) => occurrence.month > currentMonth);
  }, [derived, currentMonth]);

  /**
   * §24 / §25 · los movimientos del espacio: gastos Y pagos entre miembros,
   * por fecha. Solo lo que ya pasó, igual que el saldo: lo que viene está en
   * "Se vienen este mes" y en Próximos meses. Todos; el recorte lo hace
   * `limitMovements` y avisa cuántos quedan.
   */
  const movements = useMemo((): SpaceMovement[] => {
    if (derived == null) return [];
    const expenses: SpaceMovement[] = derived.occurrences
      .filter((occurrence) => occurrence.balanceDate <= today)
      .map((occurrence) => ({ kind: 'occurrence', date: occurrence.balanceDate, occurrence }));
    const payments: SpaceMovement[] = derived.facts.payments
      .filter((payment) => payment.date <= today)
      .map((payment) => ({ kind: 'payment', date: payment.date, payment }));

    return [...expenses, ...payments].sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [derived, today]);

  const deletePayment = useDeleteMemberPayment(spaceId);
  const feedback = useFeedback();

  // Opción B · la marca va UNA vez por registro, en su ocurrencia más
  // reciente de la lista: un fijo tiene una por mes, y marcarlas todas es ruido.
  const taggedOccurrences = useMemo(() => {
    const tagged = new Set<string>();
    if (derived == null) return tagged;
    const seen = new Set<string>();
    for (const movement of movements) {
      if (movement.kind !== 'occurrence') continue;
      const { sourceId, id } = movement.occurrence;
      if (!derived.pendingReview.has(sourceId) || seen.has(sourceId)) continue;
      seen.add(sourceId);
      tagged.add(id);
    }
    return tagged;
  }, [derived, movements]);

  const markReviewed = useMarkReviewed(spaceId);

  function reviewIds(sourceIds: readonly string[], detail: string) {
    markReviewed
      .mutateAsync(sourceIds)
      .then(() => feedback.updated(detail))
      .catch((cause: unknown) => feedback.error('No pudimos marcarlo', cause));
  }

  function reviewAll() {
    if (derived == null) return;
    reviewIds(
      [...derived.pendingReview.keys(), ...derived.pendingDeletions.map((item) => item.sourceId)],
      'Listo, ya lo revisaste.',
    );
  }
  const { accountState } = useSession();
  // §33 U1 · para el invitado con un solo espacio, esta ES su pantalla
  // principal: bienvenida única y "Tu plata personal", que nunca insiste.
  const isGuestHome = accountState === 'guest' && leading.kind === 'profile';
  const [welcomed, markWelcomed] = useRememberedFlag(`radar.u1.welcome.${spaceId}`);
  const [notNow, markNotNow] = useRememberedFlag(PERSONAL_CARD_NOT_NOW);
  // Con el detalle privado de pago, que solo está en los hechos personales.
  const { facts: personalFacts } = usePersonalFacts();
  const myMembership = personalFacts.spaces.find(
    (membership) => membership.facts.space.id === spaceId,
  );

  // Lo que el otro cargó como pagado por vos, sin medio: solo con cuenta personal.
  const paidByOtherCount = useMemo(
    () =>
      accountState === 'personal' && myMembership != null
        ? paidByMeWithoutMethod(myMembership, today, { includeOwn: false }).length
        : 0,
    [accountState, myMembership, today],
  );

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
  const nameOf = (slot: 1 | 2) => (slot === derived.mySlot ? me.displayName : other.displayName);

  // Should 3 · lo mismo que se ve acá, escrito para leerse fuera de la app.
  const summaryText = spaceSummaryText({
    spaceName: derived.facts.space.name,
    monthName: formatMonth(currentMonth, currentMonth),
    myName: me.displayName,
    otherName: other.displayName,
    balance,
    month: { total: month.total, mine: month.viewer, other: month.other },
    expenses: derived.occurrences
      .filter((item) => item.month === currentMonth && item.balanceDate <= today)
      .sort((a, b) => (a.balanceDate < b.balanceDate ? 1 : -1))
      .map((item) => ({
        date: item.balanceDate,
        label: prettyLabel(item.label),
        amount: item.amount,
        payerName: nameOf(item.payerSlot),
      })),
    payments: month.payments.map((payment) => ({
      date: payment.date,
      fromName: nameOf(payment.fromSlot),
      toName: nameOf(payment.toSlot),
      amount: payment.amount,
    })),
  });
  const toReviewCount = derived.pendingReview.size + derived.pendingDeletions.length;

  // UX-05 · qué secciones se muestran y en qué orden (puro, con test).
  const layout = planSpaceLayout({
    stoppedFixed: stopped.length,
    paidByOther: paidByOtherCount,
    toReview: toReviewCount,
    month: {
      total: month.total,
      payments: month.payments.length,
      upcoming: month.upcoming.length,
      categories: month.byCategory.length,
    },
    upcomingMonths: upcomingShared.length,
    movements: movements.length,
  });
  const shown = limitMovements(movements, movementsExpanded);
  const showPay = !balance.settled && settlement != null;

  const sections: Record<(typeof layout.sections)[number], ReactNode> = {
    /* ── El saldo compartido ─────────────────────────────────────────── */
    balance: (
      <Animated.View key="balance" entering={FadeInDown.duration(duration.deliberate)}>
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
              <TextLink
                label="Invitar"
                variant="smallMedium"
                onPress={() => router.push(`/space/${spaceId}/invitar`)}
              />
            </Row>
          )}
          {/* P7 · el lugar de un ex miembro se puede volver a invitar. */}
          {other.status === 'former' && (
            <Row gap="2" align="center">
              <Text variant="small" tone="muted">
                {other.displayName} · ex miembro
              </Text>
              <TextLink
                label="Invitar de nuevo"
                variant="smallMedium"
                onPress={() => router.push(`/space/${spaceId}/invitar`)}
              />
            </Row>
          )}

          {/* §25 · el aviso de adelanto, para que el número no se lea mal. */}
          {prepaidInstallmentsSentence(balance, pendingInstallments) != null && (
            <Card tone="shared">
              <Text variant="small">{prepaidInstallmentsSentence(balance, pendingInstallments)}</Text>
            </Card>
          )}
        </Stack>
      </Animated.View>
    ),

    /* ── Las dos acciones, juntas, debajo del saldo ──────────────────── */
    actions: (
      <Row key="actions" gap="3">
        {showPay && (
          <Button
            label="Registrar pago"
            variant="secondary"
            fullWidth
            style={{ flex: 1 }}
            onPress={() => router.push(`/space/${spaceId}/pago`)}
          />
        )}
        <Button
          label="Agregar gasto"
          variant="shared"
          fullWidth
          style={{ flex: 1 }}
          icon={<Plus size={16} color={theme.colors.textOnBrand} />}
          onPress={() => router.push(`/space/${spaceId}/agregar`)}
        />
      </Row>
    ),

    /* ── Pendientes: UNA fila; cada tarjeta sigue existiendo adentro ──── */
    pending:
      layout.pending == null ? null : (
        <Disclosure
          key="pending"
          title={pendingGroupTitle(layout.pending.count)}
          open={pendingOpen ?? layout.pending.startsOpen}
          onToggle={() => setPendingOpen(!(pendingOpen ?? layout.pending!.startsOpen))}
        >
          {/* SA-04 · §27 · "¿Lo seguís pagando vos?": explica por qué cambió el radar. */}
          {stopped.length > 0 && (
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
          )}

          {/* §5 1º Should · lo que el otro cargó como pagado por vos, sin medio:
              hasta que se completa, no entra al resumen de tu tarjeta. */}
          {accountState === 'personal' && myMembership != null && (
            <PaidByMeSection
              membership={myMembership}
              methods={personalFacts.paymentMethods}
              today={today}
              includeOwn={false}
              title={(count) => paidByOtherTitle(other.displayName, count)}
            />
          )}

          {/* Opción B · lo que cargó el otro y no revisaste. Revisar no es
              aprobar: ya cuenta, igual para los dos. */}
          {toReviewCount > 0 && (
            <Row justify="space-between" align="center" gap="3">
              <ReviewTag label={toReviewLine(toReviewCount)} />
              <Button
                label={markAllLabel(toReviewCount)}
                variant="ghost"
                loading={markReviewed.isPending}
                onPress={() => reviewAll()}
              />
            </Row>
          )}
        </Disclosure>
      ),

    /* ── §24 · el mes del espacio ────────────────────────────────────── */
    month: (
      <Animated.View key="month" entering={FadeInDown.delay(stagger(1, 80)).duration(duration.base)}>
        <SpaceMonthCard
          month={month}
          mySlot={derived.mySlot}
          otherName={other.displayName}
          currentMonth={currentMonth}
          hasDetail={layout.monthDetail}
          detailOpen={monthDetailOpen}
          onToggleDetail={() => setMonthDetailOpen((open) => !open)}
        />
      </Animated.View>
    ),

    /* ── §23.4 · Próximos meses del espacio, en su hoja ──────────────── */
    upcoming: (
      <Pressable
        key="upcoming"
        onPress={() => setUpcomingOpen(true)}
        haptic="none"
        scaleOnPress={false}
        accessibilityRole="button"
        accessibilityLabel={`Próximos meses de ${derived.facts.space.name}`}
        style={{ minHeight: 48, justifyContent: 'center' }}
      >
        <Row justify="space-between" align="center" gap="3">
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="bodyMedium">Próximos meses de {derived.facts.space.name}</Text>
            <Text variant="caption" tone="muted">
              {upcomingShared.length === 1
                ? '1 compromiso entre los dos'
                : `${upcomingShared.length} compromisos entre los dos`}
            </Text>
          </View>
          <RowChevron />
        </Row>
      </Pressable>
    ),

    /* ── §24 · Movimientos del espacio ───────────────────────────────── */
    movements: (
      <Stack key="movements" gap="4">
        <SectionHeader title={`Movimientos de ${derived.facts.space.name}`} />

        {/* Opción B · lo que eliminó el otro ya no está en la lista: queda
            su rastro hasta que lo revisás. */}
        {derived.pendingDeletions.length > 0 && (
          <Stack gap="0">
            {derived.pendingDeletions.map((item, index) => (
              <View key={`deleted-${item.sourceId}`}>
                <DeletedRow
                  item={item}
                  label={deletedLabel(item, {
                    mySlot: derived.mySlot,
                    otherName: other.displayName,
                    categoryLabel: prettyLabel,
                  })}
                  tag={deletedTag(other.displayName)}
                  onReviewed={() => reviewIds([item.sourceId], 'Listo, ya lo revisaste.')}
                />
                {index < derived.pendingDeletions.length - 1 && <Divider />}
              </View>
            ))}
          </Stack>
        )}

        {movements.length === 0 ? (
          <EmptyState
            title="Anoten acá lo que pagan para la casa."
            description="La app hace las cuentas."
          />
        ) : (
          <Stack gap="0">
            {shown.visible.map((movement, index) => (
              <Animated.View
                key={
                  movement.kind === 'occurrence'
                    ? movement.occurrence.id
                    : `payment-${movement.payment.id}`
                }
                layout={LinearTransition}
                entering={
                  index < 10
                    ? FadeInDown.delay(stagger(index, 35)).duration(duration.base)
                    : undefined
                }
              >
                {movement.kind === 'occurrence' ? (
                  <SharedRow
                    occurrence={movement.occurrence}
                    mySlot={derived.mySlot}
                    otherName={other.displayName}
                    myName={me.displayName}
                    reviewTag={
                      taggedOccurrences.has(movement.occurrence.id)
                        ? reviewTag(
                            other.displayName,
                            derived.pendingReview.get(movement.occurrence.sourceId)!,
                          )
                        : null
                    }
                    onPress={() =>
                      // Un gasto se edita desde su detalle; un fijo, desde el
                      // fijo (§21: los dos lo editan), no desde un mes suelto.
                      router.push(
                        movement.occurrence.sourceKind === 'expense'
                          ? `/space/${spaceId}/gasto/${movement.occurrence.sourceId}`
                          : `/space/${spaceId}/fijo/${movement.occurrence.sourceId}`,
                      )
                    }
                  />
                ) : (
                  <PaymentRow
                    sentence={paymentSentence(movement.payment, derived.mySlot, other.displayName)}
                    date={movement.payment.date}
                    amount={movement.payment.amount}
                    reviewTag={
                      derived.pendingReview.has(movement.payment.id)
                        ? reviewTag(other.displayName, 'created')
                        : null
                    }
                    onPress={() => setSelectedPayment(movement.payment)}
                  />
                )}
                {index < shown.visible.length - 1 && <Divider />}
              </Animated.View>
            ))}
          </Stack>
        )}

        {/* Nunca se corta sin avisar: dice cuántos faltan y los muestra todos. */}
        {shown.hidden > 0 && (
          <Button
            label={`Ver todos (${movements.length})`}
            variant="ghost"
            fullWidth
            onPress={() => setMovementsExpanded(true)}
          />
        )}
      </Stack>
    ),
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + theme.space['3'],
        paddingBottom: bottomPad,
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
            // UX-12 · el dibujo mide 30; el área de toque llega a 44.
            <IconButton
              label="Perfil"
              size={30}
              filled={false}
              onPress={() => router.push('/(guest)/perfil')}
              style={{ marginLeft: -theme.space['1'] }}
              icon={<CircleUser size={22} color={theme.colors.textSecondary} />}
            />
          ) : (
            <IconButton
              label="Volver"
              size={28}
              filled={false}
              onPress={leading.onPress}
              style={{ marginLeft: -theme.space['1'] }}
              icon={<ArrowLeft size={20} color={theme.colors.textSecondary} />}
            />
          )}

          <Row gap="3" align="center">
            {/* §12 · el encabezado dice quién lo ve. */}
            <AudienceBadge audience={{ kind: 'shared', otherMemberName: other.displayName }} />

            {/* §24 · Renombrar · Invitar · Salir */}
            <IconButton
              label="Opciones del espacio"
              size={32}
              onPress={() => setMenuOpen(true)}
              icon={<MoreHorizontal size={16} color={theme.colors.textSecondary} />}
            />
          </Row>
        </Row>

        {/* §33 U1 · "Bienvenida única". */}
        {isGuestHome && welcomed === false && (
          <GuestWelcome
            spaceName={derived.facts.space.name}
            otherName={other.displayName}
            onDismiss={markWelcomed}
          />
        )}

        {layout.sections.map((section) => sections[section])}

        {other.status === 'no_access' && (
          <Button
            label={`Invitar a ${other.displayName}`}
            variant="secondary"
            fullWidth
            icon={<UserPlus size={16} color={theme.colors.text} />}
            onPress={() => router.push(`/space/${spaceId}/invitar`)}
          />
        )}

        {/* §33 U1 · "Tarjeta fija 'Tu plata personal'". */}
        {isGuestHome && notNow != null && (
          <PersonalMoneyCard
            spaceName={derived.facts.space.name}
            otherName={other.displayName}
            reduced={notNow}
            onCreate={() => router.push('/onboarding/cuenta-personal')}
            onNotNow={markNotNow}
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
        summaryText={summaryText}
        // Una hoja por vez: se cierra el menú y la actividad abre después
        // (dos Modal juntos se pisan en iOS).
        onShowActivity={() => {
          setMenuOpen(false);
          setTimeout(() => setActivityOpen(true), 350);
        }}
      />

      <Sheet visible={activityOpen} onClose={() => setActivityOpen(false)} title="Actividad reciente">
        <ActivityList
          items={derived.activity.map((event) => ({
            key: event.key,
            line: activityLine(event, {
              mySlot: derived.mySlot,
              otherName: other.displayName,
              categoryLabel: prettyLabel,
            }),
            when: activityWhen(event.at, today),
          }))}
        />
      </Sheet>

      {/* §23.4 · Próximos meses del espacio: lo comprometido entre los dos. */}
      <Sheet
        visible={upcomingOpen}
        onClose={() => setUpcomingOpen(false)}
        title={`Próximos meses de ${derived.facts.space.name}`}
      >
        <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
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
            <Text variant="caption" tone="muted" style={{ marginTop: theme.space['3'] }}>
              Lo que ya está comprometido entre los dos. Lo ven ambos.
            </Text>
          </Stack>
        </ScrollView>
      </Sheet>

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
            review={
              derived.pendingReview.has(selectedPayment.id)
                ? {
                    // Los pagos no se editan: siempre los cargó el otro.
                    label: reviewTag(other.displayName, 'created'),
                    onReviewed: () => {
                      setSelectedPayment(null);
                      reviewIds([selectedPayment.id], 'Listo, ya lo revisaste.');
                    },
                  }
                : undefined
            }
            onDelete={() => confirmDeletePayment(selectedPayment)}
          />
        )}
      </Sheet>
    </ScrollView>
  );
}
