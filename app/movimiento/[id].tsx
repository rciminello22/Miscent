import { useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { goBack } from '@/features/shared/navigation';
import { useOpenSpace } from '@/features/spaces/useOpenSpace';
import { Trash2, X } from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { monthOf } from '@domain/calendar';
import { resolveCardPayment } from '@domain/cards';
import { scheduleInstallments } from '@domain/installments';
import type { Category } from '@domain/types';
import { formatDayMonth, formatMonth, formatPesos } from '@/lib/format';
import { queryKeys } from '@/data/queryClient';
import {
  deletePersonalMovementById,
  endInstallmentsNowMovement,
  updatePersonalMovement,
} from '@/data/repositories/edits';
import { useSession } from '@/features/auth/SessionProvider';
import { usePersonalFacts } from '@/features/shared/usePersonalFacts';
import { AmountInput } from '@/features/add/AmountInput';
import { CategoryGrid } from '@/features/add/CategoryGrid';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  prettyLabel,
} from '@/features/add/categories';
import { confirmDiscardChanges } from '@/features/edit/confirmDiscard';
import { DateEditField } from '@/features/edit/DateEditField';
import { dateEditability, hasUnsavedChanges, type EditFormValues } from '@/features/edit/editForm';
import { moreOptionsSummary } from '@/features/add/addDefaults';
import { Field, InstallmentCountPicker } from '@/features/add/fields';
import { MoreOptions } from '@/features/add/MoreOptions';
import { canSaveForm, saveBlockReason } from '@/features/add/saveBlockReason';
import { isValidInstallmentCount } from '@/features/add/installmentCount';
import { PaymentMethodField } from '@/features/add/PaymentMethodField';
import { useFeedback } from '@/features/shared/useFeedback';
import { InstallmentsDetail } from '@/features/detail/InstallmentsDetail';
import { buildInstallmentsDetail } from '@/features/detail/installmentsCycle';
import { amountSpeech, signOf } from '@/features/movements/amountSign';
import { MoveToSpace } from '@/features/movements/MoveToSpace';
import {
  AudienceBadge,
  Button,
  Card,
  IconButton,
  Money,
  Row,
  Screen,
  Stack,
  Text,
  TextField,
} from '@/ui/primitives';
import { duration } from '@/ui/motion';
import { useTheme } from '@/ui/theme';

/**
 * §16 · "Tocar → Detalle con Editar y Eliminar".
 *
 * Las reglas de edición de §29 están todas acá:
 *
 * X-01 · editar un hecho recalcula todo lo que depende de él. Sale gratis,
 *        porque nada derivado se guarda (§7.4)
 * X-04 · editar una compra en cuotas REGENERA sus cuotas, y se avisa cuando
 *        eso cambia meses que ya pasaron
 * X-05 · **no se edita una cuota suelta**: se edita la compra. Por eso esta
 *        pantalla muestra el cronograma completo pero no deja tocar una cuota
 * X-06 · eliminar una compra en cuotas distingue dos intenciones muy
 *        distintas: "fue un error" (desaparece todo) y "terminar ahora"
 *        (Q-07: quedan las pasadas, se van las futuras)
 */
export default function MovimientoDetalle() {
  const theme = useTheme();
  const router = useRouter();
  const openSpace = useOpenSpace();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const feedback = useFeedback();
  const { facts, today } = usePersonalFacts();

  const movement = facts.movements.find((item) => item.id === id);

  const [editing, setEditing] = useState(false);
  // X-07 · cambiar el destino: de personal a un espacio.
  const [moving, setMoving] = useState(false);
  const [amount, setAmount] = useState(movement?.amount ?? 0);
  const [category, setCategory] = useState<Category | null>(movement?.category ?? null);
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(
    movement?.paymentMethodId ?? null,
  );
  const [installmentCount, setInstallmentCount] = useState<number | null>(
    movement?.installments?.count ?? null,
  );
  const [description, setDescription] = useState(movement?.description ?? '');
  // UX-18 · la fecha se edita solo si es de un solo pago (ver `dateEditability`).
  const [date, setDate] = useState(movement?.date ?? today);
  const [moreOpen, setMoreOpen] = useState(false);

  const method = facts.paymentMethods.find((item) => item.id === paymentMethodId) ?? null;

  async function invalidate() {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.personalFacts(session?.user.id ?? 'anon'),
    });
  }

  const save = useMutation({
    mutationFn: async () => {
      if (movement == null || category == null) return;
      await updatePersonalMovement(movement.id, {
        amount,
        date,
        category,
        description: description.trim() === '' ? null : description.trim(),
        paymentMethod: method,
        installmentCount,
        pinnedFirstMonth: null,
        before: {
          date: movement.date,
          installmentCount: movement.installments?.count ?? null,
          payerMethodId: movement.paymentMethodId,
        },
      });
    },
    onSuccess: async () => {
      await invalidate();
      setEditing(false);
      feedback.updated('Tu radar y tu Futuro ya lo tienen en cuenta.');
    },
    onError: (error: Error) => feedback.error('No pudimos guardarlo', error),
  });

  const remove = useMutation({
    mutationFn: () => deletePersonalMovementById(movement!.id),
    onSuccess: async () => {
      await invalidate();
      feedback.deleted({ kind: 'private' });
      goBack(router);
    },
    onError: (error: Error) => feedback.error('No pudimos eliminarlo', error),
  });

  const endNow = useMutation({
    mutationFn: () => endInstallmentsNowMovement(movement!, today),
    onSuccess: async () => {
      await invalidate();
      // Q-07 · conserva las pasadas, elimina las futuras.
      feedback.updated('Las cuotas que ya pasaron quedan. Las que faltaban, no.');
      goBack(router);
    },
    onError: (error: Error) => feedback.error('No pudimos terminarla', error),
  });

  const schedule = useMemo(() => {
    if (movement?.installments == null) return [];
    return scheduleInstallments(movement.amount, movement.installments);
  }, [movement]);

  if (movement == null) {
    return (
      <Screen>
        <Stack gap="5">
          <Text variant="body" tone="secondary">
            Este movimiento ya no existe.
          </Text>
          <Button label="Volver" variant="secondary" onPress={() => goBack(router)} />
        </Stack>
      </Screen>
    );
  }

  const movementKind = movement.kind === 'income' ? 'income' : 'expense';
  // 15·4 · el medio con que se pagó, tal como está GUARDADO (no el del formulario).
  const savedMethod =
    facts.paymentMethods.find((item) => item.id === movement.paymentMethodId) ?? null;
  const installmentsView =
    movement.installments == null
      ? null
      : buildInstallmentsDetail({
          today,
          purchaseDate: movement.date,
          schedule,
          shared: null,
          methodName: savedMethod?.name ?? null,
        });
  const categories = movement.kind === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const cardSchedule =
    method?.kind === 'card' ? resolveCardPayment(method, movement.date) : null;

  /** X-04 · el aviso cuando regenerar las cuotas toca meses que ya pasaron. */
  const touchesPast =
    movement.installments != null &&
    installmentCount != null &&
    schedule.some((item) => item.month < monthOf(today));

  // UX-18 · lo que había al tocar Editar contra lo que hay ahora.
  const initialForm: EditFormValues = {
    amount: movement.amount,
    date: movement.date,
    category: movement.category,
    paymentMethodId: movement.paymentMethodId,
    installmentCount: movement.installments?.count ?? null,
    description: movement.description ?? '',
  };
  const currentForm: EditFormValues = {
    amount,
    date,
    category,
    paymentMethodId,
    installmentCount,
    description,
  };

  const saveForm = { amount, category, installmentCount, destinationLoading: false };

  function stopEditing() {
    setAmount(initialForm.amount);
    setCategory(initialForm.category);
    setPaymentMethodId(initialForm.paymentMethodId);
    setInstallmentCount(initialForm.installmentCount);
    setDescription(initialForm.description);
    setDate(initialForm.date);
    setEditing(false);
  }

  /** "Cancelar" y la X: con cambios sin guardar, preguntan antes de tirarlos. */
  function leaveEditing(then: () => void) {
    if (hasUnsavedChanges(initialForm, currentForm)) confirmDiscardChanges(then);
    else then();
  }

  function confirmDelete() {
    // X-06 · dos intenciones distintas, dos opciones distintas.
    if (movement!.installments != null) {
      Alert.alert(
        '¿Qué pasó con esta compra?',
        'Si fue un error de carga, se borra entera. Si dejaste de pagarla, se conservan las cuotas que ya pasaron.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Terminar ahora',
            onPress: () => endNow.mutate(),
          },
          {
            text: 'Fue un error',
            style: 'destructive',
            onPress: () => remove.mutate(),
          },
        ],
      );
      return;
    }

    Alert.alert('¿Eliminar este movimiento?', 'Tu radar y tu Futuro se recalculan sin él.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => remove.mutate() },
    ]);
  }

  return (
    <Screen
      footer={
        // Solo editando: fijo abajo y sobre el teclado (10/10).
        editing ? (
          <Stack gap="2">
            <Button
              label="Guardar cambios"
              size="lg"
              fullWidth
              haptic="success"
              disabled={!canSaveForm(saveForm)}
              loading={save.isPending}
              onPress={() => save.mutate()}
            />
            {/* UX-16 · también acá: la cantidad de cuotas queda plegada. */}
            {!save.isPending && saveBlockReason(saveForm) != null && (
              <Text variant="caption" tone="muted" align="center" accessibilityLiveRegion="polite">
                {saveBlockReason(saveForm)}
              </Text>
            )}
            <Button
              label="Cancelar"
              variant="ghost"
              fullWidth
              haptic="none"
              onPress={() => leaveEditing(stopEditing)}
            />
          </Stack>
        ) : undefined
      }
    >
      <Stack gap="7">
        <Row justify="space-between" align="center">
          <Text variant="heading" numberOfLines={1} style={{ flex: 1 }}>
            {prettyLabel(movement.description ?? movement.category)}
          </Text>
          <IconButton
            label="Cerrar"
            onPress={() => (editing ? leaveEditing(() => goBack(router)) : goBack(router))}
            icon={<X size={18} color={theme.colors.textSecondary} />}
          />
        </Row>

        <AudienceBadge audience={{ kind: 'private' }} />

        {!editing ? (
          <>
            {installmentsView != null ? (
              /* 15·4 · una compra en cuotas: el monto, el ciclo, la próxima y la lista.
                 X-05 · el cronograma se muestra, pero una cuota no se edita. */
              <InstallmentsDetail
                detail={installmentsView}
                footnote="Las cuotas no se editan de a una: se edita la compra y se regeneran."
              />
            ) : (
              <>
                <Stack gap="2">
                  {/* 15 · el signo de la cifra grande es el de la fila: "−" sale, "+" entra. */}
                  <Money
                    amount={movement.amount}
                    variant="display"
                    sign={signOf(movementKind)}
                    accessibilityLabel={amountSpeech(movementKind, movement.amount, formatPesos)}
                  />
                  <Text variant="small" tone="secondary">
                    {[
                      formatDayMonth(movement.date),
                      prettyLabel(movement.category),
                      movement.kind === 'income' ? 'Ingreso registrado' : method?.name,
                    ]
                      .filter((part) => part != null && part !== '')
                      .join(' · ')}
                  </Text>
                </Stack>

                {/* §22 · en qué resumen cae. */}
                {cardSchedule != null && (
                  <Card tone="sunken">
                    <Text variant="small">
                      Se paga en {formatMonth(cardSchedule.month, monthOf(movement.date))}
                      {cardSchedule.approximate ? ' · fechas aproximadas' : ''}, dentro del
                      resumen estimado de {method?.name}.
                    </Text>
                  </Card>
                )}
              </>
            )}

            <Stack gap="3">
              <Button
                label="Editar"
                variant="secondary"
                fullWidth
                onPress={() => setEditing(true)}
              />

              {/* X-07 · solo para gastos: un ingreso es siempre personal. */}
              {movement.kind === 'expense' && (
                <Button
                  label="Moverlo a un espacio"
                  variant="secondary"
                  fullWidth
                  onPress={() => setMoving(true)}
                />
              )}

              {/* UX-13 · lo destructivo tiene lenguaje propio (danger), no el ámbar de N-08. */}
              <Button
                label={movement.installments != null ? 'Eliminar o terminar' : 'Eliminar'}
                variant="destructive"
                fullWidth
                haptic="none"
                icon={<Trash2 size={14} color={theme.colors.danger} />}
                onPress={confirmDelete}
              />
            </Stack>
          </>
        ) : (
          <Animated.View entering={FadeInDown.duration(duration.base)}>
            <Stack gap="6">
              <AmountInput value={amount} onChange={setAmount} autoFocus={false} />

              <Field label="Categoría">
                <CategoryGrid
                  categories={categories}
                  value={category}
                  onChange={setCategory}
                />
              </Field>

              {movement.kind === 'expense' && (
                <Field label="¿Con qué lo pagaste?">
                  <PaymentMethodField
                    methods={facts.paymentMethods}
                    value={paymentMethodId}
                    onChange={setPaymentMethodId}
                  />
                </Field>
              )}

              {/* UX-18 · como en Agregar: lo que casi nunca se toca va plegado,
                  con lo elegido a la vista. */}
              <MoreOptions
                open={moreOpen}
                onToggle={() => setMoreOpen(!moreOpen)}
                summary={moreOptionsSummary({
                  date,
                  today,
                  installmentCount: movement.kind === 'expense' ? installmentCount : null,
                  repeats: false,
                  description,
                })}
              >
                {movement.kind === 'expense' && (
                  <Field label="En cuotas">
                    <InstallmentCountPicker
                      value={installmentCount}
                      onChange={setInstallmentCount}
                    />
                  </Field>
                )}

                {/* UX-18 · X-01 · editable salvo en una compra en cuotas (F2). */}
                <DateEditField
                  value={date}
                  onChange={setDate}
                  today={today}
                  editability={dateEditability(movement, today)}
                />

                <Field label="Descripción (opcional)">
                  <TextField
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Opcional"
                    maxLength={140}
                    accessibilityLabel="Descripción"
                  />
                </Field>
              </MoreOptions>

              {/* X-04 · el aviso de que se regeneran las cuotas. */}
              {isValidInstallmentCount(installmentCount) && (
                <Card tone="sunken">
                  <Text variant="small" tone="secondary">
                    Al guardar, las cuotas se regeneran con estos datos.
                    {touchesPast
                      ? ' Eso también cambia meses que ya pasaron.'
                      : ''}
                  </Text>
                </Card>
              )}

            </Stack>
          </Animated.View>
        )}
      </Stack>

      <MoveToSpace
        visible={moving}
        onClose={() => setMoving(false)}
        movement={movement}
        onMoved={(spaceId) => openSpace(spaceId, 'replace')}
      />
    </Screen>
  );
}
