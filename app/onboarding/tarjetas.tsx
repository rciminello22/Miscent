import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CreditCard, Plus } from 'lucide-react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { resolveCardPayment } from '@domain/cards';
import { formatMonth } from '@/lib/format';
import { queryKeys } from '@/data/queryClient';
import { createPaymentMethod } from '@/data/repositories/mutations';
import { useSession } from '@/features/auth/SessionProvider';
import { usePersonalFacts } from '@/features/shared/usePersonalFacts';
import { useToday } from '@/features/shared/useToday';
import { Field } from '@/features/add/fields';
import { DayNote, DayPicker } from '@/features/onboarding/DayPicker';
import { StepShell } from '@/features/onboarding/StepShell';
import { Button, Card, Divider, Row, Stack, Text } from '@/ui/primitives';
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
  const { facts } = usePersonalFacts();

  const [name, setName] = useState('');
  const [closingDay, setClosingDay] = useState<number | null>(null);
  const [dueDay, setDueDay] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  const cards = facts.paymentMethods.filter((method) => method.kind === 'card');

  const addCard = useMutation({
    mutationFn: () =>
      createPaymentMethod(session!.user.id, {
        kind: 'card',
        name: name.trim(),
        closingDay,
        dueDay,
      }),
    onSuccess: async () => {
      setName('');
      setClosingDay(null);
      setDueDay(null);
      setAdding(false);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.personalFacts(session?.user.id ?? 'anon'),
      });
    },
  });

  /** La explicación concreta de lo que acaban de cargar. */
  const preview =
    closingDay != null || dueDay != null
      ? resolveCardPayment(
          { id: 'preview', kind: 'card', name: 'preview', closingDay, dueDay },
          today,
        )
      : null;

  const canAdd = name.trim().length > 0 && !addCard.isPending;

  return (
    <StepShell
      step={2}
      total={5}
      title="¿Usás tarjetas de crédito?"
      description="Con el día de cierre y el de vencimiento, la app sabe en qué resumen cae cada compra."
      help="Solo el nombre y los días. Nunca el número de la tarjeta."
      continueLabel={cards.length > 0 ? 'Continuar' : 'No uso tarjetas'}
      onContinue={() =>
        router.push(cards.length > 0 ? '/onboarding/deuda' : '/onboarding/fijos')
      }
      onSkip={cards.length > 0 ? undefined : () => router.push('/onboarding/fijos')}
    >
      <Stack gap="5">
        {cards.length > 0 && (
          <Stack gap="3">
            {cards.map((card) => (
              <Animated.View key={card.id} layout={LinearTransition} entering={FadeInDown}>
                <Card>
                  <Row gap="3" align="center">
                    <CreditCard size={18} color={theme.colors.brand} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="bodyMedium">{card.name}</Text>
                      <Text variant="caption" tone="muted">
                        {card.closingDay != null && card.dueDay != null
                          ? `Cierra el ${card.closingDay}, vence el ${card.dueDay}`
                          : 'Fechas aproximadas'}
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
                  <View
                    style={{
                      borderRadius: theme.radius.md,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      paddingHorizontal: theme.space['4'],
                      height: 48,
                      justifyContent: 'center',
                    }}
                  >
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder="Visa Galicia"
                      placeholderTextColor={theme.colors.textMuted}
                      autoFocus
                      maxLength={60}
                      accessibilityLabel="Nombre de la tarjeta"
                      style={[theme.typography.body, { color: theme.colors.text }]}
                    />
                  </View>
                </Field>

                <Field label="Día de cierre">
                  <DayPicker value={closingDay} onChange={setClosingDay} nullable />
                  <DayNote day={closingDay} />
                </Field>

                <Field label="Día de vencimiento">
                  <DayPicker value={dueDay} onChange={setDueDay} nullable />
                  <DayNote day={dueDay} />
                </Field>

                {preview != null && (
                  <>
                    <Divider />
                    <Text variant="small" tone="secondary">
                      Una compra de hoy se pagaría en{' '}
                      <Text variant="smallMedium">{formatMonth(preview.month)}</Text>
                      {preview.approximate ? ' (fechas aproximadas)' : ''}.
                    </Text>
                  </>
                )}

                <Button
                  label="Guardar tarjeta"
                  fullWidth
                  disabled={!canAdd}
                  loading={addCard.isPending}
                  haptic="success"
                  onPress={() => void addCard.mutateAsync()}
                />
              </Stack>
            </Card>
          </Animated.View>
        )}
      </Stack>
    </StepShell>
  );
}
