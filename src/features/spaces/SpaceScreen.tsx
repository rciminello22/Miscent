import { useMemo, useState, type ReactNode } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, CalendarRange, CircleUser, ClipboardCheck, MoreHorizontal, ReceiptText } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { monthOf } from '@domain/calendar';
import { formatMonth, formatPesos } from '@/lib/format';
import { prettyLabel } from '@/features/add/categories';
import { useSession } from '@/features/auth/SessionProvider';
import {
  balanceLines,
  balanceSentence,
  prepaidInstallmentsSentence,
} from '@/features/spaces/balanceCopy';
import { useSpace } from '@/features/spaces/useSpaces';
import { SpaceMenu } from '@/features/spaces/SpaceMenu';
import { spaceSummaryText } from './shareSummary';
import { ActivityList } from './ActivityList';
import { GuestWelcome, PersonalMoneyCard } from './GuestCards';
import { useRememberedFlag } from '@/features/shared/useRememberedFlag';
import { activityLine, activityWhen } from './activityCopy';
import {
  AudienceBadge,
  Door,
  EmptyState,
  ErrorState,
  IconButton,
  Row,
  Sheet,
  Skeleton,
  Stack,
  Text,
} from '@/ui/primitives';
import { SpaceHero } from './SpaceHero';
import { SpaceBalanceScale } from './SpaceBalanceScale';
import { PutSplitBar } from './SpaceRows';
import { guestHomeBlocks } from './guestHome';
import { planSpaceLayout } from './spaceLayout';
import { contributionSplit, monthDoorCopy } from './spaceMonth';
import { buildSpaceMovements, movementsDoorCaption, paymentTitle } from './spaceMovements';
import { useOpenSpaceDetail } from './useOpenSpace';
import { useSpacePendings } from './useSpacePendings';
import { duration, stagger } from '@/ui/motion';
import { useTheme } from '@/ui/theme';
import { useBottomPadding } from '@/ui/useBottomPadding';

/**
 * §24 · la pantalla del espacio compartido, en tres niveles.
 *
 * "Igual para los dos miembros, en segunda persona; igual en Estado A y B."
 *
 *   N1 · ¿cómo están las cuentas entre los dos? La balanza, la frase del saldo y
 *        las acciones, en un panel teñido (`SpaceHero`).
 *   N2 · como mucho tres puertas: Pendientes (solo si hay), el Mes y los
 *        Movimientos. Cada una abre su pantalla (N3). Nada de desplegables.
 *
 * Y tiene una prohibición que es el corazón de CA-25: **nunca se muestra la
 * diferencia entre lo que pusieron como si fuera la deuda**. Si Renzo puso
 * $700.000 y Martina $100.000 con reparto 50/50, la deuda es $300.000, no
 * $600.000. Por eso el saldo sale de `calculateSharedBalance` y las barras de
 * "puso" viven en el Detalle del mes, con su propio título: un pago entre
 * ustedes cambia el saldo, no lo que cada uno puso (P-04).
 *
 * E-09 · el espacio no muestra ni infiere cuánto dinero tiene cada miembro.
 *
 * Este archivo es el container: trae los datos y `planSpaceLayout` (puro)
 * decide qué puertas hay. Las piezas de dibujo están en `SpaceHero` y `Door`.
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
  inTabs = false,
}: {
  spaceId: string;
  leading: SpaceLeading;
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
  const openDetail = useOpenSpaceDetail();

  const { derived, today, isLoading, isError, refetch } = useSpace(spaceId);
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Should 6 · la actividad reciente, en su propia hoja.
  const [activityOpen, setActivityOpen] = useState(false);

  const currentMonth = monthOf(today);
  const pendings = useSpacePendings(spaceId, derived, today);
  const { accountState } = useSession();

  // §33 U1 · para el invitado con un solo espacio, esta ES su pantalla
  // principal: bienvenida única y "Tu plata personal", que nunca insiste.
  const isGuestHome = accountState === 'guest' && leading.kind === 'profile';
  const [welcomed, markWelcomed] = useRememberedFlag(`radar.u1.welcome.${spaceId}`);
  const [notNow, markNotNow] = useRememberedFlag(PERSONAL_CARD_NOT_NOW);
  const guest = guestHomeBlocks({ isGuestHome, welcomed, notNow });

  /**
   * §24 / §25 · los movimientos del espacio: gastos Y pagos entre miembros.
   * Solo lo que ya pasó, igual que el saldo.
   */
  const movements = useMemo(
    () =>
      derived == null
        ? []
        : buildSpaceMovements({
            occurrences: derived.occurrences,
            payments: derived.facts.payments,
            today,
          }),
    [derived, today],
  );

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

  const upcomingMonths = derived.occurrences.filter((occurrence) => occurrence.month > currentMonth).length;

  // Qué puertas hay y en qué orden (puro, con test).
  const layout = planSpaceLayout({
    stoppedFixed: pendings.counts.stoppedFixed,
    paidByOther: pendings.counts.paidByOther,
    toReview: pendings.counts.toReview,
    month: {
      total: month.total,
      payments: month.payments.length,
      upcoming: month.upcoming.length,
    },
    upcomingMonths,
    movements: movements.length,
    deletions: derived.pendingDeletions.length,
  });

  const showPay = !balance.settled && settlement != null;

  // N1 · §24: "Martina · todavía no entró · Invitar" y "ex miembro" (P7). La
  // invitación es UNA sola, en el panel: el lugar vacío del otro.
  const inviteNote =
    other.status === 'no_access'
      ? `${other.displayName} todavía no entró. Cargás por los dos.`
      : other.status === 'former'
        ? `${other.displayName} · ex miembro`
        : null;
  const invite =
    other.status === 'no_access'
      ? { label: `Invitar a ${other.displayName}`, onPress: () => router.push(`/space/${spaceId}/invitar`) }
      : other.status === 'former'
        ? { label: 'Invitar de nuevo', onPress: () => router.push(`/space/${spaceId}/invitar`) }
        : null;

  // La puerta del mes: "Octubre · $700.000 entre los dos" y lo que puso cada uno.
  const monthCopy = monthDoorCopy({ month: currentMonth, currentMonth, total: month.total });
  const split = contributionSplit({ me: month.viewer.put, other: month.other.put });

  const last = movements[0];
  const lastLabel =
    last == null
      ? null
      : last.kind === 'occurrence'
        ? prettyLabel(last.occurrence.label)
        : paymentTitle(last.payment, derived.mySlot, other.displayName);

  const doors: Record<(typeof layout.doors)[number], ReactNode> = {
    /* SA-04 · con un fijo detenido la puerta es urgente: la pregunta
       "¿Lo seguís pagando vos?" no puede quedar escondida. */
    pending:
      layout.pending == null ? null : (
        <Door
          key="pending"
          icon={ClipboardCheck}
          title="Pendientes"
          caption={layout.pending.caption}
          attention={layout.pending.urgent ? 'urgent' : 'attention'}
          onPress={() => openDetail(spaceId, 'pendientes')}
        />
      ),

    /* §24 · el mes del espacio. P-04: la barra es lo que PUSO cada uno ese
       mes, rotulada así; un pago no la cambia y no compite con la balanza. */
    month: (
      <Door
        key="month"
        icon={CalendarRange}
        title={monthCopy.title}
        value={monthCopy.value}
        caption={monthCopy.caption}
        accessibilityLabel={
          split == null
            ? [monthCopy.title, monthCopy.value, monthCopy.caption].filter(Boolean).join('. ')
            : `${monthCopy.title}. ${monthCopy.value} ${monthCopy.caption}. Lo que puso cada uno este mes: vos ${formatPesos(month.viewer.put, { sign: 'never' })}, ${other.displayName} ${formatPesos(month.other.put, { sign: 'never' })}`
        }
        onPress={() => openDetail(spaceId, 'mes')}
      >
        {split != null && (
          <>
            <PutSplitBar me={split.me} other={split.other} />
            <Text variant="caption" tone="muted">
              Lo que puso cada uno este mes
            </Text>
          </>
        )}
      </Door>
    ),

    movements: (
      <Door
        key="movements"
        icon={ReceiptText}
        title="Movimientos"
        caption={movementsDoorCaption({
          count: movements.length,
          last: last == null || lastLabel == null ? null : { label: lastLabel, date: last.date },
          today,
        })}
        onPress={() => openDetail(spaceId, 'movimientos')}
      />
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
      <Stack gap="5">
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
        {guest.welcome && (
          <GuestWelcome
            spaceName={derived.facts.space.name}
            otherName={other.displayName}
            onDismiss={markWelcomed}
          />
        )}

        {/* N1 · la respuesta. */}
        <Animated.View entering={FadeInDown.duration(duration.deliberate)}>
          <SpaceHero
            spaceName={derived.facts.space.name}
            scale={
              <SpaceBalanceScale
                spaceId={spaceId}
                balance={balance}
                myName={me.displayName}
                other={other}
              />
            }
            sentence={balanceSentence(balance)}
            lines={balanceLines(balance)}
            // §25 · el aviso de adelanto, para que el número no se lea mal.
            advance={prepaidInstallmentsSentence(balance, pendingInstallments)}
            note={inviteNote}
            invite={invite}
            onPay={showPay ? () => router.push(`/space/${spaceId}/pago`) : null}
            onAdd={() => router.push(`/space/${spaceId}/agregar`)}
          />
        </Animated.View>

        {/* N2 · como mucho tres puertas. */}
        {layout.doors.map((door, index) => (
          <Animated.View
            key={door}
            entering={FadeInDown.delay(stagger(index + 1, 80)).duration(duration.base)}
          >
            {doors[door]}
          </Animated.View>
        ))}

        {layout.empty && (
          <EmptyState
            title="Anoten acá lo que pagan para la casa."
            description="La app hace las cuentas."
          />
        )}

        {/* §33 U1 · "Tarjeta fija 'Tu plata personal'". */}
        {guest.personalCard != null && (
          <PersonalMoneyCard
            spaceName={derived.facts.space.name}
            otherName={other.displayName}
            reduced={guest.personalCard === 'line'}
            onCreate={() => router.push('/onboarding/cuenta-personal')}
            onNotNow={markNotNow}
          />
        )}
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
    </ScrollView>
  );
}
