import { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSpaces } from '@/features/spaces/useSpaces';
import { SpaceList } from '@/features/spaces/SpaceList';
import { useSession } from '@/features/auth/SessionProvider';
import {
  Button,
  Card,
  EmptyState,
  Pressable,
  Skeleton,
  Stack,
  Text,
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

  const [dismissed, setDismissed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // §14 · con un solo espacio, entra directo. Para el invitado es su app.
  useEffect(() => {
    if (spaces?.length === 1 && spaces[0] != null) {
      router.replace(`/space/${spaces[0].id}`);
    }
  }, [spaces, router]);

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
        <Text variant="overline" tone="muted">
          Tus espacios
        </Text>

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
            <Pressable onPress={explainSpaceCreation} haptic="none">
              <Text variant="small" tone="brand">
                Crear otro espacio
              </Text>
            </Pressable>
          </>
        )}

        {/* §33 U1 · "Tu plata personal" */}
        <Animated.View entering={FadeInDown.duration(duration.deliberate)}>
          {dismissed ? (
            <Pressable onPress={() => router.push('/onboarding/cuenta-personal')} haptic="none">
              <Text variant="small" tone="brand">
                Crear mi cuenta personal
              </Text>
            </Pressable>
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
                  <Pressable onPress={() => setDismissed(true)} haptic="none">
                    <Text variant="small" tone="muted" align="center">
                      Ahora no
                    </Text>
                  </Pressable>
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
