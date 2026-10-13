import { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { goBack } from '@/features/shared/navigation';
import { Trash2, X } from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { addMonths, monthOf, monthRange, type Month } from '@domain/calendar';
import { formatMonth, formatPesos } from '@/lib/format';
import { queryKeys } from '@/data/queryClient';
import {
  changeRecurrenceAmount,
  clearMonthOverride,
  correctRecurrence,
  deleteRecurrenceById,
  setMonthOverride,
  stopRecurrenceFrom,
} from '@/data/repositories/edits';
import { useSession } from '@/features/auth/SessionProvider';
import { usePersonalFacts } from '@/features/shared/usePersonalFacts';
import { useFeedback } from '@/features/shared/useFeedback';
import { AmountInput } from '@/features/add/AmountInput';
import { prettyLabel } from '@/features/add/categories';
import { Chip, Field } from '@/features/add/fields';
import { DayNote, DayPicker } from '@/features/onboarding/DayPicker';
import {
  AudienceBadge,
  Button,
  Card,
  Divider,
  Money,
  Pressable,
  Row,
  Screen,
  SectionHeader,
  Stack,
  Text,
} from '@/ui/primitives';
import { duration } from '@/ui/motion';
import { useTheme } from '@/ui/theme';

type Mode = 'view' | 'this-month' | 'from-now' | 'correct' | 'stop';

/**
 * §21 · F-03 · un fijo y sus cuatro formas de cambiarlo.
 *
 * La spec las enumera, y cada una resuelve un caso distinto:
 *
 *   "Este mes fue distinto"   · la luz, el gas, un ingreso variable. El monto
 *                               base no cambia: solo ese mes (recurrence_overrides)
 *   "Cambiar desde este mes"  · aumentó el alquiler. Cambia hacia adelante
 *   "Corregir"                · el día o la categoría estaban mal
 *   "Dejar de pagarlo desde…" · se dio de baja el gimnasio
 *
 * Y la que importa más es la primera, porque es la que vuelve usable un fijo
 * en la vida real: la luz nunca sale lo mismo dos meses seguidos. Sin eso, el
 * usuario tendría que elegir entre un número mentiroso o editar el fijo cada
 * mes, que es exactamente el mantenimiento de planilla del que la app lo
 * libera (§3).
 *
 * Los meses pasados NO se reescriben al cambiar el monto base: ya ocurrieron,
 * y el radar de un mes cerrado tiene que seguir coincidiendo con lo que el
 * usuario vio.
 */
export default function FijoDetalle() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const { facts, today } = usePersonalFacts();
  const feedback = useFeedback();

  const recurrence = facts.recurrences.find((item) => item.id === id);
  const currentMonth = monthOf(today);

  const [mode, setMode] = useState<Mode>('view');
  const [amount, setAmount] = useState(recurrence?.amount ?? 0);
  const [targetMonth, setTargetMonth] = useState<Month>(currentMonth);
  const [day, setDay] = useState(recurrence?.dayOfMonth ?? 1);

  async function invalidate() {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.personalFacts(session?.user.id ?? 'anon'),
    });
  }

  /** Los ajustes de un mes que ya existen, para poder quitarlos. */
  const overrides = useMemo(
    () => facts.overrides.filter((override) => override.recurrenceId === id),
    [facts.overrides, id],
  );

  /** Los próximos meses, para elegir cuál ajustar o desde cuándo dejar de pagarlo. */
  const months = useMemo(
    () => monthRange(addMonths(currentMonth, -1), 8),
    [currentMonth],
  );

  const apply = useMutation({
    mutationFn: async () => {
      if (recurrence == null) return;

      switch (mode) {
        case 'this-month':
          await setMonthOverride(recurrence.id, targetMonth, amount);
          break;
        case 'from-now':
          await changeRecurrenceAmount(recurrence.id, amount);
          break;
        case 'correct':
          await correctRecurrence(recurrence.id, { dayOfMonth: day });
          break;
        case 'stop':
          await stopRecurrenceFrom(recurrence.id, targetMonth);
          break;
        default:
          break;
      }
    },
    onSuccess: async () => {
      await invalidate();
      // F-03 · qué cambió, en las palabras de cada opción.
      const month = formatMonth(targetMonth, currentMonth);
      const detail: Partial<Record<Mode, string>> = {
        'this-month': `Solo cambia ${month}. Los otros meses siguen igual.`,
        'from-now': `Desde este mes, ${formatPesos(amount)}. Los meses pasados no cambian.`,
        stop: `Deja de contar desde ${month}.`,
      };
      feedback.updated(detail[mode] ?? null);
      setMode('view');
    },
    onError: (error: Error) => feedback.error('No pudimos guardarlo', error),
  });

  const removeOverride = useMutation({
    mutationFn: (month: Month) => clearMonthOverride(recurrence!.id, month),
    onSuccess: async () => {
      await invalidate();
      feedback.updated('Ese mes vuelve al monto de siempre.');
    },
    onError: (error: Error) => feedback.error('No pudimos quitar el ajuste', error),
  });

  const remove = useMutation({
    mutationFn: () => deleteRecurrenceById(recurrence!.id),
    onSuccess: async () => {
      await invalidate();
      feedback.deleted({ kind: 'private' });
      goBack(router);
    },
    onError: (error: Error) => feedback.error('No pudimos eliminarlo', error),
  });

  if (recurrence == null) {
    return (
      <Screen>
        <Stack gap="5">
          <Text variant="body" tone="secondary">
            Este fijo ya no existe.
          </Text>
          <Button label="Volver" variant="secondary" onPress={() => goBack(router)} />
        </Stack>
      </Screen>
    );
  }

  const isIncome = recurrence.kind === 'income';
  const method = facts.paymentMethods.find((item) => item.id === recurrence.paymentMethodId);

  function confirmDelete() {
    Alert.alert(
      '¿Eliminar este fijo?',
      'Desaparece de todos los meses, también de los que ya pasaron. Si lo que querés es dejar de pagarlo desde ahora, usá “Dejar de pagarlo”.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => remove.mutate() },
      ],
    );
  }

  return (
    <Screen
      footer={
        // Solo cambiando algo (F-03): fijo abajo y sobre el teclado (10/10).
        mode !== 'view' ? (
          <Stack gap="2">
            <Button
              label="Guardar"
              size="lg"
              fullWidth
              haptic="success"
              disabled={(mode === 'this-month' || mode === 'from-now') && amount <= 0}
              loading={apply.isPending}
              onPress={() => apply.mutate()}
            />
            <Pressable onPress={() => setMode('view')} haptic="none">
              <Text variant="small" tone="muted" align="center">
                Cancelar
              </Text>
            </Pressable>
          </Stack>
        ) : undefined
      }
    >
      <Stack gap="7">
        <Row justify="space-between" align="center">
          <Text variant="heading" numberOfLines={1} style={{ flex: 1 }}>
            {prettyLabel(recurrence.category)}
          </Text>
          <Pressable
            onPress={() => goBack(router)}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
            style={{
              width: 36,
              height: 36,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.surfaceSunken,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} color={theme.colors.textSecondary} />
          </Pressable>
        </Row>

        <AudienceBadge audience={{ kind: 'private' }} />

        <Stack gap="2">
          <Money amount={recurrence.amount} variant="display" />
          <Text variant="small" tone="secondary">
            {[
              isIncome ? 'Ingreso fijo' : 'Fijo',
              `cada día ${recurrence.dayOfMonth}`,
              method?.name,
              recurrence.endMonth != null
                ? `hasta ${formatMonth(recurrence.endMonth, currentMonth)}`
                : null,
            ]
              .filter((part) => part != null && part !== '')
              .join(' · ')}
          </Text>
        </Stack>

        {/* Los ajustes de un mes que ya existen. */}
        {overrides.length > 0 && (
          <Stack gap="4">
            <SectionHeader title="Meses distintos" />
            <Card>
              <Stack gap="0">
                {overrides
                  .sort((a, b) => (a.month < b.month ? -1 : 1))
                  .map((override, index) => (
                    <View key={override.month}>
                      <Row
                        justify="space-between"
                        align="center"
                        style={{ paddingVertical: theme.space['3'] }}
                      >
                        <Text variant="smallMedium">
                          {formatMonth(override.month, currentMonth)}
                        </Text>
                        <Row gap="3" align="center">
                          <Money amount={override.amount} variant="smallMedium" />
                          <Pressable
                            onPress={() => removeOverride.mutate(override.month)}
                            haptic="none"
                          >
                            <Text variant="caption" tone="brand">
                              Quitar
                            </Text>
                          </Pressable>
                        </Row>
                      </Row>
                      {index < overrides.length - 1 && <Divider />}
                    </View>
                  ))}
              </Stack>
            </Card>
            <Text variant="caption" tone="muted">
              Los meses que no están acá usan {formatPesos(recurrence.amount)}.
            </Text>
          </Stack>
        )}

        {/* F-03 · las cuatro acciones. */}
        {mode === 'view' ? (
          <Stack gap="3">
            <Button
              label="Este mes fue distinto"
              variant="secondary"
              fullWidth
              onPress={() => {
                setTargetMonth(currentMonth);
                setAmount(recurrence.amount);
                setMode('this-month');
              }}
            />
            <Button
              label="Cambiar desde este mes"
              variant="secondary"
              fullWidth
              onPress={() => {
                setAmount(recurrence.amount);
                setMode('from-now');
              }}
            />
            <Button
              label="Corregir el día"
              variant="secondary"
              fullWidth
              onPress={() => {
                setDay(recurrence.dayOfMonth);
                setMode('correct');
              }}
            />
            <Button
              label="Dejar de pagarlo"
              variant="secondary"
              fullWidth
              onPress={() => {
                setTargetMonth(currentMonth);
                setMode('stop');
              }}
            />

            <Pressable onPress={confirmDelete} haptic="none" scaleOnPress={false}>
              <Row gap="2" justify="center" align="center" style={{ paddingVertical: 12 }}>
                <Trash2 size={14} color={theme.colors.excess} />
                <Text variant="small" tone="excess">
                  Eliminar
                </Text>
              </Row>
            </Pressable>
          </Stack>
        ) : (
          <Animated.View entering={FadeInDown.duration(duration.base)}>
            <Stack gap="6">
              {mode === 'this-month' && (
                <Stack gap="5">
                  <Text variant="smallMedium" tone="secondary">
                    ¿Qué mes fue distinto?
                  </Text>
                  <MonthChips
                    value={targetMonth}
                    onChange={setTargetMonth}
                    months={months}
                    reference={currentMonth}
                  />
                  <Field label={`¿Cuánto fue en ${formatMonth(targetMonth, currentMonth)}?`}>
                    <AmountInput value={amount} onChange={setAmount} autoFocus={false} />
                  </Field>
                  <Card tone="sunken">
                    <Text variant="small" tone="secondary">
                      Solo cambia ese mes. Los demás siguen en{' '}
                      {formatPesos(recurrence.amount)}.
                    </Text>
                  </Card>
                </Stack>
              )}

              {mode === 'from-now' && (
                <Stack gap="5">
                  <Field label="¿Cuánto es ahora?">
                    <AmountInput value={amount} onChange={setAmount} autoFocus={false} />
                  </Field>
                  <Card tone="sunken">
                    <Text variant="small" tone="secondary">
                      Cambia de acá en adelante. Los meses que ya pasaron quedan como
                      estaban, porque ya ocurrieron.
                    </Text>
                  </Card>
                </Stack>
              )}

              {mode === 'correct' && (
                <Stack gap="5">
                  <Field label="¿Qué día lo pagás?">
                    <DayPicker value={day} onChange={(next) => setDay(next ?? 1)} />
                    <DayNote day={day} />
                  </Field>
                </Stack>
              )}

              {mode === 'stop' && (
                <Stack gap="5">
                  <Text variant="smallMedium" tone="secondary">
                    ¿Cuál fue el último mes que lo pagás?
                  </Text>
                  <MonthChips
                    value={targetMonth}
                    onChange={setTargetMonth}
                    months={months}
                    reference={currentMonth}
                  />
                  <Card tone="sunken">
                    <Text variant="small" tone="secondary">
                      Después de {formatMonth(targetMonth, currentMonth)} deja de contar en
                      tus próximos meses. Lo anterior no se toca.
                    </Text>
                  </Card>
                </Stack>
              )}

            </Stack>
          </Animated.View>
        )}
      </Stack>
    </Screen>
  );
}

function MonthChips({
  value,
  onChange,
  months,
  reference,
}: {
  value: Month;
  onChange: (next: Month) => void;
  months: readonly Month[];
  /** El mes de hoy. Se pasa porque solo useToday lee el reloj. */
  reference: Month;
}) {
  const theme = useTheme();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space['2'] }}>
      {months.map((month) => (
        <Chip
          key={month}
          label={formatMonth(month, reference)}
          selected={month === value}
          onPress={() => onChange(month)}
        />
      ))}
    </View>
  );
}
