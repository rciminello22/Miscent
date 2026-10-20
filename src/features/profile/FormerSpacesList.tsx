import { View } from 'react-native';
import { Users } from 'lucide-react-native';
import { Button, Card, Divider, Row, SectionHeader, Stack, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import type { FormerSpaceRow } from './formerSpaces';

/**
 * Perfil · "Espacios que dejaste": una fila por espacio del que saliste, con su
 * "Quitar" (saca el espacio entero de tu historial). La sección solo existe si
 * dejaste algún espacio.
 *
 * "Quitar" está siempre disponible (P26): lo que desaparece, Futuro incluido,
 * lo dice la hoja de confirmación. Presentacional: la hoja y la llamada las pone
 * el container.
 */
export function FormerSpacesList({
  rows,
  onRemove,
}: {
  rows: readonly FormerSpaceRow[];
  onRemove: (spaceId: string) => void;
}) {
  const theme = useTheme();

  if (rows.length === 0) return null;

  return (
    <Stack gap="4">
      <SectionHeader title="Espacios que dejaste" />
      <Card style={{ paddingVertical: theme.space['2'] }}>
        <Stack gap="0">
          {rows.map((row, index) => (
            <View key={row.spaceId}>
              {index > 0 && <Divider />}
              <Stack gap="3" style={{ paddingVertical: theme.space['3'] }}>
                <Row gap="3" align="center">
                  <Users size={18} color={theme.colors.textSecondary} />
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text variant="bodyMedium" numberOfLines={1}>
                      {row.name}
                    </Text>
                    <Text variant="caption" tone="muted">
                      {row.leftLine}
                    </Text>
                  </View>
                  <Button
                    label="Quitar"
                    accessibilityLabel={`Quitar ${row.name} de tu historial`}
                    variant="secondary"
                    size="sm"
                    haptic="none"
                    onPress={() => onRemove(row.spaceId)}
                  />
                </Row>
              </Stack>
            </View>
          ))}
        </Stack>
      </Card>
    </Stack>
  );
}
