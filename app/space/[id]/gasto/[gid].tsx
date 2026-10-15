import { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { goBack } from '@/features/shared/navigation';
import { Trash2, X } from 'lucide-react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { monthOf } from '@domain/calendar';
import { scheduleInstallments } from '@domain/installments';
import { calculateSharedBalance } from '@domain/shared-balance';
import { resolveShares } from '@domain/split';
import type { Category, SharedExpense, Split } from '@domain/types';
import { formatDayMonth, formatInstallment, formatMonth } from '@/lib/format';
import { queryKeys } from '@/data/queryClient';
import {
  endSharedInstallmentsNow,
  fetchSharedExpenseDeletion,
  SharedExpenseDeletedError,
  updateSharedExpense,
} from '@/data/repositories/edits';
import {
  createSharedExpense,
  deleteSharedExpense,
  moveSharedExpenseToPersonal,
} from '@/data/repositories/spaces';
import { canMoveToPersonal } from '@domain/destination';
import { useSession } from '@/features/auth/SessionProvider';
import { PaymentMethodField } from '@/features/add/PaymentMethodField';
import { spaceAudience, useFeedback } from '@/features/shared/useFeedback';
import { usePersonalFacts } from '@/features/shared/usePersonalFacts';
import { useMarkReviewed, useSpace } from '@/features/spaces/useSpaces';
import { reviewTag } from '@/features/spaces/reviewCopy';
import { balanceSentence } from '@/features/spaces/balanceCopy';
import { SplitField } from '@/features/spaces/SplitField';
import { DeletedWhileEditing, type DeletedBy } from '@/features/spaces/DeletedWhileEditing';
import { confirmDiscardChanges } from '@/features/edit/confirmDiscard';
import { DateEditField } from '@/features/edit/DateEditField';
import { dateEditability, hasUnsavedChanges, type EditFormValues } from '@/features/edit/editForm';
import { AmountInput } from '@/features/add/AmountInput';
import { moreOptionsSummary } from '@/features/add/addDefaults';
import { MoreOptions } from '@/features/add/MoreOptions';
import { isValidInstallmentCount } from '@/features/add/installmentCount';
import { canSaveForm, saveBlockReason } from '@/features/add/saveBlockReason';
import { CategoryGrid } from '@/features/add/CategoryGrid';
import { EXPENSE_CATEGORIES, prettyLabel } from '@/features/add/categories';
import {
  Chip,
  Field,
  InstallmentCountPicker,
} from '@/features/add/fields';
import {
  AudienceBadge,
  Button,
  Card,
  Divider,
  IconButton,
  Money,
  Row,
  Screen,
  SectionHeader,
  Stack,
  Text,
  TextField,
} from '@/ui/primitives';
import { duration } from '@/ui/motion';
import { useTheme } from '@/ui/theme';

/**
 * El detalle de un gasto compartido, con Editar y Eliminar.
 *
 * X-02 / K3 · **los dos miembros editan y eliminan cualquier registro del
 * espacio**, y se guarda quién fue el último editor. No hay dueño ni
 * administrador: es un espacio de dos, y §6 excluye explícitamente los roles.
 *
 * Lo que hace delicada esta pantalla es que cada cambio mueve el saldo de las
 * DOS personas. Por eso:
 *   X-03 · eliminar confirma con el saldo que va a quedar y avisa que el otro
 *          también lo deja de ver
 *   X-04 · editar una compra en cuotas regenera sus cuotas, y se avisa si eso
 *          cambia meses pasados o el saldo
 *   C-05 · el medio de pago sigue siendo privado: solo se puede indicar el
 *          propio, y solo si pagó el usuario
 */
export default function GastoCompartido() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id, gid } = useLocalSearchParams<{ id: string; gid: string }>();
  const spaceId = id ?? '';
  const expenseId = gid ?? '';

  const { session, accountState } = useSession();
  const feedback = useFeedback();
  const { derived, today } = useSpace(spaceId);
  const markReviewed = useMarkReviewed(spaceId);
  const { facts: personalFacts } = usePersonalFacts();

  const live = derived?.facts.expenses.find((item) => item.id === expenseId);

  const [editing, setEditing] = useState(false);
  /**
   * SY-02 · una copia del gasto tal como estaba al tocar Editar. Si el otro
   * miembro lo elimina mientras tanto, SY-01 refresca, el gasto desaparece de
   * `facts`, y sin esta copia la pantalla tiraba todo lo escrito.
   */
  const [snapshot, setSnapshot] = useState<SharedExpense | null>(null);
  const [saveFoundItDeleted, setSaveFoundItDeleted] = useState(false);

  const expense = live ?? (editing ? snapshot ?? undefined : undefined);
  const deletedWhileEditing =
    editing && snapshot != null && (saveFoundItDeleted || (derived != null && live == null));
  const [amount, setAmount] = useState(expense?.amount ?? 0);
  const [category, setCategory] = useState<Category | null>(expense?.category ?? null);
  const [payerIsMe, setPayerIsMe] = useState(expense?.payerSlot === derived?.mySlot);
  const [split, setSplit] = useState<Split>(expense?.split ?? { mode: 'even' });
  const [installmentCount, setInstallmentCount] = useState<number | null>(
    expense?.installments?.count ?? null,
  );
  const [description, setDescription] = useState(expense?.description ?? '');
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null);
  // UX-18 · la fecha se edita solo si es de un solo pago (ver `dateEditability`).
  const [date, setDate] = useState(expense?.date ?? today);
  const [moreOpen, setMoreOpen] = useState(false);
  /** UX-18 · el formulario tal como estaba al tocar Editar, para saber si hay cambios sin guardar. */
  const [initialForm, setInitialForm] = useState<EditFormValues | null>(null);

  /** C-05 · el detalle privado de pago que ya tiene este gasto, si lo pagó él. */
  const currentPaymentMethodId =
    personalFacts.spaces
      .find((membership) => membership.facts.space.id === spaceId)
      ?.paymentDetails.find(
        (detail) => detail.sourceId === expenseId && detail.slot === derived?.mySlot,
      )?.paymentMethodId ?? null;

  const method =
    personalFacts.paymentMethods.find((item) => item.id === paymentMethodId) ?? null;

  async function invalidate() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.spaceFacts(spaceId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.spaces }),
      // K9 · cambia la parte que llega al radar de los dos.
      queryClient.invalidateQueries({
        queryKey: queryKeys.personalFacts(session?.user.id ?? 'anon'),
      }),
    ]);
  }

  const save = useMutation({
    mutationFn: async () => {
      if (expense == null || derived == null || category == null) return;

      await updateSharedExpense(expense.id, {
        amount,
        date,
        category,
        description: description.trim() === '' ? null : description.trim(),
        payerSlot: payerIsMe ? derived.mySlot : derived.other.slot,
        split,
        installmentCount,
        mySlot: derived.mySlot,
        myPaymentMethod: payerIsMe ? method : null,
        spaceId,
      });
    },
    onSuccess: async () => {
      await invalidate();
      setEditing(false);
      feedback.updated(
        derived?.other.status === 'active' ? `${derived.other.displayName} ve el cambio.` : null,
      );
    },
    onError: (error: Error) => {
      if (error instanceof SharedExpenseDeletedError) {
        setSaveFoundItDeleted(true);
        return;
      }
      feedback.error('No pudimos guardarlo', error);
    },
  });

  // SY-02 · quién lo eliminó, según el registro de la base. Nunca se supone.
  const deletion = useQuery({
    queryKey: ['shared-expense-deletion', expenseId],
    queryFn: () => fetchSharedExpenseDeletion(expenseId),
    enabled: deletedWhileEditing,
  });

  // SY-02 · "¿Querés volver a crearlo?": con lo que estaba en el formulario.
  const recreate = useMutation({
    mutationFn: async () => {
      if (snapshot == null || derived == null || category == null) return;

      await createSharedExpense({
        spaceId,
        amount,
        date,
        category,
        description: description.trim() === '' ? null : description.trim(),
        payerSlot: payerIsMe ? derived.mySlot : derived.other.slot,
        split,
        mySlot: derived.mySlot,
        installmentCount,
        pinnedFirstMonth: null,
        myPaymentMethod: payerIsMe ? method : null,
      });
    },
    onSuccess: async () => {
      await invalidate();
      if (derived != null) {
        feedback.saved({ audience: spaceAudience(derived.facts.space.name, derived.other) });
      }
      goBack(router);
    },
    onError: (error: Error) => feedback.error('No pudimos crearlo', error),
  });

  const remove = useMutation({
    mutationFn: () => deleteSharedExpense(expenseId),
    onSuccess: async () => {
      await invalidate();
      if (derived != null) {
        feedback.deleted(spaceAudience(derived.facts.space.name, derived.other));
      }
      goBack(router);
    },
    onError: (error: Error) => feedback.error('No pudimos eliminarlo', error),
  });

  /** X-07 · al revés: de un espacio a personal. */
  const moveToPersonal = useMutation({
    mutationFn: () =>
      moveSharedExpenseToPersonal(
        session!.user.id,
        expense!,
        personalFacts.paymentMethods.find((item) => item.id === currentPaymentMethodId) ?? null,
      ),
    onSuccess: async () => {
      await invalidate();
      if (derived != null && balanceAfterDelete != null) {
        feedback.saved({
          audience: { kind: 'private' },
          detail: `${derived.other.displayName} lo dejó de ver. ${balanceSentence(balanceAfterDelete)}.`,
        });
      }
      goBack(router);
    },
    onError: (error: Error) => feedback.error('No pudimos pasarlo', error),
  });

  const endNow = useMutation({
    mutationFn: () => endSharedInstallmentsNow(expense!, today, derived!.mySlot),
    onSuccess: async () => {
      await invalidate();
      // Q-07 · conserva las pasadas, elimina las futuras.
      feedback.updated('Las cuotas que ya pasaron quedan. Las que faltaban, no.');
      goBack(router);
    },
    onError: (error: Error) => feedback.error('No pudimos terminarla', error),
  });

  /** X-03 · el saldo que va a quedar si se elimina. */
  const balanceAfterDelete = useMemo(() => {
    if (derived == null || expense == null) return null;
    return calculateSharedBalance(
      {
        ...derived.facts,
        expenses: derived.facts.expenses.filter((item) => item.id !== expense.id),
      },
      derived.mySlot,
      today,
    );
  }, [derived, expense, today]);

  const schedule = useMemo(() => {
    if (expense?.installments == null) return [];
    return scheduleInstallments(expense.amount, expense.installments);
  }, [expense]);

  if (derived == null || expense == null) {
    return (
      <Screen>
        <Stack gap="5">
          <Text variant="body" tone="secondary">
            Este gasto ya no existe. Puede que la otra persona lo haya eliminado.
          </Text>
          <Button label="Volver" variant="secondary" onPress={() => goBack(router)} />
        </Stack>
      </Screen>
    );
  }

  const { mySlot, other, me } = derived;
  // Opción B · CA-27 · si falta revisarlo, y si el otro lo cargó o solo lo editó.
  const reviewReason = derived.pendingReview.get(expense.id);
  const shares = resolveShares(expense.amount, expense.split);
  const myShare = mySlot === 1 ? shares.slot1 : shares.slot2;
  const otherShare = mySlot === 1 ? shares.slot2 : shares.slot1;
  const iPaid = expense.payerSlot === mySlot;

  const categories = EXPENSE_CATEGORIES;

  const deletedBy: DeletedBy =
    deletion.data == null
      ? 'unknown'
      : deletion.data.deletedBySlot === mySlot
        ? 'me'
        : 'other';

  /**
   * X-07 · "con confirmación de audiencia": nombra a quién lo deja de ver y
   * qué cambia, porque deja de ser compartido para los dos.
   */
  function confirmMoveToPersonal() {
    const after =
      balanceAfterDelete != null
        ? ` El saldo pasa a: ${balanceSentence(balanceAfterDelete).toLowerCase()}.`
        : '';
    Alert.alert(
      '¿Pasarlo a tus gastos personales?',
      `${derived!.other.displayName} lo va a dejar de ver y deja de repartirse.${after} En tu radar cuenta entero, no solo tu parte.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Pasarlo a personal', onPress: () => moveToPersonal.mutate() },
      ],
    );
  }

  const currentForm: EditFormValues = {
    amount,
    date,
    category,
    paymentMethodId,
    installmentCount,
    description,
    payerIsMe,
    split,
  };

  const saveForm = { amount, category, installmentCount, destinationLoading: false };

  /** "Cancelar" y la X: con cambios sin guardar, preguntan antes de tirarlos. */
  function leaveEditing(then: () => void) {
    if (initialForm != null && hasUnsavedChanges(initialForm, currentForm)) {
      confirmDiscardChanges(then);
    } else {
      then();
    }
  }

  function confirmDelete() {
    const after =
      balanceAfterDelete != null
        ? ` El saldo pasa a: ${balanceSentence(balanceAfterDelete).toLowerCase()}.`
        : '';

    // X-06 · una compra en cuotas distingue las dos intenciones.
    if (expense!.installments != null) {
      Alert.alert(
        '¿Qué pasó con esta compra?',
        `Si fue un error de carga, se borra entera. Si dejaron de pagarla, se conservan las cuotas que ya pasaron. ${other.displayName} también lo va a ver.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Terminar ahora', onPress: () => endNow.mutate() },
          {
            text: 'Fue un error',
            style: 'destructive',
            onPress: () => remove.mutate(),
          },
        ],
      );
      return;
    }

    // §33 U7 / X-03 · con el nuevo saldo y el aviso de que el otro lo deja de ver.
    Alert.alert(
      `¿Eliminar ${prettyLabel(expense!.description ?? expense!.category)}?`,
      `${other.displayName} también lo va a dejar de ver.${after}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => remove.mutate() },
      ],
    );
  }

  return (
    <Screen
      footer={
        // Solo editando, y nunca con el gasto eliminado: ahí no hay nada que
        // guardar y la salida es el aviso de SY-02.
        editing && !deletedWhileEditing ? (
          <Stack gap="2">
            <Button
              label="Guardar cambios"
              variant="shared"
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
              onPress={() => leaveEditing(() => setEditing(false))}
            />
          </Stack>
        ) : undefined
      }
    >
      <Stack gap="7">
        <Row justify="space-between" align="center">
          <Text variant="heading" numberOfLines={1} style={{ flex: 1 }}>
            {prettyLabel(expense.description ?? expense.category)}
          </Text>
          <IconButton
            label="Cerrar"
            onPress={() => (editing ? leaveEditing(() => goBack(router)) : goBack(router))}
            icon={<X size={18} color={theme.colors.textSecondary} />}
          />
        </Row>

        <AudienceBadge audience={{ kind: 'shared', otherMemberName: other.displayName }} />

        {!editing ? (
          <>
            <Stack gap="2">
              <Money amount={expense.amount} variant="display" />
              <Text variant="small" tone="secondary">
                {[
                  formatDayMonth(expense.date),
                  prettyLabel(expense.category),
                  // G-06 · "pagó X" es una declaración, no una verificación.
                  `pagó ${iPaid ? me.displayName : other.displayName}`,
                ].join(' · ')}
              </Text>
            </Stack>

            {/* §7.3 · el reparto: la lente del espacio. */}
            <Card tone="shared">
              <Stack gap="3">
                <Row justify="space-between" align="baseline">
                  <Text variant="small" tone="secondary">
                    Tu parte
                  </Text>
                  <Money amount={myShare} variant="smallMedium" />
                </Row>
                <Row justify="space-between" align="baseline">
                  <Text variant="small" tone="secondary">
                    Parte de {other.displayName}
                  </Text>
                  <Money amount={otherShare} variant="smallMedium" />
                </Row>
                {expense.split.mode === 'custom' && (
                  <Text variant="caption" tone="muted">
                    Reparto personalizado.
                  </Text>
                )}
              </Stack>
            </Card>

            {/* K3 · la autoría, visible. */}
            <Text variant="caption" tone="muted">
              {expense.createdBySlot === mySlot
                ? 'Lo cargaste vos'
                : `Lo cargó ${other.displayName}`}
              {expense.updatedBySlot !== expense.createdBySlot
                ? ` · lo editó ${expense.updatedBySlot === mySlot ? 'vos' : other.displayName}`
                : ''}
            </Text>

            {/* Opción B · revisar no es aprobar: ya cuenta, igual para los dos. */}
            {reviewReason != null && (
              <Row justify="space-between" align="center" gap="3">
                <Text variant="caption" tone="shared" style={{ flex: 1 }}>
                  {reviewTag(other.displayName, reviewReason)}
                </Text>
                <Button
                  label="Está bien"
                  variant="secondary"
                  loading={markReviewed.isPending}
                  onPress={() =>
                    markReviewed
                      .mutateAsync([expense.id])
                      .then(() => feedback.updated('Listo, ya lo revisaste.'))
                      .catch((cause: unknown) => feedback.error('No pudimos marcarlo', cause))
                  }
                />
              </Row>
            )}

            {/* X-05 · el cronograma se ve, pero una cuota no se edita. */}
            {schedule.length > 0 && (
              <Stack gap="4">
                <SectionHeader title="Sus cuotas" />
                <Card>
                  <Stack gap="0">
                    {schedule.map((item, index) => {
                      const past = item.date != null && item.date <= today;
                      return (
                        <View key={item.index}>
                          <Row
                            justify="space-between"
                            align="baseline"
                            style={{ paddingVertical: theme.space['3'] }}
                          >
                            <View style={{ gap: 2 }}>
                              <Text variant="smallMedium" tone={past ? 'muted' : 'default'}>
                                {formatInstallment(item.index, item.count)}
                              </Text>
                              <Text variant="caption" tone="muted">
                                {formatMonth(item.month, monthOf(today))}
                                {past ? ' · ya pasó' : ''}
                              </Text>
                            </View>
                            <Money
                              amount={item.amount}
                              variant="smallMedium"
                              tone={past ? 'muted' : 'default'}
                            />
                          </Row>
                          {index < schedule.length - 1 && <Divider />}
                        </View>
                      );
                    })}
                  </Stack>
                </Card>
                {/* P2 · la deuda se genera cuota por cuota. */}
                <Text variant="caption" tone="muted">
                  Cada cuota cambia lo que se deben cuando llega su fecha, no el día de la
                  compra.
                </Text>
              </Stack>
            )}

            <Stack gap="3">
              {/* X-02 / K3 · los dos miembros pueden editar. */}
              <Button
                label="Editar"
                variant="secondary"
                fullWidth
                onPress={() => {
                  setSnapshot(expense);
                  setSaveFoundItDeleted(false);
                  setAmount(expense.amount);
                  setCategory(expense.category);
                  setPayerIsMe(iPaid);
                  setSplit(expense.split);
                  setInstallmentCount(expense.installments?.count ?? null);
                  setDescription(expense.description ?? '');
                  // C-05 · el medio con que lo pagó, para no perderlo al
                  // guardar: sin medio, el detalle de pago se borra.
                  setPaymentMethodId(currentPaymentMethodId);
                  setDate(expense.date);
                  setInitialForm({
                    amount: expense.amount,
                    date: expense.date,
                    category: expense.category,
                    paymentMethodId: currentPaymentMethodId,
                    installmentCount: expense.installments?.count ?? null,
                    description: expense.description ?? '',
                    payerIsMe: iPaid,
                    split: expense.split,
                  });
                  setEditing(true);
                }}
              />

              {/* X-07 · solo quien lo cargó y lo pagó, con cuenta personal. */}
              {accountState === 'personal' && canMoveToPersonal(expense, mySlot) && (
                <Button
                  label="Pasarlo a mis gastos personales"
                  variant="ghost"
                  fullWidth
                  loading={moveToPersonal.isPending}
                  onPress={confirmMoveToPersonal}
                />
              )}

              {/* UX-13 · lo destructivo tiene lenguaje propio (danger), no el ámbar de N-08. */}
              <Button
                label={expense.installments != null ? 'Eliminar o terminar' : 'Eliminar'}
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
              {/* SY-02 · espera a saber quién fue antes de nombrar a nadie. */}
              {deletedWhileEditing && !deletion.isPending && (
                <DeletedWhileEditing
                  deletedBy={deletedBy}
                  otherName={other.displayName}
                  spaceName={derived.facts.space.name}
                  recreating={recreate.isPending}
                  onRecreate={() => recreate.mutate()}
                  onDiscard={() => goBack(router)}
                />
              )}

              <AmountInput value={amount} onChange={setAmount} autoFocus={false} />

              <Field label="Categoría">
                <CategoryGrid categories={categories} value={category} onChange={setCategory} />
              </Field>

              <Field label="¿Quién pagó?">
                <Row gap="2">
                  <Chip label="Yo" selected={payerIsMe} onPress={() => setPayerIsMe(true)} />
                  <Chip
                    label={other.displayName}
                    selected={!payerIsMe}
                    onPress={() => {
                      setPayerIsMe(false);
                      // C-05 · el medio de pago es privado de quien pagó.
                      setPaymentMethodId(null);
                    }}
                  />
                </Row>
              </Field>

              <SplitField
                total={amount}
                split={split}
                onChange={setSplit}
                mySlot={mySlot}
                myName={me.displayName}
                otherName={other.displayName}
              />

              {/* §17 campo 7 · solo en Estado A (A-05): la invitada no tiene medios. */}
              {payerIsMe && accountState === 'personal' && (
                <Field
                  label="¿Con qué lo pagaste?"
                  hint={`${other.displayName} no va a ver esto. Solo vos.`}
                >
                  <PaymentMethodField
                    methods={personalFacts.paymentMethods}
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
                  installmentCount,
                  repeats: false,
                  description,
                })}
              >
                <Field label="En cuotas">
                  <InstallmentCountPicker
                    value={installmentCount}
                    onChange={setInstallmentCount}
                  />
                </Field>

                {/* UX-18 · X-02 · editable salvo en una compra en cuotas (F2): el
                    plan guarda el mes y el día de cada cuota, que salen de la
                    tarjeta de quien pagó y el otro miembro no la ve (PR-02). */}
                <DateEditField
                  value={date}
                  onChange={setDate}
                  today={today}
                  editability={dateEditability(expense)}
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

              {/* X-04 · el aviso de que cambia el saldo de los dos. */}
              {!deletedWhileEditing && (
                <Card tone="sunken">
                  <Text variant="small" tone="secondary">
                    Al guardar, {other.displayName} va a ver los cambios y lo que se deben se
                    recalcula.
                    {isValidInstallmentCount(installmentCount)
                      ? ' Las cuotas se regeneran con estos datos.'
                      : ''}
                  </Text>
                </Card>
              )}

            </Stack>
          </Animated.View>
        )}
      </Stack>
    </Screen>
  );
}
