import { useMemo, useState } from 'react';
import { Alert, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { createSharedExpense, deleteSharedExpense } from '@/data/repositories/spaces';
import { useSession } from '@/features/auth/SessionProvider';
import { usePersonalFacts } from '@/features/shared/usePersonalFacts';
import { useSpace } from '@/features/spaces/useSpaces';
import { balanceSentence } from '@/features/spaces/balanceCopy';
import { SplitPicker } from '@/features/spaces/SplitPicker';
import { DeletedWhileEditing, type DeletedBy } from '@/features/spaces/DeletedWhileEditing';
import { AmountInput } from '@/features/add/AmountInput';
import { CategoryGrid } from '@/features/add/CategoryGrid';
import { EXPENSE_CATEGORIES, prettyLabel } from '@/features/add/categories';
import {
  Chip,
  Field,
  InstallmentCountPicker,
  PaymentMethodPicker,
} from '@/features/add/fields';
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

  const { session } = useSession();
  const { derived, today } = useSpace(spaceId);
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
        date: expense.date,
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
    },
    onError: (error: Error) => {
      if (error instanceof SharedExpenseDeletedError) {
        setSaveFoundItDeleted(true);
        return;
      }
      Alert.alert('No pudimos guardarlo', error.message);
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
        date: snapshot.date,
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
      router.back();
    },
    onError: (error: Error) => Alert.alert('No pudimos crearlo', error.message),
  });

  const remove = useMutation({
    mutationFn: () => deleteSharedExpense(expenseId),
    onSuccess: async () => {
      await invalidate();
      router.back();
    },
  });

  const endNow = useMutation({
    mutationFn: () => endSharedInstallmentsNow(expense!, today, derived!.mySlot),
    onSuccess: async () => {
      await invalidate();
      router.back();
    },
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
          <Button label="Volver" variant="secondary" onPress={() => router.back()} />
        </Stack>
      </Screen>
    );
  }

  const { mySlot, other, me } = derived;
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
          { text: 'Terminar ahora', onPress: () => void endNow.mutateAsync() },
          {
            text: 'Fue un error',
            style: 'destructive',
            onPress: () => void remove.mutateAsync(),
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
        { text: 'Eliminar', style: 'destructive', onPress: () => void remove.mutateAsync() },
      ],
    );
  }

  return (
    <Screen>
      <Stack gap="7">
        <Row justify="space-between" align="center">
          <Text variant="heading" numberOfLines={1} style={{ flex: 1 }}>
            {prettyLabel(expense.description ?? expense.category)}
          </Text>
          <Pressable
            onPress={() => router.back()}
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
                    Te corresponde
                  </Text>
                  <Money amount={myShare} variant="smallMedium" />
                </Row>
                <Row justify="space-between" align="baseline">
                  <Text variant="small" tone="secondary">
                    Le corresponde a {other.displayName}
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
                  setEditing(true);
                }}
              />

              <Pressable onPress={confirmDelete} haptic="none" scaleOnPress={false}>
                <Row gap="2" justify="center" align="center" style={{ paddingVertical: 12 }}>
                  <Trash2 size={14} color={theme.colors.excess} />
                  <Text variant="small" tone="excess">
                    {expense.installments != null ? 'Eliminar o terminar' : 'Eliminar'}
                  </Text>
                </Row>
              </Pressable>
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
                  onRecreate={() => void recreate.mutateAsync()}
                  onDiscard={() => router.back()}
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

              {amount > 0 && (
                <Field label="¿Cómo lo reparten?">
                  <SplitPicker
                    total={amount}
                    split={split}
                    onChange={setSplit}
                    mySlot={mySlot}
                    myName={me.displayName}
                    otherName={other.displayName}
                  />
                </Field>
              )}

              {payerIsMe && personalFacts.paymentMethods.length > 0 && (
                <Field
                  label="¿Con qué lo pagaste?"
                  hint={`${other.displayName} no va a ver esto. Solo vos.`}
                >
                  <PaymentMethodPicker
                    methods={personalFacts.paymentMethods}
                    value={paymentMethodId}
                    onChange={setPaymentMethodId}
                  />
                </Field>
              )}

              <Field label="En cuotas">
                <InstallmentCountPicker
                  value={installmentCount}
                  onChange={setInstallmentCount}
                />
              </Field>

              <Field label="Descripción (opcional)">
                <View
                  style={{
                    borderRadius: theme.radius.md,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surface,
                    paddingHorizontal: theme.space['4'],
                    height: 48,
                    justifyContent: 'center',
                  }}
                >
                  <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Opcional"
                    placeholderTextColor={theme.colors.textMuted}
                    maxLength={140}
                    accessibilityLabel="Descripción"
                    style={[theme.typography.body, { color: theme.colors.text }]}
                  />
                </View>
              </Field>

              {/* X-04 · el aviso de que cambia el saldo de los dos. */}
              {!deletedWhileEditing && (
                <Card tone="sunken">
                  <Text variant="small" tone="secondary">
                    Al guardar, {other.displayName} va a ver los cambios y lo que se deben se
                    recalcula.
                    {installmentCount != null && installmentCount >= 2
                      ? ' Las cuotas se regeneran con estos datos.'
                      : ''}
                  </Text>
                </Card>
              )}

              {/* Con el gasto eliminado no hay nada que guardar: la salida es el aviso de arriba. */}
              {!deletedWhileEditing && (
                <Stack gap="2">
                  <Button
                    label="Guardar cambios"
                    variant="shared"
                    size="lg"
                    fullWidth
                    haptic="success"
                    disabled={amount <= 0 || category == null}
                    loading={save.isPending}
                    onPress={() => void save.mutateAsync()}
                  />
                  <Pressable onPress={() => setEditing(false)} haptic="none">
                    <Text variant="small" tone="muted" align="center">
                      Cancelar
                    </Text>
                  </Pressable>
                </Stack>
              )}
            </Stack>
          </Animated.View>
        )}
      </Stack>
    </Screen>
  );
}
