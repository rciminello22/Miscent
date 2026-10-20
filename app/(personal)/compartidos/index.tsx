import { useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSpaces } from '@/features/spaces/useSpaces';
import { CreateSpaceCard } from '@/features/spaces/SpaceCard';
import { SpaceList } from '@/features/spaces/SpaceList';
import { FormerSpacesDoor } from '@/features/spaces/FormerSpacesDoor';
import { EmptyState, ErrorState, Row, Skeleton, Stack, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import { useBottomPadding } from '@/ui/useBottomPadding';

/**
 * §14 · Compartidos.
 *
 * "Lista de espacios → cada espacio." P23 (15/10): la pestaña abre SIEMPRE en
 * la lista, aunque haya un solo espacio. Antes, con uno solo, entraba directo
 * al espacio: la pestaña no mostraba quién era el otro ni cómo estaban las
 * cuentas sin entrar, y "Volver" no tenía a dónde ir. Con la lista, cada espacio
 * es una fila (la puerta de "Tus espacios") con la balanza, las dos personas, el
 * saldo y lo que está pendiente; del abierto más recientemente al menos reciente.
 *
 * K1 sigue valiendo ("poco protagonismo en la UX"): con uno solo la pantalla
 * queda sobria a propósito, una fila y "Crear otro espacio" con borde punteado.
 */
export default function Compartidos() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPad = useBottomPadding({ tabs: true, fab: true });
  const { data: spaces, isLoading, isError, refetch } = useSpaces();
  const [refreshing, setRefreshing] = useState(false);

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
        paddingBottom: bottomPad,
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
            <Skeleton height={72} />
            <Skeleton height={72} />
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
          <Stack gap="3">
            {/* Caso 17 · cada tarjeta lleva sus propias cuentas y no hay total
                entre espacios: la forma lo dice, sin un cartel que lo explique. */}
            <SpaceList spaces={spaces ?? []} />
            <CreateSpaceCard onPress={() => router.push('/space/nuevo')} />
          </Stack>
        )}

        {/* P26 · los espacios que dejó: una puerta, no una tarjeta por espacio. */}
        <FormerSpacesDoor />
      </Stack>
    </ScrollView>
  );
}
