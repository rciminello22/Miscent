import { useState } from 'react';
import { Alert, Share, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { goBack } from '@/features/shared/navigation';
import { Copy, RefreshCw, Share2, X } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useMutation, useQuery } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { formatLongDate } from '@/lib/format';
import { queryKeys } from '@/data/queryClient';
import {
  createInvitation,
  fetchInvitationState,
  invitationLink,
  revokeInvitation,
} from '@/data/repositories/invitations';
import { useSpace } from '@/features/spaces/useSpaces';
import {
  Button,
  Card,
  Divider,
  Pressable,
  Row,
  Screen,
  Stack,
  Text,
} from '@/ui/primitives';
import { duration } from '@/ui/motion';
import { useTheme } from '@/ui/theme';

/**
 * §26 · §33 U4 · invitar al otro miembro.
 *
 * "Forma: enlace que el usuario manda por donde quiera; **la app no manda
 *  mensajes**." Eso es parte de la promesa de privacidad de §34: "nadie recibe
 * nada tuyo sin que vos lo compartas". La app no pide contactos, no manda
 * mails y no sabe a quién le pasás el enlace.
 *
 * K6 · un solo uso, 7 días, regenerable; la nueva anula la anterior, y eso se
 * avisa ANTES de generarla.
 */
export default function Invitar() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const spaceId = id ?? '';

  const { derived } = useSpace(spaceId);
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const state = useQuery({
    queryKey: queryKeys.invitation(spaceId),
    queryFn: () => fetchInvitationState(spaceId),
    enabled: spaceId !== '',
  });

  const generate = useMutation({
    mutationFn: () => createInvitation(spaceId),
    onSuccess: async (next) => {
      setToken(next);
      setCopied(false);
      await state.refetch();
    },
    onError: (error: Error) => Alert.alert('No pudimos generarla', error.message),
  });

  const revoke = useMutation({
    mutationFn: () => revokeInvitation(spaceId),
    onSuccess: async () => {
      setToken(null);
      await state.refetch();
    },
  });

  const link = token != null ? invitationLink(token) : null;
  const hasActive = state.data?.status === 'active';

  function confirmRegenerate() {
    if (!hasActive) {
      void generate.mutateAsync();
      return;
    }
    // K6 · se avisa antes: la anterior deja de funcionar.
    Alert.alert(
      '¿Generar una invitación nueva?',
      'La invitación anterior va a dejar de funcionar.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Generar nueva', onPress: () => void generate.mutateAsync() },
      ],
    );
  }

  if (derived == null) {
    return (
      <Screen>
        <Text variant="body" tone="secondary">
          Cargando…
        </Text>
      </Screen>
    );
  }

  const { other, facts } = derived;

  return (
    <Screen>
      <Stack gap="7">
        <Row justify="space-between" align="center">
          <Text variant="heading">Invitar a {other.displayName}</Text>
          <Pressable
            onPress={() => goBack(router)}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
            style={{
              width: 36,
              height: 36,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.surfaceSunken,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} color={theme.colors.textSecondary} />
          </Pressable>
        </Row>

        {/* §33 U4 · qué va a ver y qué no. Antes de invitar, no después. */}
        <Card tone="sunken">
          <Stack gap="3">
            <Text variant="small">
              {other.displayName} va a ver y poder cargar los gastos de{' '}
              {facts.space.name}, con todo el historial.
            </Text>
            <Text variant="small" tone="secondary">
              No va a ver nada de tu plata personal: ni tus ingresos, ni tus gastos
              propios, ni tus tarjetas, ni tus otros espacios.
            </Text>
          </Stack>
        </Card>

        {link == null ? (
          <Stack gap="4">
            {hasActive && state.data != null && (
              <Card>
                <Stack gap="2">
                  <Text variant="smallMedium">Ya hay una invitación activa</Text>
                  <Text variant="caption" tone="muted">
                    Vence el {formatLongDate(state.data.expiresAt.slice(0, 10))}. Si la
                    perdiste, generá una nueva: la anterior deja de funcionar.
                  </Text>
                </Stack>
              </Card>
            )}

            <Button
              label={hasActive ? 'Generar una nueva' : 'Generar el enlace'}
              variant="shared"
              size="lg"
              fullWidth
              loading={generate.isPending}
              onPress={confirmRegenerate}
            />
          </Stack>
        ) : (
          <Animated.View entering={FadeInDown.duration(duration.base)}>
            <Stack gap="5">
              <Card>
                <Stack gap="4">
                  <Text variant="caption" tone="muted">
                    Este enlace sirve una sola vez y vence en 7 días.
                  </Text>

                  <View
                    style={{
                      padding: theme.space['3'],
                      borderRadius: theme.radius.sm,
                      backgroundColor: theme.colors.surfaceSunken,
                    }}
                  >
                    <Text variant="caption" numberOfLines={2}>
                      {link}
                    </Text>
                  </View>

                  <Divider />

                  <Row gap="2">
                    <Button
                      label={copied ? 'Copiado' : 'Copiar'}
                      variant="secondary"
                      icon={<Copy size={15} color={theme.colors.text} />}
                      onPress={() => {
                        void Clipboard.setStringAsync(link);
                        setCopied(true);
                      }}
                    />
                    <Button
                      label="Compartir"
                      variant="shared"
                      icon={<Share2 size={15} color={theme.colors.textOnBrand} />}
                      onPress={() =>
                        void Share.share({
                          // WhatsApp y compañía no vuelven tocable un enlace que no
                          // sea http(s): el mensaje dice cómo usarlo igual.
                          message: `Te invito a ${facts.space.name}, para anotar los gastos que compartimos: ${link}\n\nSi no se abre al tocarlo, copialo, abrí la app y tocá "Tengo una invitación".`,
                        })
                      }
                    />
                  </Row>
                </Stack>
              </Card>

              <Pressable onPress={confirmRegenerate} haptic="none">
                <Row gap="2" justify="center" align="center">
                  <RefreshCw size={13} color={theme.colors.brand} />
                  <Text variant="small" tone="brand">
                    Generar otro enlace
                  </Text>
                </Row>
              </Pressable>
            </Stack>
          </Animated.View>
        )}

        {hasActive && (
          <Pressable onPress={() => void revoke.mutateAsync()} haptic="none">
            <Text variant="small" tone="muted" align="center">
              Cancelar la invitación
            </Text>
          </Pressable>
        )}

        {/* §34 · la app no contacta a nadie. */}
        <Text variant="caption" tone="muted" align="center">
          La app no manda mensajes ni pide tus contactos. El enlace lo compartís vos.
        </Text>
      </Stack>
    </Screen>
  );
}
