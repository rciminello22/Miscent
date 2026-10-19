import { View } from 'react-native';
import { CalendarRange, Info, Receipt, Users, type LucideIcon } from 'lucide-react-native';
import { Button, Card, Row, Sheet, Stack, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import type { RemovalSheet } from './formerSpaces';

const ICONS: Record<RemovalSheet['rows'][number]['kind'], LucideIcon> = {
  radar: CalendarRange,
  movements: Receipt,
  summary: Info,
};

/**
 * Quitar un espacio de tu historial · la confirmación. Dice qué cambia en tu
 * cuenta (tres filas con ícono), que para el otro no cambia nada y, en negrita
 * y antes de los botones, que no se puede deshacer. "Quitar" es `destructive`
 * y "Cancelar" es `ghost`. Sin "Deshacer": la foto no se puede rearmar.
 * Presentacional: `copy` en `null` es la hoja cerrada.
 */
export function RemoveFormerSpaceSheet({
  copy,
  loading = false,
  onConfirm,
  onClose,
}: {
  copy: RemovalSheet | null;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const theme = useTheme();

  return (
    <Sheet visible={copy != null} onClose={onClose} title={copy?.title ?? ''}>
      {copy != null && (
        <Stack gap="5">
          <Text variant="small" tone="secondary">
            {copy.intro}
          </Text>

          <Stack gap="4">
            {copy.rows.map((row) => {
              const Icon = ICONS[row.kind];
              return (
                <Row key={row.kind} gap="3" align="flex-start">
                  <View style={{ marginTop: 2 }}>
                    <Icon size={18} color={theme.colors.textSecondary} />
                  </View>
                  <Text variant="small" style={{ flex: 1 }}>
                    {row.text}
                  </Text>
                </Row>
              );
            })}
          </Stack>

          <Card tone="sunken" style={{ padding: theme.space['4'] }}>
            <Row gap="3" align="flex-start">
              <View style={{ marginTop: 2 }}>
                <Users size={18} color={theme.colors.textSecondary} />
              </View>
              <Text variant="small" style={{ flex: 1 }}>
                {copy.reassurance}
              </Text>
            </Row>
          </Card>

          <Text variant="smallMedium">{copy.warning}</Text>

          <Stack gap="2">
            <Button
              label="Quitar"
              variant="destructive"
              fullWidth
              haptic="none"
              loading={loading}
              onPress={onConfirm}
            />
            <Button
              label="Cancelar"
              variant="ghost"
              fullWidth
              haptic="none"
              disabled={loading}
              onPress={onClose}
            />
          </Stack>
        </Stack>
      )}
    </Sheet>
  );
}
