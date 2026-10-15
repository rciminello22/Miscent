import { useMemo, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { addMonths, monthOf, type IsoDate } from '@domain/calendar';
import { lastClosedStatement } from '@domain/cards';
import { alreadyInSpaces } from '@domain/duplicates';
import { formatMonth, formatPesos } from '@/lib/format';
import { queryKeys } from '@/data/queryClient';
import { createDeclaredStatement } from '@/data/repositories/mutations';
import { supabase } from '@/data/supabase';
import { useSession } from '@/features/auth/SessionProvider';
import { useFeedback } from '@/features/shared/useFeedback';
import { usePersonalFacts } from '@/features/shared/usePersonalFacts';
import { useToday } from '@/features/shared/useToday';
import { AmountInput } from '@/features/add/AmountInput';
import { DateField } from '@/features/add/DateField';
import { Field, Segmented } from '@/features/add/fields';
import { StepShell } from '@/features/onboarding/StepShell';
import { installmentsInSpaceLine } from '@/features/onboarding/alreadyInSpacesCopy';
import { categoryLabel } from '@/features/add/categories';
import { NumberField } from '@/features/onboarding/NumberField';
import {
  emptyPurchase,
  purchasesToSave,
  type ExistingPurchase,
} from '@/features/onboarding/existingPurchases';
import { Button, Card, Divider, Pressable, Row, Stack, Text } from '@/ui/primitives';
import { duration } from '@/ui/motion';
import { useTheme } from '@/ui/theme';
import { hitSlopFor } from '@/ui/touch';

/**
 * O3 paso 4 · M5 · "Lo que ya debe al activar la cuenta personal".
 *
 * Es el paso que vuelve el radar útil desde el primer día, y §32 lo marca
 * como riesgo **"Rompe"** si falta: sin esto, el usuario ve un Futuro vacío
 * mientras en la realidad tiene seis cuotas por pagar, y deja de confiar en
 * la app.
 *
 * Tres cosas se cargan acá, cada una con su regla:
 *   T-07 · el resumen cerrado que todavía no pagó ("resumen pendiente
 *          declarado" — NO es deuda bancaria real)
 *   Q-06 · las cuotas en curso, como figuran en el resumen: "3 de 6, $30.000".
 *          La app genera las n−k que faltan desde el mes siguiente
 *   T-08 · lo consumido desde el último cierre, como un gasto en 1 pago
 */
export default function Deuda() {
  const theme = useTheme();
  const router = useRouter();
  const today = useToday();
  const { session } = useSession();
  const queryClient = useQueryClient();
  const feedback = useFeedback();
  const { facts } = usePersonalFacts();

  const cards = facts.paymentMethods.filter((method) => method.kind === 'card');
  const [index, setIndex] = useState(0);
  const card = cards[index];

  const [lastPaid, setLastPaid] = useState<'yes' | 'no'>('yes');
  const [pendingAmount, setPendingAmount] = useState(0);
  // null = el usuario no la tocó: vale la que se deduce de la tarjeta.
  const [pendingDueDate, setPendingDueDate] = useState<IsoDate | null>(null);
  // Q-06 · una o más compras en cuotas del último resumen.
  const keys = useRef(0);
  const newKey = () => String(++keys.current);
  const [purchases, setPurchases] = useState<ExistingPurchase[]>(() => [emptyPurchase('0')]);
  const [recentSpending, setRecentSpending] = useState(0);

  function updatePurchase(key: string, patch: Partial<ExistingPurchase>) {
    setPurchases((previous) =>
      previous.map((purchase) => (purchase.key === key ? { ...purchase, ...patch } : purchase)),
    );
  }
  function addPurchase() {
    setPurchases((previous) => [...previous, emptyPurchase(newKey())]);
  }
  function removePurchase(key: string) {
    setPurchases((previous) => previous.filter((purchase) => purchase.key !== key));
  }

  /**
   * El resumen que el usuario tiene en la mano: el último CERRADO. De él salen
   * el vencimiento propuesto para T-07 y el mes desde el que Q-06 genera las
   * cuotas que faltan. No es "el mes pasado": después del cierre, el último
   * resumen cerrado ya es el que vence el mes que viene.
   */
  const lastStatement = card != null ? lastClosedStatement(card, today) : null;

  // §13 O3 paso 4 · "se listan las cuotas compartidas que ya existen en sus
  // espacios para no repetirlas". Una sola vez, en la primera tarjeta: quien
  // venía de invitado nunca pudo decir con qué tarjeta pagó un gasto de Casa.
  const sharedInstallments = useMemo(
    () => alreadyInSpaces(facts.spaces, today).installments,
    [facts.spaces, today],
  );
  const lastStatementMonth = lastStatement?.month ?? monthOf(today);

  // §13 O3 paso 4 · "si no: monto y vencimiento". T-05 · sin día de
  // vencimiento conocido no se inventa: el usuario lo elige.
  const dueDate = pendingDueDate ?? lastStatement?.dueDate ?? null;
  const needsDueDate = lastPaid === 'no' && pendingAmount > 0 && dueDate == null;

  const save = useMutation({
    mutationFn: async () => {
      if (card == null || session == null) return;
      const userId = session.user.id;

      // T-07 · resumen pendiente declarado.
      if (lastPaid === 'no' && pendingAmount > 0 && dueDate != null) {
        await createDeclaredStatement(userId, {
          paymentMethodId: card.id,
          amount: pendingAmount,
          dueDate,
        });
      }

      // Q-06 · por cada compra, las cuotas que faltan, desde el mes siguiente
      // al último resumen.
      const toSave = purchasesToSave(purchases, { lastStatementMonth, impactDay: card.dueDay });
      if (toSave.length > 0) {
        const { error } = await supabase.from('personal_movements').insert(
          toSave.map((purchase) => ({
            user_id: userId,
            kind: 'expense' as const,
            amount: purchase.remainingTotal,
            date: today,
            category: 'otros' as const,
            description: purchase.description,
            payment_method_id: card.id,
            installments_count: purchase.plan.count,
            first_installment_month: purchase.plan.firstMonth,
            installment_impact_day: purchase.plan.impactDay,
            installments_approximate: purchase.plan.approximate,
          })),
        );
        // supabase-js no lanza: sin esto, un error dejaba el Futuro vacío en silencio.
        if (error != null) throw new Error('No pudimos guardar las cuotas.');
      }

      // T-08 · consumos desde el último cierre: 1 pago, fecha hoy.
      if (recentSpending > 0) {
        const { error } = await supabase.from('personal_movements').insert({
          user_id: userId,
          kind: 'expense',
          amount: recentSpending,
          date: today,
          category: 'otros',
          description: 'Consumos previos (aprox.)',
          payment_method_id: card.id,
          installments_count: null,
          first_installment_month: null,
          installment_impact_day: null,
          installments_approximate: false,
        });
        if (error != null) throw new Error('No pudimos guardar los consumos.');
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.personalFacts(userId) });
    },
    onSuccess: () => next(),
    onError: (error: Error) => feedback.error('No pudimos guardarlo', error),
  });

  function next() {
    if (index + 1 < cards.length) {
      setIndex(index + 1);
      setLastPaid('yes');
      setPendingAmount(0);
      setPendingDueDate(null);
      setPurchases([emptyPurchase(newKey())]);
      setRecentSpending(0);
      return;
    }
    // §11 paso 4 · antes de los fijos: los gastos de sus espacios que pagó.
    router.push('/onboarding/pagados');
  }

  // Sin tarjetas no hay nada que deber. Inline, nunca un replace durante el
  // render: el router lo procesa tarde y hacía loop (HANDOFF §11).
  if (card == null) return <Redirect href="/onboarding/pagados" />;

  return (
    <StepShell
      step={3}
      total={5}
      title={`¿Qué debés de tu ${card.name}?`}
      description="Esto es lo que hace que tus próximos meses sean reales desde hoy."
      help="Abrí tu último resumen o la app del banco. Si no te acordás de algo, dejalo vacío y cargalo después."
      saving={save.isPending}
      continueDisabled={needsDueDate}
      onContinue={() => void save.mutateAsync()}
      onSkip={next}
      continueLabel={index + 1 < cards.length ? 'Siguiente tarjeta' : 'Continuar'}
    >
      <Stack gap="6">
        {/* T-07 */}
        <Field label="¿Pagaste el último resumen?">
          <Segmented
            options={[
              { value: 'yes', label: 'Sí' },
              { value: 'no', label: 'Todavía no' },
            ]}
            value={lastPaid}
            onChange={setLastPaid}
          />
        </Field>

        {lastPaid === 'no' && (
          <Animated.View entering={FadeInDown.duration(duration.base)}>
            <Stack gap="6">
              <Field label="¿De cuánto es?">
                <View>
                  <AmountInput value={pendingAmount} onChange={setPendingAmount} autoFocus={false} />
                </View>
              </Field>

              <Field label="¿Cuándo vence?" hint="Fijate la fecha en el resumen.">
                <DateField
                  value={dueDate}
                  onChange={setPendingDueDate}
                  fallback={today}
                  placeholder="Elegí la fecha"
                  accessibilityLabel="Vencimiento del resumen"
                />
              </Field>
            </Stack>
          </Animated.View>
        )}

        <Divider />

        {/* Q-06 */}
        <Stack gap="4">
          <Text variant="smallMedium" tone="secondary">
            ¿Tenés cuotas en curso?
          </Text>

          {index === 0 && sharedInstallments.length > 0 && (
            <Card tone="sunken">
              <Stack gap="2">
                <Text variant="small">
                  Estas ya están en tus espacios y tu parte ya cuenta. No las cargues de nuevo acá:
                </Text>
                {sharedInstallments.map((item) => (
                  <Text key={item.expenseId} variant="caption" tone="shared">
                    {installmentsInSpaceLine({
                      ...item,
                      label: item.description ?? categoryLabel(item.category),
                    })}
                  </Text>
                ))}
              </Stack>
            </Card>
          )}

          {purchases.map((purchase, position) => (
            <Animated.View
              key={purchase.key}
              entering={FadeInDown.duration(duration.base)}
              layout={LinearTransition}
            >
              <PurchaseForm
                purchase={purchase}
                // La primera no se numera: con una sola, "Compra 1" sobra.
                title={purchases.length > 1 ? `Compra ${position + 1}` : null}
                firstMonthLabel={formatMonth(addMonths(lastStatementMonth, 1), monthOf(today))}
                onChange={(patch) => updatePurchase(purchase.key, patch)}
                onRemove={purchases.length > 1 ? () => removePurchase(purchase.key) : null}
              />
            </Animated.View>
          ))}

          {/* §13 · "cuotas del último resumen", en plural. */}
          {purchases.some((purchase) => purchase.installmentAmount > 0) && (
            <Button
              label="Otra compra en cuotas"
              variant="ghost"
              icon={<Plus size={16} color={theme.colors.brand} />}
              onPress={addPurchase}
            />
          )}
        </Stack>

        <Divider />

        {/* T-08 */}
        <Field
          label="¿Cuánto gastaste desde el último cierre?"
          hint="Aproximado. Son las compras que todavía no aparecieron en ningún resumen."
        >
          <View>
            <AmountInput value={recentSpending} onChange={setRecentSpending} autoFocus={false} />
          </View>
        </Field>
      </Stack>
    </StepShell>
  );
}

/**
 * Q-06 · una compra en cuotas, como figura en el resumen: "3 de 6, $30.000".
 * La descripción es opcional, pero con varias es lo que las distingue después
 * en Movimientos y en Futuro.
 */
function PurchaseForm({
  purchase,
  title,
  firstMonthLabel,
  onChange,
  onRemove,
}: {
  purchase: ExistingPurchase;
  title: string | null;
  firstMonthLabel: string;
  onChange: (patch: Partial<ExistingPurchase>) => void;
  onRemove: (() => void) | null;
}) {
  const theme = useTheme();
  const { installmentAmount, paidCount, totalCount } = purchase;
  const complete = paidCount != null && totalCount != null && totalCount > paidCount;

  return (
    <Card tone={title != null ? 'sunken' : 'surface'}>
      <Stack gap="4">
        {(title != null || onRemove != null) && (
          <Row justify="space-between" align="center">
            <Text variant="smallMedium">{title}</Text>
            {onRemove != null && (
              <Pressable
                onPress={onRemove}
                haptic="none"
                accessibilityRole="button"
                accessibilityLabel={`Quitar ${title ?? 'esta compra'}`}
                hitSlop={hitSlopFor(18, 18)}
              >
                <X size={18} color={theme.colors.textSecondary} />
              </Pressable>
            )}
          </Row>
        )}

        <Field label="¿Qué compraste?" hint="Opcional. Te sirve para reconocerla después.">
          <TextInput
            value={purchase.description}
            onChangeText={(description) => onChange({ description })}
            placeholder="Heladera, celular, zapatillas…"
            placeholderTextColor={theme.colors.textMuted}
            maxLength={140}
            accessibilityLabel="Qué compraste"
            style={[
              theme.typography.body,
              {
                color: theme.colors.text,
                borderRadius: theme.radius.md,
                borderWidth: 1,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
                paddingHorizontal: theme.space['4'],
                height: 48,
              },
            ]}
          />
        </Field>

        <Field label="Valor de cada cuota">
          <View>
            <AmountInput
              value={installmentAmount}
              onChange={(amount) => onChange({ installmentAmount: amount })}
              autoFocus={false}
            />
          </View>
        </Field>

        {installmentAmount > 0 && (
          <Animated.View entering={FadeInDown.duration(duration.base)}>
            <Stack gap="4">
              <Field label="Vas por la cuota…">
                <NumberField value={paidCount} onChange={(next) => onChange({ paidCount: next })} max={36} />
              </Field>

              <Field label="…de un total de">
                <NumberField value={totalCount} onChange={(next) => onChange({ totalCount: next })} max={36} />
              </Field>

              {complete && (
                <Card tone="brand">
                  <Text variant="small">
                    Faltan {totalCount - paidCount} cuotas de {formatPesos(installmentAmount)}, desde{' '}
                    {firstMonthLabel}.
                  </Text>
                </Card>
              )}
            </Stack>
          </Animated.View>
        )}
      </Stack>
    </Card>
  );
}
