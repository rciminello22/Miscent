import { useState, type ReactNode } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AudienceBadge, ErrorState, IconButton, Row, Skeleton, Stack, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import { useBottomPadding } from '@/ui/useBottomPadding';

/**
 * El marco de las pantallas de detalle del espacio (N3): volver, quién lo ve
 * (PR-03, una sola vez por pantalla), un título y el contenido, sobre fondo
 * plano y sin tarjetas. Una lista larga scrollea acá, que es lo que
 * corresponde.
 *
 * Las muestran dos árboles: dentro de la pestaña Compartidos (Estado A, con la
 * barra visible) y bajo /space/[id] (Estado B, sin pestañas).
 */
export function SpaceDetailShell({
  title,
  otherName,
  inTabs,
  loading,
  error,
  onBack,
  onRetry,
  children,
}: {
  title?: string;
  /** Con quién se comparte; mientras no se sabe, no hay badge. */
  otherName: string | null;
  inTabs: boolean;
  loading: boolean;
  error: boolean;
  onBack: () => void;
  onRetry: () => Promise<unknown> | void;
  children: ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = useBottomPadding({ tabs: inTabs, fab: false });
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    // SY-01 · deslizar para ver los cambios del otro miembro.
    await onRetry();
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
            onPress={onBack}
            style={{ marginLeft: -theme.space['1'] }}
            icon={<ArrowLeft size={20} color={theme.colors.textSecondary} />}
          />
          {otherName != null && (
            <AudienceBadge audience={{ kind: 'shared', otherMemberName: otherName }} />
          )}
        </Row>

        {title != null && <Text variant="title">{title}</Text>}

        {loading ? (
          <View style={{ gap: theme.space['4'] }}>
            <Skeleton width={160} height={28} />
            <Skeleton height={80} />
            <Skeleton height={80} />
          </View>
        ) : error ? (
          <ErrorState onRetry={() => void onRetry()} />
        ) : (
          children
        )}
      </Stack>
    </ScrollView>
  );
}
