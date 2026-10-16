import type { ReactNode } from 'react';
import { View } from 'react-native';
import { ClipboardCheck, Plus } from 'lucide-react-native';
import { Card, Pressable, Row, RowChevron, Skeleton, Stack, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';

/**
 * La tarjeta de un espacio en la lista de Compartidos: una puerta N2 (blanca,
 * con borde y chevron). Presentacional: recibe todo por props; el container
 * (`SpaceList`) trae el saldo y los pendientes.
 */
export function SpaceCard({
  name,
  scale,
  sentence,
  settled,
  pill,
  note,
  loading = false,
  onPress,
}: {
  name: string;
  /** La balanza mini con las dos personas (`SpaceBalanceScale`); null mientras carga. */
  scale: ReactNode;
  /** La frase del saldo (`balanceSentence`); null mientras carga. */
  sentence: string | null;
  settled: boolean;
  /** "2 por revisar", si hay algo pendiente. */
  pill: string | null;
  /** "Martina todavía no entró" / "Martina · ex miembro". */
  note: string | null;
  loading?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      scaleOnPress={false}
      accessibilityRole="button"
      accessibilityLabel={[name, sentence, pill, note].filter((part) => part != null).join('. ')}
    >
      <Card>
        <Stack gap="3">
          <Row justify="space-between" align="center" gap="3">
            <Text variant="heading" numberOfLines={1} style={{ flex: 1 }}>
              {name}
            </Text>
            {pill != null && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.space['1'],
                  paddingHorizontal: theme.space['2'],
                  paddingVertical: 3,
                  borderRadius: theme.radius.pill,
                  backgroundColor: theme.colors.sharedSoft,
                }}
              >
                <ClipboardCheck size={13} color={theme.colors.shared} />
                <Text variant="caption" tone="shared">
                  {pill}
                </Text>
              </View>
            )}
          </Row>

          {/* La balanza dice el saldo con una forma; abajo, la frase que dice lo mismo. */}
          {scale ?? <Skeleton height={64} />}

          <Row justify="space-between" align="center" gap="3">
            <View style={{ flex: 1, gap: 2 }}>
              {loading || sentence == null ? (
                <Skeleton width={140} height={16} />
              ) : (
                <Text variant="bodyMedium" tone={settled ? 'muted' : 'shared'}>
                  {sentence}
                </Text>
              )}
              {note != null && (
                <Text variant="caption" tone="muted">
                  {note}
                </Text>
              )}
            </View>
            <RowChevron />
          </Row>
        </Stack>
      </Card>
    </Pressable>
  );
}

/**
 * "Crear otro espacio": una tarjeta con borde punteado al final de la lista.
 * Baja jerarquía a propósito (K1): no es un botón lleno que compita con los espacios.
 */
export function CreateSpaceCard({ onPress }: { onPress: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      scaleOnPress={false}
      accessibilityRole="button"
      accessibilityLabel="Crear otro espacio"
      style={{
        minHeight: 56,
        borderRadius: theme.radius.lg,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: theme.colors.borderStrong,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.space['2'],
      }}
    >
      <Plus size={16} color={theme.colors.textSecondary} />
      <Text variant="bodyMedium" tone="secondary">
        Crear otro espacio
      </Text>
    </Pressable>
  );
}
