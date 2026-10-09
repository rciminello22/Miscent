import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { addMonths, monthOf, type IsoDate } from '@domain/calendar';
import { lastClosedStatement } from '@domain/cards';
import { planExistingInstallments } from '@domain/installments';
import { formatMonth, formatPesos } from '@/lib/format';
import { queryKeys } from '@/data/queryClient';
import { createDeclaredStatement } from '@/data/repositories/mutations';
import { supabase } from '@/data/supabase';
import { useSession } from '@/features/auth/SessionProvider';
import { usePersonalFacts } from '@/features/shared/usePersonalFacts';
import { useToday } from '@/features/shared/useToday';
import { AmountInput } from '@/features/add/AmountInput';
import { DateField } from '@/features/add/DateField';
import { Field, Segmented } from '@/features/add/fields';
import { StepShell } from '@/features/onboarding/StepShell';
import { NumberField } from '@/features/onboarding/NumberField';
import { Card, Divider, Stack, Text } from '@/ui/primitives';
import { duration } from '@/ui/motion';

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
  const router = useRouter();
  const today = useToday();
  const { session } = useSession();
  const queryClient = useQueryClient();
  const { facts } = usePersonalFacts();

  const cards = facts.paymentMethods.filter((method) => method.kind === 'card');
  const [index, setIndex] = useState(0);
  const card = cards[index];

  const [lastPaid, setLastPaid] = useState<'yes' | 'no'>('yes');
  const [pendingAmount, setPendingAmount] = useState(0);
  // null = el usuario no la tocó: vale la que se deduce de la tarjeta.
  const [pendingDueDate, setPendingDueDate] = useState<IsoDate | null>(null);
  const [installmentAmount, setInstallmentAmount] = useState(0);
  const [paidCount, setPaidCount] = useState<number | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [recentSpending, setRecentSpending] = useState(0);

  /**
   * El resumen que el usuario tiene en la mano: el último CERRADO. De él salen
   * el vencimiento propuesto para T-07 y el mes desde el que Q-06 genera las
   * cuotas que faltan. No es "el mes pasado": después del cierre, el último
   * resumen cerrado ya es el que vence el mes que viene.
   */
  const lastStatement = card != null ? lastClosedStatement(card, today) : null;
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

      // Q-06 · las cuotas que faltan, desde el mes siguiente al último resumen.
      if (installmentAmount > 0 && paidCount != null && totalCount != null && totalCount > paidCount) {
        const existing = planExistingInstallments({
          installmentAmount,
          paidCount,
          totalCount,
          lastStatementMonth,
          impactDay: card.dueDay,
        });

        await supabase.from('personal_movements').insert({
          user_id: userId,
          kind: 'expense',
          amount: existing.remainingTotal,
          date: today,
          category: 'otros',
          description: 'Cuotas en curso',
          payment_method_id: card.id,
          installments_count: existing.plan.count,
          first_installment_month: existing.plan.firstMonth,
          installment_impact_day: existing.plan.impactDay,
          installments_approximate: existing.plan.approximate,
        });
      }

      // T-08 · consumos desde el último cierre: 1 pago, fecha hoy.
      if (recentSpending > 0) {
        await supabase.from('personal_movements').insert({
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
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.personalFacts(userId) });
    },
    onSuccess: () => next(),
  });

  function next() {
    if (index + 1 < cards.length) {
      setIndex(index + 1);
      setLastPaid('yes');
      setPendingAmount(0);
      setPendingDueDate(null);
      setInstallmentAmount(0);
      setPaidCount(null);
      setTotalCount(null);
      setRecentSpending(0);
      return;
    }
    router.push('/onboarding/fijos');
  }

  if (card == null) {
    router.replace('/onboarding/fijos');
    return null;
  }

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

          <Field label="Valor de cada cuota">
            <View>
              <AmountInput
                value={installmentAmount}
                onChange={setInstallmentAmount}
                autoFocus={false}
              />
            </View>
          </Field>

          {installmentAmount > 0 && (
            <Animated.View entering={FadeInDown.duration(duration.base)}>
              <Stack gap="4">
                <Field label="Vas por la cuota…">
                  <NumberField value={paidCount} onChange={setPaidCount} max={36} />
                </Field>

                <Field label="…de un total de">
                  <NumberField value={totalCount} onChange={setTotalCount} max={36} />
                </Field>

                {paidCount != null && totalCount != null && totalCount > paidCount && (
                  <Card tone="brand">
                    <Text variant="small">
                      Faltan {totalCount - paidCount} cuotas de{' '}
                      {formatPesos(installmentAmount)}, desde{' '}
                      {formatMonth(addMonths(lastStatementMonth, 1), monthOf(today))}.
                    </Text>
                  </Card>
                )}
              </Stack>
            </Animated.View>
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
