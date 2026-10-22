import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CreditCard, Plus } from 'lucide-react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { activePaymentMethods, isCardDateApprox, resolveCardPayment } from '@domain/cards';
import { formatDayMonth, formatMonth } from '@/lib/format';
import { queryKeys } from '@/data/queryClient';
import { createPaymentMethod } from '@/data/repositories/mutations';
import { useSession } from '@/features/auth/SessionProvider';
import { useFeedback } from '@/features/shared/useFeedback';
import { usePersonalFacts } from '@/features/shared/usePersonalFacts';
import { useToday } from '@/features/shared/useToday';
import { Field } from '@/features/add/fields';
import { DayAnswerField } from '@/features/onboarding/DayAnswerField';
import { dayAnswerToStored, emptyAnswer, isAnswered } from '@/features/onboarding/dayAnswer';
import { StepShell } from '@/features/onboarding/StepShell';
import { onboardingBranches, onboardingProgress } from '@/features/onboarding/onboardingProgress';
import { cardScheduleLine } from '@/features/profile/cards';
import { goBack } from '@/features/shared/navigation';
import { Button, Card, Divider, Row, Stack, Text, TextField } from '@/ui/primitives';
import { duration } from '@/ui/motion';
import { useTheme } from '@/ui/theme';

/**
 * O3 paso 3 · Tarjetas: nombre, día de cierre, día de vencimiento.
 *
 * "Solo el nombre y los días. Nunca el número." (§13)
 *
 * Y acá está la razón por la que la tarjeta existe en este producto: con el
 * cierre y el vencimiento, T-03 puede decidir en qué resumen cae cada compra.
 * Eso es lo que convierte "compré algo con la Visa" en "se paga el 5 de
 * noviembre", que es la pregunta que el usuario no puede responder sin sumar
 * resúmenes a mano.
 *
 * T-02 · los dos días pueden ser "No sé", y entonces T-05 aproxima y la app
 * lo dice ("Fechas aproximadas"). Nunca se inventa un día.
 */
export default function Tarjetas() {
  const theme = useTheme();
  const router = useRouter();
  const today = useToday();
  const { session } = useSession();
  const queryClient = useQueryClient();
  const feedback = useFeedback();
  const { facts } = usePersonalFacts();
  // UX-21 · desde Perfil > Tarjetas esta pantalla da de alta UNA tarjeta y vuelve:
  // no es el paso 2 del wizard, así que no sigue a Deuda, Pagados y Fijos.
  const { desde } = useLocalSearchParams<{ desde?: string }>();
  const standalone = desde === 'perfil';

  const [name, setName] = useState('');
  // T-02 · sin respuesta de antemano; "No sé" y sin responder guardan lo mismo.
  const [closingAnswer, setClosingAnswer] = useState(emptyAnswer());
  const [dueAnswer, setDueAnswer] = useState(emptyAnswer());
  const closing = dayAnswerToStored(closingAnswer);
  const due = dayAnswerToStored(dueAnswer);
  const [adding, setAdding] = useState(standalone);

  const cards = activePaymentMethods(facts.paymentMethods).filter((method) => method.kind === 'card');
  // UX-22 · la barra cuenta los pasos que de verdad se recorren: con la primera
  // tarjeta aparece el paso de Deuda y el total crece.
  const progress = onboardingProgress('tarjetas', onboardingBranches(facts, today));

  const addCard = useMutation({
    mutationFn: () =>
      createPaymentMethod(session!.user.id, {
        kind: 'card',
        name: name.trim(),
        closingDay: closing.day,
        closingApprox: closing.approx,
        dueDay: due.day,
        dueApprox: due.approx,
      }),
    onSuccess: async () => {
      setName('');
      setClosingAnswer(emptyAnswer());
      setDueAnswer(emptyAnswer());
      setAdding(false);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.personalFacts(session?.user.id ?? 'anon'),
      });
      if (standalone) goBack(router);
    },
    onError: (error: Error) => feedback.error('No pudimos guardar la tarjeta', error),
  });

  /** La explicación concreta de lo que acaban de cargar. */
  const answered = isAnswered(closingAnswer) || isAnswered(dueAnswer);
  const previewCard = {
    id: 'preview',
    kind: 'card' as const,
    name: 'preview',
    closingDay: closing.day,
    dueDay: due.day,
    closingApprox: closing.approx,
    dueApprox: due.approx,
  };
  const preview = answered ? resolveCardPayment(previewCard, today) : null;

  const canAdd = name.trim().length > 0 && !addCard.isPending;
  // H-16 · una tarjeta escrita y sin guardar: "Continuar" la guarda primero, en
  // vez de descartarla en silencio. Si falla, se queda acá con lo escrito.
  const pendingCard = !standalone && adding && name.trim().length > 0;

  async function savePendingAndContinue() {
    try {
      await addCard.mutateAsync();
      router.push('/onboarding/deuda');
    } catch {
      // `onError` ya avisó; el formulario queda como estaba.
    }
  }

  return (
    <StepShell
      step={progress.step}
      total={standalone ? 0 : progress.total}
      title={standalone ? 'Agregar una tarjeta' : '¿Usás tarjetas de crédito?'}
      description="Con el día de cierre y el de vencimiento, la app sabe en qué resumen cae cada compra."
      help="Solo el nombre y los días. Nunca el número de la tarjeta."
      continueLabel={
        standalone
          ? 'Guardar tarjeta'
          : pendingCard
            ? 'Guardar y continuar'
            : cards.length > 0
              ? 'Continuar'
              : 'No uso tarjetas'
      }
      continueDisabled={standalone && !canAdd}
      saving={(standalone || pendingCard) && addCard.isPending}
      onContinue={() => {
        if (standalone) addCard.mutate();
        else if (pendingCard) void savePendingAndContinue();
        else router.push(cards.length > 0 ? '/onboarding/deuda' : '/onboarding/fijos');
      }}
      onSkip={
        standalone
          ? () => goBack(router)
          : cards.length > 0 || pendingCard
            ? undefined
            : () => router.push('/onboarding/fijos')
      }
      skipLabel={standalone ? 'Cancelar' : undefined}
    >
      <Stack gap="5">
        {!standalone && cards.length > 0 && (
          <Stack gap="3">
            {cards.map((card) => (
              <Animated.View key={card.id} layout={LinearTransition} entering={FadeInDown}>
                <Card>
                  <Row gap="3" align="center">
                    <CreditCard size={18} color={theme.colors.brand} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="bodyMedium">{card.name}</Text>
                      <Text variant="caption" tone="muted">
                        {cardScheduleLine(card)}
                      </Text>
                    </View>
                  </Row>
                </Card>
              </Animated.View>
            ))}
          </Stack>
        )}

        {!adding ? (
          <Button
            label={cards.length === 0 ? 'Agregar una tarjeta' : 'Agregar otra'}
            variant="secondary"
            icon={<Plus size={16} color={theme.colors.brand} />}
            onPress={() => setAdding(true)}
          />
        ) : (
          <Animated.View entering={FadeInDown.duration(duration.base)}>
            <Card>
              <Stack gap="5">
                <Field label="Nombre">
                  <TextField
                    value={name}
                    onChangeText={setName}
                    placeholder="Visa Galicia"
                    autoFocus
                    maxLength={60}
                    accessibilityLabel="Nombre de la tarjeta"
                  />
                </Field>

                <Field label="Día de cierre">
                  <DayAnswerField
                    label="Día de cierre"
                    value={closingAnswer}
                    onChange={setClosingAnswer}
                  />
                </Field>

                <Field label="Día de vencimiento">
                  <DayAnswerField
                    label="Día de vencimiento"
                    value={dueAnswer}
                    onChange={setDueAnswer}
                  />
                </Field>

                {preview != null && (
                  <>
                    <Divider />
                    <Text variant="small" tone="secondary">
                      Una compra de hoy se pagaría en{' '}
                      <Text variant="smallMedium">{formatMonth(preview.month)}</Text>
                      {isCardDateApprox(previewCard, preview) && preview.dueDate != null
                        ? `, alrededor del ${formatDayMonth(preview.dueDate)} aprox.`
                        : ''}
                      .
                    </Text>
                    {preview.approximate && !isCardDateApprox(previewCard, preview) && (
                      <Text variant="caption" tone="muted">
                        Fechas aproximadas. No inventamos ningún día. Cuando lo sepas, lo cambiás
                        desde la tarjeta, en Perfil.
                      </Text>
                    )}
                  </>
                )}

                {/* Suelta, el botón fijo de abajo ya es "Guardar tarjeta". */}
                {!standalone && (
                  <Button
                    label="Guardar tarjeta"
                    fullWidth
                    disabled={!canAdd}
                    loading={addCard.isPending}
                    haptic="success"
                    onPress={() => void addCard.mutateAsync()}
                  />
                )}
              </Stack>
            </Card>
          </Animated.View>
        )}
      </Stack>
    </StepShell>
  );
}
