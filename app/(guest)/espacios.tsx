import { useState } from 'react';
import { Alert, RefreshControl, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { CircleUser } from 'lucide-react-native';
import { useSpaces } from '@/features/spaces/useSpaces';
import { SpaceList } from '@/features/spaces/SpaceList';
import { FormerSpacesDoor } from '@/features/spaces/FormerSpacesDoor';
import { PERSONAL_CARD_NOT_NOW, SpaceScreen } from '@/features/spaces/SpaceScreen';
import { soleSpaceId } from '@/features/spaces/spaceNavigation';
import { useRememberedFlag } from '@/features/shared/useRememberedFlag';
import { useSession } from '@/features/auth/SessionProvider';
import {
  Button,
  Card,
  EmptyState,
  IconButton,
  Row,
  Skeleton,
  Stack,
  Text,
  TextLink,
} from '@/ui/primitives';
import { duration } from '@/ui/motion';
import { useTheme } from '@/ui/theme';

/**
 * §33 U1 · la pantalla principal del invitado (Estado B).
 *
 * "Objetivo: que entienda en segundos que está en un espacio compartido y que
 *  sus finanzas personales son otra cosa."
 *
 * Dos reglas que no se negocian:
 *
 * 1. La tarjeta "Tu plata personal" **nunca insiste** (§33 U1). "Ahora no" la
 *    reduce a una línea y no vuelve a aparecer como tarjeta. El invitado no es
 *    un usuario a medias al que hay que convertir: §10 lo define como "una
 *    forma completa y válida de usar la app".
 *
 * 2. Si intenta crear un espacio, se le explica y se le ofrece activar la
 *    cuenta personal (Caso 19, CA-47, P5). Nunca un candado ni un "no podés".
 */
export default function Espacios() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useSession();
  const { data: spaces, isLoading, refetch } = useSpaces();

  // §33 U1 · "Ahora no" la reduce a una línea, también después de cerrar la app.
  const [dismissed, markDismissed] = useRememberedFlag(PERSONAL_CARD_NOT_NOW);
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  /** Caso 19 · CA-47 · P5 */
  function explainSpaceCreation() {
    Alert.alert(
      'Para crear un espacio necesitás tu cuenta personal',
      'Es privada y la podés completar cuando quieras.',
      [
        { text: 'Ahora no', style: 'cancel' },
        {
          text: 'Crear mi cuenta personal',
          onPress: () => router.push('/onboarding/cuenta-personal'),
        },
      ],
    );
  }

  // §14 · con un solo espacio, entra directo. Para el invitado es su app. Se
  // MUESTRA acá, inline: un `useEffect` + `replace` llegaba tarde y hacía loop
  // al volver (HANDOFF §10). Sin "Volver": en su lugar va el acceso al Perfil.
  const only = soleSpaceId(spaces);
  if (only != null) {
    return <SpaceScreen spaceId={only} leading={{ kind: 'profile' }} />;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + theme.space['3'],
        paddingBottom: insets.bottom + theme.space['9'],
        paddingHorizontal: theme.space['5'],
      }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void onRefresh()}
          tintColor={theme.colors.brand}
        />
      }
    >
      <Stack gap="7">
        <Row justify="space-between" align="center">
          <Text variant="overline" tone="muted">
            Tus espacios
          </Text>
          {/* §14 Estado B · el Perfil, sin barra de pestañas. */}
          {/* UX-12 · el ícono mide 22; el área de toque llega a 44. */}
          <IconButton
            label="Perfil"
            size={30}
            filled={false}
            onPress={() => router.push('/(guest)/perfil')}
            icon={<CircleUser size={22} color={theme.colors.textSecondary} />}
          />
        </Row>

        {isLoading ? (
          <Stack gap="3">
            <Skeleton height={86} />
          </Stack>
        ) : (spaces ?? []).length === 0 ? (
          <EmptyState
            title="No estás en ningún espacio."
            description="Cuando alguien te invite, lo vas a ver acá con las cuentas ya hechas."
          />
        ) : (
          <>
            <SpaceList spaces={spaces ?? []} />
            <TextLink label="Crear otro espacio" onPress={explainSpaceCreation} />
          </>
        )}

        {/* P26 · los espacios que dejó: una puerta, no una tarjeta por espacio. */}
        <FormerSpacesDoor />

        {/* §33 U1 · "Tu plata personal" */}
        <Animated.View entering={FadeInDown.duration(duration.deliberate)}>
          {dismissed == null ? null : dismissed ? (
            <TextLink
              label="Crear mi cuenta personal"
              onPress={() => router.push('/onboarding/cuenta-personal')}
            />
          ) : (
            <Card tone="sunken">
              <Stack gap="4">
                <Stack gap="2">
                  <Text variant="bodyMedium">Tu plata personal</Text>
                  <Text variant="small" tone="secondary">
                    Lo que compartís con alguien es una cosa. Tus ingresos y tus gastos
                    propios son otra: si querés, podés ordenarlos acá, en privado.
                  </Text>
                </Stack>

                <Stack gap="2">
                  <Button
                    label="Crear mi cuenta personal"
                    fullWidth
                    onPress={() => router.push('/onboarding/cuenta-personal')}
                  />
                  <Button
                    label="Ahora no"
                    variant="ghost"
                    fullWidth
                    haptic="none"
                    onPress={markDismissed}
                  />
                </Stack>
              </Stack>
            </Card>
          )}
        </Animated.View>

        <Text variant="caption" tone="muted">
          Hola, {profile?.displayName ?? 'vos'}.
        </Text>
      </Stack>
    </ScrollView>
  );
}
