import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button, Pressable, Row, Screen, Stack, Text } from '@/ui/primitives';
import { duration, stagger } from '@/ui/motion';
import { useTheme } from '@/ui/theme';

/**
 * O1 pasos 1 y 2 (§13).
 *
 * Paso 1 · "Anotá tus gastos, cuotas y fijos. La app hace las cuentas y te
 *           muestra qué se viene."
 * Paso 2 · "¿Qué querés hacer primero?"
 *
 * La elección del paso 2 "define los pasos, no las partes de la app": no
 * recorta nada, solo ordena el onboarding.
 */

type Intent = 'personal' | 'shared' | 'both';

const OPTIONS: { value: Intent; label: string; hint: string }[] = [
  { value: 'personal', label: 'Ordenar mi plata', hint: 'Tus ingresos, gastos, cuotas y fijos' },
  { value: 'shared', label: 'Compartir gastos con alguien', hint: 'Un espacio para los dos' },
  { value: 'both', label: 'Las dos cosas', hint: 'Lo tuyo y lo que comparten' },
];

export default function Bienvenida() {
  const theme = useTheme();
  const router = useRouter();
  const [intent, setIntent] = useState<Intent | null>(null);

  return (
    <Screen>
      <Stack gap="8">
        <Animated.View entering={FadeInDown.duration(duration.deliberate)}>
          <Stack gap="3">
            <Text variant="display">
              Anotá tus gastos, cuotas y fijos.
            </Text>
            <Text variant="body" tone="secondary">
              La app hace las cuentas y te muestra qué se viene.
            </Text>
          </Stack>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(stagger(1, 90)).duration(duration.deliberate)}>
          <Stack gap="4">
            <Text variant="heading">¿Qué querés hacer primero?</Text>

            <Stack gap="3">
              {OPTIONS.map((option, index) => {
                const selected = intent === option.value;
                return (
                  <Animated.View
                    key={option.value}
                    entering={FadeInDown.delay(stagger(index + 2, 70)).duration(duration.base)}
                  >
                    <Pressable
                      onPress={() => setIntent(option.value)}
                      scaleOnPress={false}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      style={{
                        borderRadius: theme.radius.lg,
                        padding: theme.space['4'],
                        backgroundColor: selected ? theme.colors.brandSoft : theme.colors.surface,
                        borderWidth: 1,
                        borderColor: selected ? theme.colors.brand : theme.colors.border,
                      }}
                    >
                      <Row gap="3" align="flex-start">
                        <Selector selected={selected} />
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text variant="bodyMedium">{option.label}</Text>
                          <Text variant="small" tone="secondary">
                            {option.hint}
                          </Text>
                        </View>
                      </Row>
                    </Pressable>
                  </Animated.View>
                );
              })}
            </Stack>
          </Stack>
        </Animated.View>

        <Stack gap="4">
          <Button
            label="Empezar"
            size="lg"
            fullWidth
            disabled={intent == null}
            onPress={() => router.push({ pathname: '/(auth)/privacidad', params: { intent: intent ?? 'both' } })}
          />

          {/* Quien vuelve entra directo: no elige nada ni se le crea nada. */}
          <Pressable
            onPress={() => router.push({ pathname: '/(auth)/email', params: { mode: 'login' } })}
            haptic="none"
          >
            <Text variant="small" tone="brand" align="center">
              Ya tengo cuenta
            </Text>
          </Pressable>

          {/* O1 paso 1 · "Tengo una invitación" lleva a O2, que necesita la invitación. */}
          <Pressable onPress={() => router.push('/(auth)/invitacion')} haptic="none">
            <Text variant="small" tone="brand" align="center">
              Tengo una invitación
            </Text>
          </Pressable>
        </Stack>
      </Stack>
    </Screen>
  );
}

function Selector({ selected }: { selected: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={{
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: selected ? theme.colors.brand : theme.colors.borderStrong,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
      }}
    >
      {selected && (
        <View
          style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.brand }}
        />
      )}
    </View>
  );
}
