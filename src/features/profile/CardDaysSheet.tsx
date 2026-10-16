import { ScrollView, View } from 'react-native';
import { Layers, Repeat, ShoppingCart, Users, type LucideIcon } from 'lucide-react-native';
import type { SharedDatesNote } from '@/features/spaces/sharedDatesNotes';
import { Button, Card, Sheet, Stack, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import type { SheetRow } from './cardDaysChanges';

export type CardDaysSheetState = {
  title: string;
  rows: readonly SheetRow[];
  notes: readonly SharedDatesNote[];
} | null;

const ICONS: Record<SheetRow['kind'], LucideIcon> = {
  installments: Layers,
  purchase: ShoppingCart,
  fixed: Repeat,
};

/**
 * §22, T-06 · antes de guardar los días de una tarjeta, la hoja dice qué se
 * mueve, con "antes → ahora": "Se recalculan N pagos de [mes] en adelante". Los
 * meses pasados no cambian. Una compra de un espacio lleva su nota (P2, C-05).
 * Tono neutral: sin color de alerta ni "cuidado". Presentacional.
 */
export function CardDaysSheet({
  state,
  onConfirm,
  onClose,
  loading = false,
}: {
  state: CardDaysSheetState;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}) {
  return (
    <Sheet visible={state != null} onClose={onClose} title={state?.title ?? ''}>
      {state != null && (
        <Stack gap="5">
          <Text variant="small" tone="secondary">
            Los meses pasados no cambian.
          </Text>

          <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
            <Stack gap="4">
              <Stack gap="3">
                {state.rows.map((row) => (
                  <ChangeRow key={row.key} row={row} />
                ))}
              </Stack>

              {state.notes.map((note) => (
                <Card key={note.title} tone="shared">
                  <Stack gap="1">
                    <Text variant="small">{note.title}</Text>
                    <Text variant="caption" tone="secondary">
                      {note.detail}
                    </Text>
                  </Stack>
                </Card>
              ))}
            </Stack>
          </ScrollView>

          <Stack gap="2">
            <Button
              label="Guardar cambios"
              size="lg"
              fullWidth
              haptic="success"
              loading={loading}
              onPress={onConfirm}
            />
            <Button label="Cancelar" variant="ghost" fullWidth haptic="none" onPress={onClose} />
          </Stack>
        </Stack>
      )}
    </Sheet>
  );
}

function ChangeRow({ row }: { row: SheetRow }) {
  const theme = useTheme();
  const Icon = row.shared ? Users : ICONS[row.kind];

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.space['3'] }}>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: theme.radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: row.shared ? theme.colors.sharedSoft : theme.colors.surfaceSunken,
        }}
      >
        <Icon size={16} color={row.shared ? theme.colors.shared : theme.colors.textSecondary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="small">{row.title}</Text>
        <Text variant="caption" tone="muted">
          {row.caption}
        </Text>
      </View>
    </View>
  );
}
