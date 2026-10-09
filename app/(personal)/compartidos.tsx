import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSpaces } from '@/features/spaces/useSpaces';
import { SpaceList } from '@/features/spaces/SpaceList';
import {
  Button,
  EmptyState,
  ErrorState,
  Row,
  Skeleton,
  Stack,
  Text,
} from '@/ui/primitives';
import { useTheme } from '@/ui/theme';

/**
 * §14 · Compartidos.
 *
 * "Lista de espacios → cada espacio; con uno solo, entra directo."
 *
 * Esa última parte importa: K1 dice que los espacios tienen "poco
 * protagonismo en la UX". Si alguien tiene un solo espacio —el caso de
 * referencia de §2, una pareja— no tiene sentido obligarlo a pasar por una
 * lista de un elemento cada vez.
 */
export default function Compartidos() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: spaces, isLoading, isError, refetch } = useSpaces();
  const [refreshing, setRefreshing] = useState(false);

  // §14 · con un solo espacio, entra directo.
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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + theme.space['3'],
        paddingBottom: insets.bottom + 140,
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
      <Stack gap="6">
        <Row justify="space-between" align="center">
          <Text variant="overline" tone="muted">
            Compartidos
          </Text>
        </Row>

        {isLoading ? (
          <Stack gap="3">
            <Skeleton height={86} />
            <Skeleton height={86} />
          </Stack>
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : (spaces ?? []).length === 0 ? (
          <EmptyState
            title="¿Compartís gastos con alguien?"
            description="Anótenlos acá y la app hace las cuentas."
            actionLabel="Crear espacio"
            onAction={() => router.push('/space/nuevo')}
          />
        ) : (
          <>
            <SpaceList spaces={spaces ?? []} />

            <Button
              label="Crear otro espacio"
              variant="secondary"
              fullWidth
              icon={<Plus size={16} color={theme.colors.text} />}
              onPress={() => router.push('/space/nuevo')}
            />

            {/* Caso 17 · los saldos no se compensan entre espacios. */}
            <Text variant="caption" tone="muted">
              Cada espacio lleva sus propias cuentas. No se mezclan entre sí.
            </Text>
          </>
        )}
      </Stack>
    </ScrollView>
  );
}
