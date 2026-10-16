import { useState, type ReactNode } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { goBack } from '@/features/shared/navigation';
import { AudienceBadge, IconButton, Row, Stack, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import { useBottomPadding } from '@/ui/useBottomPadding';

/**
 * El marco de las pantallas de detalle de Futuro (N3): volver, "Solo vos" (una
 * vez por pantalla), un título y el contenido sobre fondo plano. Una lista
 * larga scrollea acá, que es lo que corresponde.
 *
 * Viven DENTRO de la pestaña Futuro, así la barra queda visible, igual que
 * Compartidos.
 */
export function FutureDetailShell({
  title,
  onRefresh,
  children,
}: {
  title: string;
  onRefresh: () => Promise<unknown> | void;
  children: ReactNode;
}) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPad = useBottomPadding({ tabs: true, fab: true });
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    await onRefresh();
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
          onRefresh={() => void refresh()}
          tintColor={theme.colors.brand}
        />
      }
    >
      <Stack gap="6">
        <Row justify="space-between" align="center">
          <IconButton
            label="Volver"
            size={28}
            filled={false}
            onPress={() => goBack(router)}
            style={{ marginLeft: -theme.space['1'] }}
            icon={<ArrowLeft size={20} color={theme.colors.textSecondary} />}
          />
          <AudienceBadge audience={{ kind: 'private' }} />
        </Row>

        <Text variant="title">{title}</Text>

        {children}
      </Stack>
    </ScrollView>
  );
}
