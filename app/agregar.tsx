import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { goBack } from '@/features/shared/navigation';
import { X } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { addMonths, dayOf, monthOf } from '@domain/calendar';
import { planInstallments } from '@domain/installments';
import { resolveCardPayment } from '@domain/cards';
import { resolveShares } from '@domain/split';
import type { Category, Split } from '@domain/types';
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
  Segmented,
} from '@/features/add/fields';
import { InstallmentPreview } from '@/features/add/InstallmentPreview';
import { isValidInstallmentCount } from '@/features/add/installmentCount';
import { buildInstallmentPreview } from '@/features/add/installmentPreviewModel';
import { canSaveForm, saveBlockReason } from '@/features/add/saveBlockReason';
import { SaveFooter } from '@/features/add/SaveFooter';
import { PastDateField } from '@/features/add/DateField';
import { MoreOptions } from '@/features/add/MoreOptions';
import { lastUsedPaymentMethodId, moreOptionsSummary } from '@/features/add/addDefaults';
import { PaymentMethodField } from '@/features/add/PaymentMethodField';
import { spaceAudience, useFeedback } from '@/features/shared/useFeedback';
import type { FeedbackAudience } from '@/features/shared/feedbackCopy';

const PRIVATE: FeedbackAudience = { kind: 'private' };
import { SplitPicker } from '@/features/spaces/SplitPicker';
import { confirmIfDuplicate } from '@/features/spaces/confirmDuplicate';
import { SuggestedCategory } from '@/features/add/SuggestedCategory';
import { suggestCategory } from '@/features/add/suggestCategory';
import {
  useCreateSharedExpense,
  useCreateSharedRecurrence,
  useSpace,
  useSpaces,
} from '@/features/spaces/useSpaces';
import {
  AudienceBadge,
  Button,
  Card,
  IconButton,
  Row,
  Screen,
  Stack,
  Text,
  TextField,
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
 * M3 · destino "Solo yo" por defecto + un chip por espacio. Con un espacio
 * elegido aparecen quién pagó (§17 campo 5) y el reparto (campo 6), y se
 * guarda como gasto compartido: el mismo dato que se carga desde adentro del
 * espacio. Los ingresos son siempre personales (campo 1).
 */
export default function Agregar() {
  const theme = useTheme();
  const router = useRouter();
  const { accountState } = useSession();
  const { facts, expansion, today } = usePersonalFacts();

  const feedback = useFeedback();
  const createMovement = useCreateMovement();
  const createRecurrence = useCreateRecurrence();

  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState<Category | null>(null);
  // §17 campo 7 · "Medio de pago: Último usado". Los datos pueden llegar
  // después de abrir el formulario: se propone cuando cargan, salvo que el
  // usuario ya haya elegido otro.
  const lastUsedMethodId = useMemo(
    () => lastUsedPaymentMethodId(facts.movements, facts.paymentMethods),
    [facts.movements, facts.paymentMethods],
  );
  const [paymentMethodId, setPaymentMethodIdState] = useState<string | null>(lastUsedMethodId);
  const methodChosen = useRef(false);
  const setPaymentMethodId = (next: string | null) => {
    methodChosen.current = true;
    setPaymentMethodIdState(next);
  };
  useEffect(() => {
    if (!methodChosen.current && lastUsedMethodId != null) {
      setPaymentMethodIdState(lastUsedMethodId);
    }
  }, [lastUsedMethodId]);
  const [installmentCount, setInstallmentCount] = useState<number | null>(null);
  const [repeats, setRepeats] = useState(false);
  // §17 campo 10 · hoy por defecto; nunca una fecha futura.
  const [date, setDate] = useState(today);

  // §17 campo 4 · CA-10 · null = "Solo yo", el default. Si no, un espacio.
  const [destination, setDestination] = useState<string | null>(null);
  // §17 campos 5 y 6 · solo con un espacio elegido.
  const [payerIsMe, setPayerIsMe] = useState(true);
  const [split, setSplit] = useState<Split>({ mode: 'even' });

  const { data: spaces } = useSpaces();
  const { derived: space } = useSpace(destination ?? '');
  const createSharedExpense = useCreateSharedExpense(destination ?? '');
  const createSharedRecurrence = useCreateSharedRecurrence(destination ?? '');
  const isShared = destination != null && space != null;
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  // C-05 · el medio de pago es un detalle privado de quien pagó: si pagó el
  // otro miembro, no hay medio propio que valga.
  const iPay = !isShared || payerIsMe;
  const method = iPay
    ? (facts.paymentMethods.find((item) => item.id === paymentMethodId) ?? null)
    : null;
  const isCard = method?.kind === 'card';

  const myShareRatio = useMemo(() => {
    if (!isShared || space == null || amount === 0) return 1;
    const shares = resolveShares(amount, split);
    return (space.mySlot === 1 ? shares.slot1 : shares.slot2) / amount;
  }, [isShared, space, amount, split]);

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
    if (kind === 'income' || !isValidInstallmentCount(installmentCount)) return null;
    return planInstallments({
      purchaseDate: date,
      count: installmentCount,
      card: isCard ? method : null,
    });
  }, [kind, installmentCount, isCard, method, date]);

  // §17 campo 12 · null si no hay nada que mostrar (todas las cuotas ya pasaron).
  const previewModel = useMemo(
    () =>
      plan == null || amount === 0
        ? null
        : buildInstallmentPreview({
            expansion,
            total: amount,
            plan,
            // K9 · en un espacio, al radar llega solo tu parte.
            myShareRatio,
            today,
          }),
    [plan, amount, expansion, myShareRatio, today],
  );

  // UX-16 · un solo lugar decide si se guarda y por qué no. Un espacio elegido
  // que todavía no cargó no se guarda como personal.
  const form = {
    amount,
    category,
    installmentCount,
    destinationLoading: destination != null && space == null,
  };
  const canSave = canSaveForm(form) && !saving;
  const blockReason = saving ? null : saveBlockReason(form);

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
      const schedule = resolveCardPayment(method, date);
      return `Se paga en ${formatMonth(schedule.month, monthOf(today))}.`;
    }
    return null;
  }, [kind, amount, plan, repeats, isCard, method, date, today]);

  // Should 8 · lo que ya cargó (personal y en sus espacios) pesa más que la lista.
  const suggestedCategory = useMemo(
    () =>
      suggestCategory(description, kind, [
        ...facts.movements,
        ...facts.spaces.flatMap((membership) => membership.facts.expenses),
      ]),
    [description, kind, facts.movements, facts.spaces],
  );

  const dirty = amount > 0 || category != null || description.trim() !== '' || date !== today;

  function close() {
    // §17 · "Salir con datos: ¿Descartar este gasto?"
    if (!dirty) {
      goBack(router);
      return;
    }
    Alert.alert('¿Descartar este gasto?', 'Lo que cargaste no se va a guardar.', [
      { text: 'Seguir editando', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: () => goBack(router) },
    ]);
  }

  async function save() {
    if (!canSave || category == null) return;

    // Should 2 · §32 · "los dos cargan el mismo gasto": se pregunta antes.
    if (isShared && space != null && kind === 'expense' && !repeats) {
      const go = await confirmIfDuplicate({
        expenses: space.facts.expenses,
        amount,
        date,
        mySlot: space.mySlot,
        otherName: space.other.displayName,
      });
      if (!go) return;
    }

    setSaving(true);

    try {
      // M3 · con un espacio elegido, es un gasto compartido (§18).
      if (isShared && space != null && kind === 'expense') {
        const payerSlot = payerIsMe ? space.mySlot : space.other.slot;

        const audience = spaceAudience(space.facts.space.name, space.other);
        const spaceId = space.facts.space.id;

        if (repeats) {
          const id = await createSharedRecurrence.mutateAsync({
            spaceId: space.facts.space.id,
            amount,
            category,
            dayOfMonth: dayOf(date),
            startMonth: monthOf(date),
            payerSlot,
            split,
            myPaymentMethodId: payerIsMe ? paymentMethodId : null,
            mySlot: space.mySlot,
            description,
          });
          feedback.saved({ audience, detail: effect, undo: { kind: 'recurrence', id, spaceId } });
        } else {
          const id = await createSharedExpense.mutateAsync({
            spaceId: space.facts.space.id,
            amount,
            date,
            category,
            description: description.trim() === '' ? null : description.trim(),
            payerSlot,
            split,
            mySlot: space.mySlot,
            installmentCount,
            pinnedFirstMonth: null,
            myPaymentMethod: payerIsMe ? method : null,
          });
          feedback.saved({ audience, detail: effect, undo: { kind: 'shared-expense', id, spaceId } });
        }
        goBack(router);
        return;
      }

      if (repeats && kind === 'expense') {
        // §21 · un fijo mensual, no un gasto puntual.
        const id = await createRecurrence.mutateAsync({
          kind: 'expense',
          amount,
          category,
          dayOfMonth: dayOf(date),
          startMonth: monthOf(date),
          endMonth: null,
          paymentMethodId,
          description,
        });
        feedback.saved({ audience: PRIVATE, detail: effect, undo: { kind: 'recurrence', id } });
      } else {
        const id = await createMovement.mutateAsync({
          kind,
          amount,
          date,
          category,
          description: description.trim() === '' ? null : description.trim(),
          paymentMethod: method,
          installmentCount,
          pinnedFirstMonth: null,
        });
        feedback.saved({ audience: PRIVATE, detail: effect, undo: { kind: 'movement', id } });
      }

      goBack(router);
    } catch (cause) {
      setSaving(false);
      feedback.error('No pudimos guardarlo', cause);
    }
  }

  return (
    <Screen
      footer={
        // Fijo abajo y sobre el teclado: se ve mientras se escribe (10/10).
        <SaveFooter reason={blockReason}>
          <Button
            label="Guardar"
            size="lg"
            fullWidth
            haptic="success"
            disabled={!canSave}
            loading={saving}
            onPress={() => void save()}
          />
        </SaveFooter>
      }
    >
      <Stack gap="7">
        <Row justify="space-between" align="center">
          <Text variant="heading">Agregar</Text>
          <IconButton
            label="Cerrar"
            onPress={close}
            icon={<X size={18} color={theme.colors.textSecondary} />}
          />
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
              if (next === 'income') {
                setPaymentMethodId(null);
                // §17 campo 1 · los ingresos son siempre personales.
                setDestination(null);
              }
            }}
          />
        )}

        {/* §17 campo 2 */}
        <AmountInput value={amount} onChange={setAmount} />

        {/* §17 campo 3 */}
        <Field label="Categoría">
          <CategoryGrid categories={categories} value={category} onChange={setCategory} />
        </Field>

        {/* §17 campo 4 · CA-10 · "Solo yo" por defecto + un chip por espacio,
            con la audiencia visible. Los ingresos son siempre personales. */}
        <Field label="Destino">
          <Row gap="2" style={{ flexWrap: 'wrap' }}>
            <Chip
              label="Solo yo"
              selected={destination == null}
              onPress={() => setDestination(null)}
            />
            {kind === 'expense' &&
              (spaces ?? []).map((item) => (
                <Chip
                  key={item.id}
                  label={item.name}
                  selected={destination === item.id}
                  onPress={() => {
                    setDestination(item.id);
                    setPayerIsMe(true);
                    setSplit({ mode: 'even' });
                  }}
                />
              ))}
          </Row>
          {/* PR-03 · siempre dice quién lo va a ver. */}
          <AudienceBadge
            audience={
              isShared && space != null
                ? { kind: 'shared', otherMemberName: space.other.displayName }
                : { kind: 'private' }
            }
          />
        </Field>

        {/* §17 campos 5 y 6 · solo con un espacio elegido. */}
        {isShared && space != null && (
          <Animated.View entering={FadeIn.duration(duration.quick)}>
            <Stack gap="7">
              {/* G-06 · quién fue DECLARADO como pagador. */}
              <Field label="¿Quién pagó?">
                <Row gap="2">
                  <Chip label="Yo" selected={payerIsMe} onPress={() => setPayerIsMe(true)} />
                  <Chip
                    label={space.other.displayName}
                    selected={!payerIsMe}
                    onPress={() => {
                      setPayerIsMe(false);
                      // C-05 · el medio de pago es privado de quien pagó.
                      setPaymentMethodId(null);
                    }}
                  />
                </Row>
              </Field>

              {/* P3 · 50/50 o personalizado por monto, sin porcentajes. */}
              {amount > 0 && (
                <Field label="¿Cómo lo reparten?">
                  <SplitPicker
                    total={amount}
                    split={split}
                    onChange={setSplit}
                    mySlot={space.mySlot}
                    myName={space.me.displayName}
                    otherName={space.other.displayName}
                  />
                </Field>
              )}
            </Stack>
          </Animated.View>
        )}

        {/* §17 campo 7 · solo si pagó el usuario, y solo en Estado A (A-05). */}
        {kind === 'expense' && iPay && accountState === 'personal' && (
          <Field label="¿Con qué lo pagaste?">
            <PaymentMethodField
              methods={facts.paymentMethods}
              value={paymentMethodId}
              // Cambiar el medio NO borra las cuotas: §19 permite "crédito sin
              // tarjeta, en cuotas". Lo que cambia es el cronograma, y de eso
              // se encarga el dominio (Q-02 con tarjeta, Q-03 sin ella).
              onChange={setPaymentMethodId}
            />
          </Field>
        )}

        {/* §17 campos 8 a 11 · lo que un gasto cotidiano casi nunca necesita.
            Plegado, pero la fila dice lo que tiene elegido (10/10). */}
        <MoreOptions
          open={moreOpen}
          onToggle={() => setMoreOpen(!moreOpen)}
          summary={moreOptionsSummary({
            date,
            today,
            installmentCount: kind === 'expense' ? installmentCount : null,
            repeats: kind === 'expense' && repeats,
            description,
          })}
        >
          {/* §17 campo 8 */}
          {kind === 'expense' && !repeats && (
            <Field label="En cuotas">
              {/* El picker muestra solo el aviso de "Cuotas menores a 2" (§17). */}
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

          {/* §17 campo 10 · con un fijo, el día elegido es el día de cada mes. */}
          <Field label={repeats ? 'Desde' : 'Fecha'}>
            <PastDateField value={date} onChange={setDate} today={today} />
          </Field>

          {/* §17 campo 11 */}
          <Field label="Descripción (opcional)">
            <TextField
              value={description}
              onChangeText={setDescription}
              placeholder="Supermercado, nafta, regalo…"
              maxLength={140}
              accessibilityLabel="Descripción"
            />
            {/* Should 8 · sugiere, nunca elige sola. */}
            <SuggestedCategory
              suggestion={suggestedCategory}
              current={category}
              onUse={setCategory}
            />
          </Field>
        </MoreOptions>

        {/* §17 campo 12 · la vista previa. Nunca dice si alcanza. */}
        {plan != null && previewModel != null && (
          <InstallmentPreview model={previewModel} plan={plan} myShareRatio={myShareRatio} />
        )}

        {/* El efecto de lo que está por guardar. UX-15 · con vista previa de
            cuotas, ella ya cuenta el rango: no se repite (el aviso al guardar
            sí lo usa). */}
        {effect != null && previewModel == null && (
          <Animated.View entering={FadeIn.duration(duration.quick)}>
            <Card tone="sunken">
              <Text variant="small" tone="secondary">
                {effect}
              </Text>
            </Card>
          </Animated.View>
        )}
      </Stack>
    </Screen>
  );
}
