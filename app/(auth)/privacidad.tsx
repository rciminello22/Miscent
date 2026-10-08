import { Lock } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { View } from 'react-native';
import { Button, Card, Row, Screen, Stack, Text } from '@/ui/primitives';
import { duration, stagger } from '@/ui/motion';
import { useTheme } from '@/ui/theme';

/**
 * O1 paso 3 · "Tus números son tuyos" (§34).
 *
 * Los cuatro puntos son LITERALES de la spec, y eso es a propósito: §34 dice
 * que "solo se dice lo que se puede cumplir y verificar". Cada línea de acá
 * corresponde a una promesa de la tabla de §34 marcada como garantizable, y
 * las tres que todavía están pendientes (P9, P10, P11) NO aparecen.
 *
 * Esta pantalla va antes de pedir el email porque reduce la desconfianza
 * inicial: la app aclara que no se conecta a ningún banco ANTES de pedir
 * cualquier dato.
 */

const PROMESAS = [
  'La app no se conecta a tus cuentas ni sabe cuánta plata tenés: trabaja con lo que vos registrás.',
  'Tus finanzas personales las ves solo vos. En un espacio compartido, la otra persona ve solo lo que se carga ahí.',
  'No te pedimos claves del banco ni números de tarjeta.',
  'Podés borrar todo cuando quieras.',
];

export default function Privacidad() {
  const theme = useTheme();
  const router = useRouter();
  const { intent } = useLocalSearchParams<{ intent?: string }>();

  return (
    <Screen>
      <Stack gap="8">
        <Animated.View entering={FadeInDown.duration(duration.deliberate)}>
          <Stack gap="4">
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.brandSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Lock size={20} color={theme.colors.brand} />
            </View>
            <Text variant="title">Tus números son tuyos</Text>
          </Stack>
        </Animated.View>

        <Stack gap="4">
          {PROMESAS.map((promesa, index) => (
            <Animated.View
              key={promesa}
              entering={FadeInDown.delay(stagger(index + 1, 80)).duration(duration.base)}
            >
              <Card tone="sunken">
                <Row gap="3" align="flex-start">
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: theme.colors.brand,
                      marginTop: 8,
                    }}
                  />
                  <Text variant="small" style={{ flex: 1 }}>
                    {promesa}
                  </Text>
                </Row>
              </Card>
            </Animated.View>
          ))}
        </Stack>

        <Button
          label="Entendido"
          size="lg"
          fullWidth
          onPress={() => router.push({ pathname: '/(auth)/email', params: { intent: intent ?? 'both' } })}
        />
      </Stack>
    </Screen>
  );
}
