import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button, Pressable, Row, Screen, Stack, Text } from '@/ui/primitives';
import { duration } from '@/ui/motion';
import { useTheme } from '@/ui/theme';

/**
 * El marco común de los pasos de O3.
 *
 * Dos cosas que vienen directo de §13 y que no son detalles:
 *
 * 1. **Todo paso se puede saltear.** "Cada paso se puede saltear y completar
 *    después." El botón de saltear está siempre visible y al mismo nivel que
 *    el de continuar, no escondido.
 * 2. **§4.12 · "Sirve aunque no cargues todo."** Con un ingreso, un fijo o una
 *    cuota ya hay un radar útil. El onboarding no es un formulario con campos
 *    obligatorios: es una ayuda para arrancar.
 */
export function StepShell({
  step,
  total,
  title,
  description,
  help,
  children,
  onContinue,
  continueLabel = 'Continuar',
  continueDisabled = false,
  saving = false,
  onSkip,
}: {
  step: number;
  total: number;
  title: string;
  description?: string;
  /** La ayuda textual que §13 define para cada paso. */
  help?: string;
  children: ReactNode;
  onContinue: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  saving?: boolean;
  onSkip?: () => void;
}) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Screen>
      <Stack gap="7">
        <Row gap="2" align="center">
          {Array.from({ length: total }, (_, index) => (
            <View
              key={index}
              style={{
                height: 3,
                flex: 1,
                borderRadius: 2,
                backgroundColor:
                  index < step ? theme.colors.brand : theme.colors.surfaceSunken,
              }}
            />
          ))}
        </Row>

        <Animated.View entering={FadeInDown.duration(duration.deliberate)}>
          <Stack gap="3">
            <Text variant="title">{title}</Text>
            {description != null && (
              <Text variant="body" tone="secondary">
                {description}
              </Text>
            )}
          </Stack>
        </Animated.View>

        {children}

        {help != null && (
          <Text variant="caption" tone="muted">
            {help}
          </Text>
        )}

        <Stack gap="3">
          <Button
            label={continueLabel}
            size="lg"
            fullWidth
            disabled={continueDisabled}
            loading={saving}
            onPress={onContinue}
          />

          {onSkip != null && (
            <Pressable onPress={onSkip} haptic="none">
              <Text variant="small" tone="muted" align="center">
                Saltear este paso
              </Text>
            </Pressable>
          )}
        </Stack>
      </Stack>
    </Screen>
  );
}
