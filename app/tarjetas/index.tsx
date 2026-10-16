import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { goBack } from '@/features/shared/navigation';
import { usePersonalFacts } from '@/features/shared/usePersonalFacts';
import { calculateUpcomingPayments } from '@domain/upcoming';
import { formatPesos } from '@/lib/format';
import { CardsList } from '@/features/profile/CardsList';
import { cardDoorLine, cardStatements } from '@/features/profile/cardOverview';
import { selectCards } from '@/features/profile/cards';
import { AudienceBadge, IconButton, Row, Screen, Stack, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';

/**
 * UX-21 · "Tus tarjetas" (Perfil > Tarjetas).
 *
 * Lista las tarjetas y agrega otra sin el wizard de O3: antes Perfil > Tarjetas
 * abría el paso 2 y "Continuar" arrastraba por Deuda, Pagados y Fijos.
 *
 * P24 · cada tarjeta es una puerta con su próximo resumen estimado; el detalle
 * (`/tarjetas/[id]`) corrige el nombre y elimina con las reglas de §22.
 */
export default function Tarjetas() {
  const theme = useTheme();
  const router = useRouter();
  const { facts, expansion, today } = usePersonalFacts();

  // P24 · una puerta por tarjeta con su próximo resumen estimado.
  const rows = useMemo(() => {
    const payments = calculateUpcomingPayments(expansion, today, facts.paymentMethods);
    return selectCards(facts.paymentMethods).map((card) => ({
      card,
      line: cardDoorLine(cardStatements(payments, card.id, today)[0] ?? null, formatPesos),
    }));
  }, [expansion, today, facts.paymentMethods]);

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
          rows={rows}
          onOpen={(cardId) => router.push(`/tarjetas/${cardId}`)}
          // Una tarjeta nueva, aparte: no sigue al wizard del onboarding.
          onAdd={() => router.push('/onboarding/tarjetas?desde=perfil')}
        />
      </Stack>
    </Screen>
  );
}
