import { useMemo, useState } from 'react';
import { Alert, Switch, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { addMonths, monthOf } from '@domain/calendar';
import { planInstallments } from '@domain/installments';
import { resolveCardPayment } from '@domain/cards';
import type { Category, PaymentMethod } from '@domain/types';
import { formatMonth } from '@/lib/format';
import { useSession } from '@/features/auth/SessionProvider';
import {
  useCreateMovement,
  useCreateRecurrence,
  usePersonalFacts,
} from '@/features/shared/usePersonalFacts';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  orderByUsage,
} from '@/features/add/categories';
import { AmountInput } from '@/features/add/AmountInput';
import { CategoryGrid } from '@/features/add/CategoryGrid';
import {
  Chip,
  Field,
  InstallmentCountPicker,
  PaymentMethodPicker,
  Segmented,
} from '@/features/add/fields';
import { InstallmentPreview } from '@/features/add/InstallmentPreview';
import {
  AudienceBadge,
  Button,
  Card,
  Pressable,
  Row,
  Screen,
  Stack,
  Text,
} from '@/ui/primitives';
import { duration } from '@/ui/motion';
import { useTheme } from '@/ui/theme';

/**
 * §17 · el formulario único Agregar. "Registrar cualquier movimiento en
 * segundos."
 *
 * El orden de los campos es el de la spec, y no es casual: monto y categoría
 * primero, porque §4.4 pide que un gasto cotidiano sea "monto + categoría +
 * guardar". Todo lo demás tiene un valor por defecto razonable y se puede
 * ignorar.
 *
 * CA-10 · abre con "Solo yo" y "Solo vos lo ves". Es la defensa principal
 * contra cargar un gasto personal en un espacio por error, que §32 clasifica
 * como "rompe privacidad".
 *
 * Fase 4 · el destino es siempre "Solo yo" porque todavía no hay espacios.
 * El selector con los chips por espacio y el reparto llegan en la Fase 6.
 */
export default function Agregar() {
  const theme = useTheme();
  const router = useRouter();
  const { accountState } = useSession();
  const { facts, expansion, today } = usePersonalFacts();

  const createMovement = useCreateMovement();
  const createRecurrence = useCreateRecurrence();

  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState<Category | null>(null);
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null);
  const [installmentCount, setInstallmentCount] = useState<number | null>(null);
  const [repeats, setRepeats] = useState(false);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const method = facts.paymentMethods.find((item) => item.id === paymentMethodId) ?? null;
  const isCard = method?.kind === 'card';

  // §17 · "más usadas primero".
  const categories = useMemo(() => {
    const usage = new Map<Category, number>();
    for (const movement of facts.movements) {
      if (movement.kind !== kind) continue;
      usage.set(movement.category, (usage.get(movement.category) ?? 0) + 1);
    }
    return orderByUsage(kind === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES, usage);
  }, [facts.movements, kind]);

  const plan = useMemo(() => {
    if (kind === 'income' || installmentCount == null || installmentCount < 2) return null;
    return planInstallments({
      purchaseDate: today,
      count: installmentCount,
      card: isCard ? method : null,
    });
  }, [kind, installmentCount, isCard, method, today]);

  const canSave = amount > 0 && category != null && !saving;

  /** §17 · los mensajes de efecto, que es lo que vuelve útil cada registro. */
  const effect = useMemo(() => {
    if (kind === 'income' || amount === 0) return null;

    if (plan != null) {
      const last = addMonths(plan.firstMonth, plan.count - 1);
      return `Agregás ${plan.count} cuotas hasta ${formatMonth(last, monthOf(today))}.`;
    }
    if (repeats) {
      return 'Se va a repetir todos los meses.';
    }
    if (isCard && method != null) {
      const schedule = resolveCardPayment(method, today);
      return `Se paga en ${formatMonth(schedule.month, monthOf(today))}.`;
    }
    return null;
  }, [kind, amount, plan, repeats, isCard, method, today]);

  const dirty = amount > 0 || category != null || description.trim() !== '';

  function close() {
    // §17 · "Salir con datos: ¿Descartar este gasto?"
    if (!dirty) {
      router.back();
      return;
    }
    Alert.alert('¿Descartar este gasto?', 'Lo que cargaste no se va a guardar.', [
      { text: 'Seguir editando', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: () => router.back() },
    ]);
  }

  async function save() {
    if (!canSave || category == null) return;
    setSaving(true);

    try {
      if (repeats && kind === 'expense') {
        // §21 · un fijo mensual, no un gasto puntual.
        await createRecurrence.mutateAsync({
          kind: 'expense',
          amount,
          category,
          dayOfMonth: Number(today.slice(8, 10)),
          startMonth: monthOf(today),
          endMonth: null,
          paymentMethodId,
        });
      } else {
        await createMovement.mutateAsync({
          kind,
          amount,
          date: today,
          category,
          description: description.trim() === '' ? null : description.trim(),
          paymentMethod: method,
          installmentCount,
          pinnedFirstMonth: null,
        });
      }

      router.back();
    } catch {
      setSaving(false);
      Alert.alert('No pudimos guardarlo', 'Probá de nuevo en un momento.');
    }
  }

  return (
    <Screen>
      <Stack gap="7">
        <Row justify="space-between" align="center">
          <Text variant="heading">Agregar</Text>
          <Pressable
            onPress={close}
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

        {/* §17 campo 1 · los ingresos son siempre personales. */}
        {accountState === 'personal' && (
          <Segmented
            options={[
              { value: 'expense', label: 'Gasto' },
              { value: 'income', label: 'Ingreso' },
            ]}
            value={kind}
            onChange={(next) => {
              setKind(next);
              // Cambiar de gasto a ingreso invalida todo lo que sigue: las
              // categorías son otras y un ingreso no tiene medio ni cuotas.
              setCategory(null);
              setInstallmentCount(null);
              setRepeats(false);
              if (next === 'income') setPaymentMethodId(null);
            }}
          />
        )}

        {/* §17 campo 2 */}
        <AmountInput value={amount} onChange={setAmount} />

        {/* §17 campo 3 */}
        <Field label="Categoría">
          <CategoryGrid categories={categories} value={category} onChange={setCategory} />
        </Field>

        {/* §17 campo 4 · CA-10 · "Solo yo" por defecto, con la audiencia visible. */}
        <Field label="Destino">
          <Row gap="2">
            <Chip label="Solo yo" selected onPress={() => {}} />
          </Row>
          <AudienceBadge audience={{ kind: 'private' }} />
        </Field>

        {/* §17 campo 7 */}
        {kind === 'expense' && facts.paymentMethods.length > 0 && (
          <Field label="¿Con qué lo pagaste?">
            <PaymentMethodPicker
              methods={facts.paymentMethods}
              value={paymentMethodId}
              // Cambiar el medio NO borra las cuotas: §19 permite "crédito sin
              // tarjeta, en cuotas". Lo que cambia es el cronograma, y de eso
              // se encarga el dominio (Q-02 con tarjeta, Q-03 sin ella).
              onChange={setPaymentMethodId}
            />
          </Field>
        )}

        {/* §17 campo 8 */}
        {kind === 'expense' && !repeats && (
          <Field
            label="En cuotas"
            hint={
              installmentCount === 1
                ? 'Para una sola cuota, desactivá En cuotas.'
                : undefined
            }
          >
            <InstallmentCountPicker value={installmentCount} onChange={setInstallmentCount} />
          </Field>
        )}

        {/* §17 campo 9 */}
        {kind === 'expense' && installmentCount == null && (
          <Row justify="space-between" align="center">
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="smallMedium" tone="secondary">
                Se repite cada mes
              </Text>
              <Text variant="caption" tone="muted">
                Un fijo: alquiler, servicios, suscripciones.
              </Text>
            </View>
            <Switch
              value={repeats}
              onValueChange={setRepeats}
              trackColor={{ false: theme.colors.surfaceSunken, true: theme.colors.brand }}
              accessibilityLabel="Se repite cada mes"
            />
          </Row>
        )}

        {/* §17 campo 11 */}
        <Field label="Descripción (opcional)">
          <DescriptionInput value={description} onChange={setDescription} />
        </Field>

        {/* §17 campo 12 · la vista previa. Nunca dice si alcanza. */}
        {plan != null && amount > 0 && (
          <InstallmentPreview
            expansion={expansion}
            total={amount}
            plan={plan}
            today={today}
          />
        )}

        {/* El efecto de lo que está por guardar. */}
        {effect != null && (
          <Animated.View entering={FadeIn.duration(duration.quick)}>
            <Card tone="sunken">
              <Text variant="small" tone="secondary">
                {effect}
              </Text>
            </Card>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.duration(duration.base)}>
          <Button
            label="Guardar"
            size="lg"
            fullWidth
            haptic="success"
            disabled={!canSave}
            loading={saving}
            onPress={() => void save()}
          />
        </Animated.View>
      </Stack>
    </Screen>
  );
}

function DescriptionInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={{
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: focused ? theme.colors.brand : theme.colors.border,
        backgroundColor: theme.colors.surface,
        paddingHorizontal: theme.space['4'],
        height: 48,
        justifyContent: 'center',
      }}
    >
      <TextInput
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Supermercado, nafta, regalo…"
        placeholderTextColor={theme.colors.textMuted}
        maxLength={140}
        accessibilityLabel="Descripción"
        style={[theme.typography.body, { color: theme.colors.text }]}
      />
    </View>
  );
}
