import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { goBack } from '@/features/shared/navigation';
import { usePersonalFacts } from '@/features/shared/usePersonalFacts';
import { CardsList } from '@/features/profile/CardsList';
import { selectCards } from '@/features/profile/cards';
import { AudienceBadge, IconButton, Row, Screen, Stack, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';

/**
 * UX-21 · "Tus tarjetas" (Perfil > Tarjetas).
 *
 * Lista las tarjetas y agrega otra sin el wizard de O3: antes Perfil > Tarjetas
 * abría el paso 2 y "Continuar" arrastraba por Deuda, Pagados y Fijos.
 *
 * Solo lista y alta. Editar las fechas o eliminar una tarjeta tiene reglas en
 * §22 (recalcular todo lo de esa tarjeta con aviso; no eliminar con cuotas o
 * fijos activos) que la app todavía no implementa, así que no se ofrece.
 */
export default function Tarjetas() {
  const theme = useTheme();
  const router = useRouter();
  const { facts } = usePersonalFacts();

  const cards = useMemo(() => selectCards(facts.paymentMethods), [facts.paymentMethods]);

  return (
    <Screen>
      <Stack gap="7">
        <Row justify="space-between" align="center">
          <Text variant="heading">Tus tarjetas</Text>
          <IconButton
            label="Cerrar"
            onPress={() => goBack(router)}
            icon={<X size={18} color={theme.colors.textSecondary} />}
          />
        </Row>

        <AudienceBadge audience={{ kind: 'private' }} />

        <CardsList
          cards={cards}
          // Una tarjeta nueva, aparte: no sigue al wizard del onboarding.
          onAdd={() => router.push('/onboarding/tarjetas?desde=perfil')}
        />
      </Stack>
    </Screen>
  );
}
