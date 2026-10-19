import { useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import type { SpaceOccurrence } from '@domain/occurrences';
import { ArrowRightLeft, CalendarClock, ChevronLeft, ChevronRight } from 'lucide-react-native';
import {
  addMonths,
  compareMonths,
  monthOf,
  type Month,
} from '@domain/calendar';
import { calculateSpaceMonth } from '@domain/shared-balance';
import { formatDayMonth, formatInstallment, formatMonth } from '@/lib/format';
import { categoryMeta, prettyLabel } from '@/features/add/categories';
import { goBack } from '@/features/shared/navigation';
import { Divider, IconButton, Money, Stack, Text, SectionHeader } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import { paymentSentence, previousMonthSentence, putExtraSentence } from './balanceCopy';
import { initialOf } from './balanceScaleState';
import { monthBounds, parseMonthParam, stepMonths } from './spaceMonth';
import { LedgerRow, MemberContribution } from './SpaceRows';
import { SpaceDetailShell } from './SpaceDetailShell';
import { occurrenceHref } from './spaceNavigation';
import { useSpace } from './useSpaces';

/**
 * El Detalle del mes del espacio (N3): acá viven la barra de lo que puso cada
 * uno, las categorías, los pagos entre ustedes y lo que se viene.
 *
 * El selector de mes cubre también los próximos meses (§23.4): el mes siguiente
 * muestra los compromisos compartidos, y reemplaza a la hoja "Próximos meses".
 *
 * CA-25 · "pusiste $X de más" y el puente con el mes anterior son DOS frases
 * separadas, sin total ni signo igual: nunca la diferencia como si fuera la deuda.
 * P-04 · las barras son lo que PUSO cada uno, y un pago entre ustedes no las
 * cambia: por eso tienen su propio título y su propia nota, y ya no conviven con
 * la balanza.
 */
export function SpaceMonthScreen({
  spaceId,
  monthParam,
  inTabs,
}: {
  spaceId: string;
  /** `?mes=2026-11`: el mes con el que se abre. */
  monthParam?: string;
  inTabs: boolean;
}) {
  const router = useRouter();
  const theme = useTheme();
  const { derived, today, isLoading, isError, refetch } = useSpace(spaceId);
  const current = monthOf(today);
  const [selected, setSelected] = useState<Month>(() => parseMonthParam(monthParam, current));

  const bounds = useMemo(() => {
    if (derived == null) return { min: current, max: current };
    return monthBounds({
      months: [
        ...derived.occurrences.map((occurrence) => occurrence.month),
        ...derived.facts.payments.map((payment) => monthOf(payment.date)),
        // Un mes pedido por la ruta siempre se puede ver.
        selected,
      ],
      current,
    });
  }, [derived, current, selected]);
  const { prev, next } = stepMonths(selected, bounds);

  const view = useMemo(
    () =>
      derived == null ? null : calculateSpaceMonth(derived.facts, derived.mySlot, selected, today),
    [derived, selected, today],
  );

  const isFuture = compareMonths(selected, current) > 0;
  const isCurrent = selected === current;
  const monthName = formatMonth(selected, current);
  const heading = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  // Lo que todavía no vence también se abre: un gasto en cuotas del mes que
  // viene solo se puede editar o eliminar desde acá (U7, CA-28).
  function openOccurrence(occurrence: SpaceOccurrence) {
    router.push(occurrenceHref(spaceId, occurrence) as Href);
  }

  const stepper = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <StepButton
        label="Mes anterior"
        target={prev}
        onPress={setSelected}
        icon={<ChevronLeft size={22} color={theme.colors.textSecondary} />}
      />
      <Text variant="heading" accessibilityRole="header">
        {heading}
      </Text>
      <StepButton
        label="Mes siguiente"
        target={next}
        onPress={setSelected}
        icon={<ChevronRight size={22} color={theme.colors.textSecondary} />}
      />
    </View>
  );

  return (
    <SpaceDetailShell
      otherName={derived?.other.displayName ?? null}
      inTabs={inTabs}
      loading={isLoading}
      error={isError || (!isLoading && derived == null)}
      onBack={() => goBack(router)}
      onRetry={refetch}
    >
      {derived != null && view != null && (
        <Stack gap="6">
          {stepper}

          {isFuture ? (
            <FutureMonth
              derived={derived}
              month={selected}
              today={today}
              view={view}
              onOpen={openOccurrence}
            />
          ) : (
            <PastOrCurrentMonth
              derived={derived}
              view={view}
              month={selected}
              current={current}
              isCurrent={isCurrent}
              today={today}
              onOpen={openOccurrence}
            />
          )}
        </Stack>
      )}
    </SpaceDetailShell>
  );
}

function StepButton({
  label,
  target,
  onPress,
  icon,
}: {
  label: string;
  target: Month | null;
  onPress: (month: Month) => void;
  icon: ReactNode;
}) {
  // Sin más meses de ese lado: queda el lugar vacío para que el título no se mueva.
  if (target == null) return <View style={{ width: 28, height: 28 }} />;
  return (
    <IconButton label={label} size={28} filled={false} onPress={() => onPress(target)} icon={icon} />
  );
}

type Derived = NonNullable<ReturnType<typeof useSpace>['derived']>;

/** El mes en curso o uno que ya pasó: lo que pasó, con su cuenta. */
function PastOrCurrentMonth({
  derived,
  view,
  month,
  current,
  isCurrent,
  today,
  onOpen,
}: {
  derived: Derived;
  view: ReturnType<typeof calculateSpaceMonth>;
  month: Month;
  current: Month;
  isCurrent: boolean;
  today: string;
  onOpen: (occurrence: SpaceOccurrence) => void;
}) {
  const { other, me, mySlot } = derived;
  const max = Math.max(view.viewer.put, view.other.put, 1);
  const hasPuts = view.viewer.put + view.other.put > 0;
  const when = isCurrent ? 'Este mes' : `En ${formatMonth(month, current)}`;
  const extra = putExtraSentence(view, when);
  const previous = previousMonthSentence(view, formatMonth(addMonths(month, -1), current));
  const comingThisMonth = isCurrent
    ? derived.occurrences.filter(
        (occurrence) => occurrence.month === month && occurrence.balanceDate > today,
      )
    : [];

  if (view.total === 0 && view.payments.length === 0 && comingThisMonth.length === 0) {
    return (
      <Text variant="small" tone="secondary">
        {isCurrent
          ? 'Todavía no hay gastos compartidos este mes.'
          : `No hubo gastos compartidos en ${formatMonth(month, current)}.`}
      </Text>
    );
  }

  return (
    <Stack gap="7">
      <Stack gap="1">
        <Text variant="caption" tone="muted">
          Gastos compartidos
        </Text>
        <Money amount={view.total} variant="display" animate />
      </Stack>

      {/* P-04 · lo que PUSO cada uno: un pago entre ustedes no lo cambia. */}
      {hasPuts && (
        <Stack gap="4">
          <SectionHeader
            title={isCurrent ? 'Lo que puso cada uno este mes' : `Lo que puso cada uno en ${formatMonth(month, current)}`}
          />
          <MemberContribution
            name="Vos"
            initial={initialOf(me.displayName)}
            put={view.viewer.put}
            share={view.viewer.share}
            max={max}
            tone="viewer"
            index={0}
          />
          <MemberContribution
            name={other.displayName}
            initial={initialOf(other.displayName)}
            put={view.other.put}
            share={view.other.share}
            max={max}
            tone="other"
            index={1}
          />
          <Text variant="caption" tone="muted">
            La marca en cada barra es la parte de cada uno según el reparto. Los pagos entre
            ustedes cambian lo que se deben, no lo que cada uno puso.
          </Text>

          {/* S-05 · la frase es "puso de más", nunca la diferencia. */}
          {extra != null && <Text variant="small">{extra}</Text>}
          {previous != null && (
            <Text variant="caption" tone="muted">
              {previous}
            </Text>
          )}
        </Stack>
      )}

      {/* §25 · "en el mes: Pagos entre ustedes". */}
      {view.payments.length > 0 && (
        <Stack gap="0">
          <SectionHeader title="Pagos entre ustedes" />
          {view.payments.map((payment, index) => (
            <View key={`${payment.date}-${index}`}>
              <LedgerRow
                icon={ArrowRightLeft}
                title={paymentSentence(payment, mySlot, other.displayName)}
                caption={formatDayMonth(payment.date)}
              />
              {index < view.payments.length - 1 && <Divider />}
            </View>
          ))}
        </Stack>
      )}

      {/* Should 7 · por categoría. Con una sola repetiría el total: no aparece. */}
      {view.byCategory.length > 1 && (
        <Stack gap="0">
          <SectionHeader title="Por categoría" />
          {view.byCategory.map((item, index) => (
            <View key={item.category}>
              <LedgerRow
                icon={categoryMeta(item.category).icon}
                title={prettyLabel(item.category)}
                amount={item.total}
              />
              {index < view.byCategory.length - 1 && <Divider />}
            </View>
          ))}
        </Stack>
      )}

      {/* Lo que falta del mes: todavía no cuenta (S-02). */}
      {comingThisMonth.length > 0 && (
        <Stack gap="0">
          <SectionHeader title="Se vienen este mes" />
          {comingThisMonth.map((occurrence, index) => (
            <View key={occurrence.id}>
              <LedgerRow
                icon={CalendarClock}
                title={prettyLabel(occurrence.label)}
                caption={[
                  formatDayMonth(occurrence.balanceDate),
                  occurrence.installment != null
                    ? `cuota ${formatInstallment(occurrence.installment.index, occurrence.installment.count)}`
                    : null,
                ]
                  .filter((part) => part != null)
                  .join(' · ')}
                amount={occurrence.amount}
                onPress={() => onOpen(occurrence)}
              />
              {index < comingThisMonth.length - 1 && <Divider />}
            </View>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

/** §23.4 · un mes que viene: los compromisos compartidos, que ven los dos. */
function FutureMonth({
  derived,
  month,
  today,
  view,
  onOpen,
}: {
  derived: Derived;
  month: Month;
  today: string;
  view: ReturnType<typeof calculateSpaceMonth>;
  onOpen: (occurrence: SpaceOccurrence) => void;
}) {
  const { other, me } = derived;
  const items = derived.occurrences
    .filter((occurrence) => occurrence.month === month && occurrence.balanceDate > today)
    .sort((a, b) => (a.balanceDate < b.balanceDate ? -1 : 1));
  const total = view.upcoming.reduce((sum, item) => sum + item.amount, 0);

  if (items.length === 0) {
    return (
      <Text variant="small" tone="secondary">
        Todavía no hay nada comprometido entre los dos para este mes.
      </Text>
    );
  }

  return (
    <Stack gap="7">
      <Stack gap="1">
        <Text variant="caption" tone="muted">
          Ya comprometido entre los dos
        </Text>
        <Money amount={total} variant="display" />
      </Stack>

      <Stack gap="0">
        <SectionHeader title="Se vienen" />
        {items.map((occurrence, index) => {
          const iPaid = occurrence.payerSlot === derived.mySlot;
          const myShare = derived.mySlot === 1 ? occurrence.shares.slot1 : occurrence.shares.slot2;
          return (
            <View key={occurrence.id}>
              <LedgerRow
                icon={categoryMeta(occurrence.category).icon}
                title={prettyLabel(occurrence.label)}
                caption={[
                  formatDayMonth(occurrence.balanceDate),
                  `pagó ${iPaid ? me.displayName : other.displayName}`,
                  occurrence.installment != null
                    ? `cuota ${formatInstallment(occurrence.installment.index, occurrence.installment.count)}`
                    : null,
                  occurrence.isRecurrence ? 'fijo' : null,
                ]
                  .filter((part) => part != null)
                  .join(' · ')}
                amount={occurrence.amount}
                myShare={myShare}
                onPress={() => onOpen(occurrence)}
              />
              {index < items.length - 1 && <Divider />}
            </View>
          );
        })}
      </Stack>

      <Text variant="caption" tone="muted">
        Lo que ya está comprometido entre los dos. Lo ven ambos.
      </Text>
    </Stack>
  );
}
