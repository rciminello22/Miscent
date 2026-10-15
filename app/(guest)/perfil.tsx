import { useRouter } from 'expo-router';
import { goBack } from '@/features/shared/navigation';
import { ArrowLeft } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  AccountActions,
  DisplayNameCard,
  PrivacySection,
} from '@/features/profile/ProfileSections';
import { SaveAccessCard } from '@/features/profile/SaveAccessCard';
import { useSession } from '@/features/auth/SessionProvider';
import { Button, Card, IconButton, Screen, Stack, Text } from '@/ui/primitives';
import { duration } from '@/ui/motion';
import { useTheme } from '@/ui/theme';

/**
 * §14 · Perfil (Estado B): "Nombre visible, Crear mi cuenta personal,
 * Privacidad y datos, cerrar sesión, eliminar usuario".
 *
 * Sin esta pantalla, un invitado con un solo espacio quedaba adentro de ese
 * espacio sin forma de cerrar sesión ni de eliminar su usuario (§28).
 *
 * K0 / §33 U1 · la invitación a crear la cuenta personal es una opción más,
 * nunca un "desbloqueá" ni un candado.
 */
export default function PerfilInvitado() {
  const theme = useTheme();
  const router = useRouter();
  const { isAnonymous } = useSession();

  return (
    <Screen>
      <Stack gap="7">
        <IconButton
          label="Volver"
          size={28}
          filled={false}
          onPress={() => goBack(router)}
          style={{ marginLeft: -theme.space['1'], alignSelf: 'flex-start' }}
          icon={<ArrowLeft size={20} color={theme.colors.textSecondary} />}
        />

        <Text variant="overline" tone="muted">
          Perfil
        </Text>

        {/* Entró sin email (10/10): es lo primero que le conviene hacer. */}
        {isAnonymous && <SaveAccessCard />}

        <Animated.View entering={FadeInDown.duration(duration.deliberate)}>
          <DisplayNameCard />
        </Animated.View>

        {/* §8 · la cuenta personal es opcional y privada. */}
        <Card tone="sunken">
          <Stack gap="4">
            <Stack gap="2">
              <Text variant="bodyMedium">Tu plata personal</Text>
              <Text variant="small" tone="secondary">
                Tus ingresos y tus gastos propios, ordenados en privado. Lo que compartís
                queda igual y la otra persona no ve nada nuevo.
              </Text>
            </Stack>
            {/* Sin email, el flujo pide primero guardar el acceso, y sigue
                solo (onboarding/guardar-acceso). */}
            <Button
              label="Crear mi cuenta personal"
              variant="secondary"
              fullWidth
              onPress={() => router.push('/onboarding/cuenta-personal')}
            />
          </Stack>
        </Card>

        <PrivacySection />

        <AccountActions kind="guest" />
      </Stack>
    </Screen>
  );
}
