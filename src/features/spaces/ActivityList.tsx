import { ScrollView, View } from "react-native";
import { Divider, Stack, Text } from "@/ui/primitives";
import { useTheme } from "@/ui/theme";

/**
 * Should 6 · la actividad reciente del espacio, ya escrita. Presentacional:
 * las líneas las arma `activityLine` (puro, con test).
 */
export function ActivityList({
  items,
}: {
  items: readonly { key: string; line: string; when: string }[];
}) {
  const theme = useTheme();

  if (items.length === 0) {
    return (
      <Text variant="small" tone="secondary">
        Todavía no hay movimientos en este espacio.
      </Text>
    );
  }

  // La hoja no scrollea sola: 20 líneas no entran en un teléfono chico.
  return (
    <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
      <Stack gap="0">
        {items.map((item, index) => (
          <View key={item.key}>
            <View style={{ paddingVertical: theme.space["3"], gap: 2 }}>
              <Text variant="small">{item.line}</Text>
              <Text variant="caption" tone="muted">
                {item.when}
              </Text>
            </View>
            {index < items.length - 1 && <Divider />}
          </View>
        ))}
        <Text
          variant="caption"
          tone="muted"
          style={{ marginTop: theme.space["3"] }}
        >
          De un gasto editado varias veces se ve la última edición.
        </Text>
      </Stack>
    </ScrollView>
  );
}
