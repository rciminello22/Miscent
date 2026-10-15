import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Switch, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { goBack } from '@/features/shared/navigation';
import { X } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { addMonths, dayOf, monthOf } from '@domain/calendar';
import { resolveCardPayment } from '@domain/cards';
import { planInstallments } from '@domain/installments';
import { resolveShares } from '@domain/split';
import type { Category, Split } from '@domain/types';
import { formatDayMonth, formatMonth } from '@/lib/format';
import { AmountInput } from '@/features/add/AmountInput';
import { CategoryGrid } from '@/features/add/CategoryGrid';
import { EXPENSE_CATEGORIES, orderByUsage } from '@/features/add/categories';
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
import { GuestPersonalSheet } from '@/features/add/GuestPersonalSheet';
import { encodePersonalDraft } from '@/features/add/personalDraftCodec';
import { rememberPersonalDraft } from '@/features/add/personalDraft';
import { spaceAudience, useFeedback } from '@/features/shared/useFeedback';
import { SplitField } from '@/features/spaces/SplitField';
import { confirmIfDuplicate } from '@/features/spaces/confirmDuplicate';
import { SuggestedCategory } from '@/features/add/SuggestedCategory';
import { suggestCategory } from '@/features/add/suggestCategory';
import {
  useCreateSharedExpense,
  useCreateSharedRecurrence,
  useSpace,
} from '@/features/spaces/useSpaces';
import { usePersonalFacts } from '@/features/shared/usePersonalFacts';
import { savedBalanceDetail, savedDetail } from '@/features/spaces/savedBalance';
import { useSession } from '@/features/auth/SessionProvider';
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

/** P2 · la deuda se genera cuota por cuota, nunca entera hoy. */
const SALDO_POR_CUOTA = 'el saldo cambia con cada cuota, no hoy';

/**
 * §17 + §18 · agregar un gasto compartido.
 *
 * Los dos campos que no existen en un gasto personal son los que definen el
 * pilar compartido (K9):
 *   campo 5 · **quién pagó** — declarado, no verificado (G-06). Se puede
 *             declarar que pagó el otro, incluso si todavía no entró al
 *             espacio (E-02, Modo 1)
 *   campo 6 · **el reparto** — 50/50 o personalizado por monto (P3)
 *
 * Y una regla que es fácil pasar por alto: el medio de pago solo se pide si
 * pagó el propio usuario (§17 campo 7), porque es un detalle privado de quien
 * pagó (C-05). Nadie declara con qué pagó el otro.
 */
export default function AgregarCompartido() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const spaceId = id ?? '';

  const { accountState } = useSession();
  const { derived, today } = useSpace(spaceId);
  const { facts: personalFacts, expansion } = usePersonalFacts();

  const createExpense = useCreateSharedExpense(spaceId);
  const feedback = useFeedback();
  const createRecurrence = useCreateSharedRecurrence(spaceId);

  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState<Category | null>(null);
  const [payerIsMe, setPayerIsMe] = useState(true);
  const [split, setSplit] = useState<Split>({ mode: 'even' });
  // §17 campo 7 · "Medio de pago: Último usado" (ver app/agregar.tsx).
  const lastUsedMethodId = useMemo(
    () => lastUsedPaymentMethodId(personalFacts.movements, personalFacts.paymentMethods),
    [personalFacts.movements, personalFacts.paymentMethods],
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
  const [moreOpen, setMoreOpen] = useState(false);
  const [installmentCount, setInstallmentCount] = useState<number | null>(null);
  const [repeats, setRepeats] = useState(false);
  // §17 campo 10 · hoy por defecto; nunca una fecha futura.
  const [date, setDate] = useState(today);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  // CA-07 · Caso 18 · la invitada tocó "Personal" en Destino.
  const [personalAsked, setPersonalAsked] = useState(false);

  const method = personalFacts.paymentMethods.find((item) => item.id === paymentMethodId) ?? null;
  const isCard = method?.kind === 'card';

  const categories = useMemo(() => {
    const usage = new Map<Category, number>();
    for (const expense of derived?.facts.expenses ?? []) {
      usage.set(expense.category, (usage.get(expense.category) ?? 0) + 1);
    }
    return orderByUsage(EXPENSE_CATEGORIES, usage);
  }, [derived?.facts.expenses]);

  const shares = useMemo(
    () => (amount > 0 ? resolveShares(amount, split) : { slot1: 0, slot2: 0 }),
    [amount, split],
  );

  const plan = useMemo(() => {
    if (!isValidInstallmentCount(installmentCount) || amount === 0) return null;
    return planInstallments({
      purchaseDate: date,
      count: installmentCount,
      // C-05 · si pagó el otro, no hay tarjeta conocida → Q-03.
      card: payerIsMe && isCard ? method : null,
    });
  }, [installmentCount, amount, payerIsMe, isCard, method, date]);

  // Should 8 · lo que ya se cargó en este espacio y lo personal propio.
  const suggestedCategory = useMemo(
    () =>
      suggestCategory(description, 'expense', [
        ...(derived?.facts.expenses ?? []),
        ...personalFacts.movements,
      ]),
    [description, derived?.facts.expenses, personalFacts.movements],
  );

  /**
   * §17 · el efecto, que es lo que vuelve útil el registro.
   *
   * Va ANTES del return de "Cargando…": un hook después de un return
   * condicional cambia la cantidad de hooks entre renders y React se cae.
   */
  const effect = useMemo(() => {
    if (amount === 0) return null;

    const parts: string[] = [];

    if (plan != null) {
      const last = addMonths(plan.firstMonth, plan.count - 1);
      parts.push(
        `${plan.count} cuotas, de ${formatMonth(plan.firstMonth, monthOf(today))} a ${formatMonth(last, monthOf(today))}`,
      );
      parts.push(SALDO_POR_CUOTA);
    } else if (repeats) {
      parts.push('se repite todos los meses');
    } else if (payerIsMe && isCard && method != null) {
      const schedule = resolveCardPayment(method, date);
      // P19 · aunque se pague con tarjeta, el saldo cambia en la fecha de compra.
      parts.push(`lo pagás en ${formatMonth(schedule.month, monthOf(today))}`);
      parts.push(
        date === today
          ? 'el saldo entre ustedes cambia hoy'
          : `el saldo entre ustedes cambia desde el ${formatDayMonth(date)}`,
      );
    }

    return parts.length > 0 ? parts.join(' · ') : null;
  }, [amount, plan, repeats, payerIsMe, isCard, method, date, today]);

  if (derived == null) {
    return (
      <Screen>
        <Text variant="body" tone="secondary">
          Cargando…
        </Text>
      </Screen>
    );
  }

  const { mySlot, other, me } = derived;
  const payerSlot = payerIsMe ? mySlot : other.slot;
  const myShare = mySlot === 1 ? shares.slot1 : shares.slot2;
  const otherShare = mySlot === 1 ? shares.slot2 : shares.slot1;

  // §17 campo 12 · K9 · solo con cuenta personal, y solo tu parte.
  const myShareRatio = amount === 0 ? 1 : myShare / amount;
  const previewModel =
    plan != null && amount > 0 && accountState === 'personal'
      ? buildInstallmentPreview({ expansion, total: amount, plan, myShareRatio, today })
      : null;
  const cardEffect =
    previewModel != null && plan != null
      ? `${SALDO_POR_CUOTA.charAt(0).toUpperCase()}${SALDO_POR_CUOTA.slice(1)}.`
      : effect;

  // UX-16 · un solo lugar decide si se guarda y por qué no (incluida la
  // cantidad de cuotas fuera de 2 a 36 de UX-06).
  const form = { amount, category, installmentCount, destinationLoading: false };
  const canSave = canSaveForm(form) && !saving;
  const blockReason = saving ? null : saveBlockReason(form);
  const dirty =
    amount > 0 || category != null || description.trim() !== '' || date !== today;

  function close() {
    if (!dirty) {
      goBack(router);
      return;
    }
    Alert.alert('¿Descartar este gasto?', 'Lo que cargaste no se va a guardar.', [
      { text: 'Seguir editando', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: () => goBack(router) },
    ]);
  }

  /** Caso 18 · "Si crea la cuenta, el borrador se guarda como personal al terminar". */
  async function createAccountWithDraft() {
    const encoded = encodePersonalDraft({ amount, category, date, description });
    if (encoded != null) await rememberPersonalDraft(encoded);
    setPersonalAsked(false);
    router.push('/onboarding/cuenta-personal');
  }

  async function save() {
    if (!canSave || category == null) return;

    // Should 2 · §32 · "los dos cargan el mismo gasto": se pregunta antes.
    if (!repeats) {
      const go = await confirmIfDuplicate({
        expenses: derived!.facts.expenses,
        amount,
        date,
        mySlot,
        otherName: other.displayName,
      });
      if (!go) return;
    }

    setSaving(true);

    try {
      const audience = spaceAudience(derived!.facts.space.name, other);
      if (repeats) {
        const id = await createRecurrence.mutateAsync({
          spaceId,
          amount,
          category,
          dayOfMonth: dayOf(date),
          startMonth: monthOf(date),
          payerSlot,
          split,
          myPaymentMethodId: payerIsMe ? paymentMethodId : null,
          mySlot,
          description,
        });
        feedback.saved({ audience, detail: effect, undo: { kind: 'recurrence', id, spaceId } });
      } else {
        const id = await createExpense.mutateAsync({
          spaceId,
          amount,
          date,
          category,
          description: description.trim() === '' ? null : description.trim(),
          payerSlot,
          split,
          mySlot,
          installmentCount,
          pinnedFirstMonth: null,
          myPaymentMethod: payerIsMe ? method : null,
        });
        // UX-27 · §17: "Con esto, Martina te debe $X", solo si el gasto mueve el saldo hoy.
        const balanceDetail = savedBalanceDetail({
          facts: derived!.facts,
          mySlot,
          today,
          draft: { amount, date, category, payerSlot, split, installmentCount, repeats: false },
        });
        feedback.saved({
          audience,
          detail: savedDetail(balanceDetail, effect),
          undo: { kind: 'shared-expense', id, spaceId },
        });
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
        <SaveFooter
          audience={{ kind: 'shared', otherMemberName: derived.other.displayName }}
          reason={blockReason}
        >
          <Button
            label="Guardar"
            variant="shared"
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
          <Text variant="heading">Gasto de {derived.facts.space.name}</Text>
          <IconButton
            label="Cerrar"
            onPress={close}
            icon={<X size={18} color={theme.colors.textSecondary} />}
          />
        </Row>

        {/* §12 · la audiencia, siempre visible. */}
        <AudienceBadge audience={{ kind: 'shared', otherMemberName: other.displayName }} />

        <AmountInput value={amount} onChange={setAmount} />

        <Field label="Categoría">
          <CategoryGrid categories={categories} value={category} onChange={setCategory} />
        </Field>

        {/* CA-07 · Caso 18 · sin cuenta personal, "Personal" se ofrece igual:
            explica dónde viven esos gastos en vez de esconder la opción. */}
        {accountState !== 'personal' && (
          <Field label="Destino" hint={`${other.displayName} lo va a ver.`}>
            <Row gap="2">
              <Chip label="Personal" selected={false} onPress={() => setPersonalAsked(true)} />
              <Chip label={derived.facts.space.name} selected onPress={() => undefined} />
            </Row>
          </Field>
        )}

        {/* §17 campo 5 · G-06 · quién fue DECLARADO como pagador. */}
        <Field
          label="¿Quién pagó?"
          hint={
            other.status === 'no_access'
              ? `Podés anotar lo que pagó ${other.displayName} aunque todavía no haya entrado.`
              : undefined
          }
        >
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

        {/* §17 campo 6 · P3 · siempre está: no aparece al tipear (UX-15). */}
        <SplitField
          total={amount}
          split={split}
          onChange={setSplit}
          mySlot={mySlot}
          myName={me.displayName}
          otherName={other.displayName}
        />

        {/* §17 campo 7 · solo si pagó el usuario, y solo en Estado A. */}
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

        {/* §17 campos 8 a 11 · plegados, con lo elegido a la vista (10/10). */}
        <MoreOptions
          open={moreOpen}
          onToggle={() => setMoreOpen(!moreOpen)}
          summary={moreOptionsSummary({ date, today, installmentCount, repeats, description })}
        >
          {/* §17 campo 8 */}
          {!repeats && (
            <Field label="En cuotas">
              <InstallmentCountPicker value={installmentCount} onChange={setInstallmentCount} />
            </Field>
          )}

          {/* §17 campo 9 */}
          {installmentCount == null && (
            <Row justify="space-between" align="center">
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="smallMedium" tone="secondary">
                  Se repite cada mes
                </Text>
                <Text variant="caption" tone="muted">
                  Un fijo compartido: alquiler, expensas, servicios.
                </Text>
              </View>
              <Switch
                value={repeats}
                onValueChange={setRepeats}
                trackColor={{ false: theme.colors.surfaceSunken, true: theme.colors.shared }}
                accessibilityLabel="Se repite cada mes"
              />
            </Row>
          )}

          {/* §17 campo 10 · con un fijo, el día elegido es el día de cada mes. */}
          <Field label={repeats ? 'Desde' : 'Fecha'}>
            <PastDateField value={date} onChange={setDate} today={today} />
          </Field>

          <Field label="Descripción (opcional)">
            <TextField
              value={description}
              onChangeText={setDescription}
              placeholder="Supermercado, internet, heladera…"
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

        {/* §17 campo 12 · K9 · la vista previa cuenta solo tu parte. */}
        {plan != null && previewModel != null && (
          <InstallmentPreview model={previewModel} plan={plan} myShareRatio={myShareRatio} />
        )}

        {/* §17 · "Con esto, Martina te debe $20.000" */}
        {amount > 0 && (
          <Animated.View entering={FadeIn.duration(duration.quick)}>
            <Card tone="shared">
              <Stack gap="2">
                <Row justify="space-between" align="baseline">
                  <Text variant="small" tone="secondary">
                    Tu parte
                  </Text>
                  <Money amount={myShare} variant="smallMedium" animate />
                </Row>
                <Row justify="space-between" align="baseline">
                  <Text variant="small" tone="secondary">
                    Parte de {other.displayName}
                  </Text>
                  <Money amount={otherShare} variant="smallMedium" animate />
                </Row>

                {/* UX-15 · con vista previa de cuotas, ella ya cuenta el rango:
                    acá queda solo lo que ella no dice, el efecto en el saldo. */}
                {cardEffect != null && (
                  <Text variant="caption" tone="muted">
                    {cardEffect}
                  </Text>
                )}
              </Stack>
            </Card>
          </Animated.View>
        )}

        {/* §12 · lo que el otro va a ver, antes de guardar. */}
        <Text variant="caption" tone="muted" align="center">
          {other.displayName} va a ver el monto, la fecha, la categoría, quién pagó y el
          reparto. No va a ver con qué lo pagaste.
        </Text>
      </Stack>

      <GuestPersonalSheet
        visible={personalAsked}
        spaceName={derived.facts.space.name}
        onCreateAccount={() => void createAccountWithDraft()}
        onLoadInSpace={() => setPersonalAsked(false)}
        onCancel={() => setPersonalAsked(false)}
      />
    </Screen>
  );
}
