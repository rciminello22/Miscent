import { View } from 'react-native';
import type { Recurrence } from '@domain/types';
import { prettyLabel } from '@/features/add/categories';
import {
  Button,
  Card,
  Divider,
  Money,
  Pressable,
  Row,
  RowChevron,
  Stack,
  Text,
} from '@/ui/primitives';
import { useTheme } from '@/ui/theme';

/**
 * UX-21 · "Tus fijos": los gastos fijos personales, cada uno con su detalle.
 *
 * Presentacional, igual que `FixedIncomesList`: no sabe de rutas ni de datos.
 * Tocar una fila abre el detalle del fijo (F-03), que es donde se corrige un
 * monto o se ajusta un mes. Cargar uno nuevo es un botón aparte: el fijo que ya
 * existe nunca se "edita" creando otro.
 */
export function FixedExpensesList({
  fixed,
  onOpen,
  onAdd,
}: {
  fixed: readonly Recurrence[];
  onOpen: (id: string) => void;
  onAdd: () => void;
}) {
  const theme = useTheme();

  if (fixed.length === 0) {
    return (
      <Card tone="sunken">
        <Stack gap="5">
          <Text variant="body" tone="secondary">
            Todavía no cargaste ningún fijo.
          </Text>
          <Text variant="small" tone="muted">
            Alquiler, expensas, servicios: una vez cargados, se repiten solos en tu Futuro.
          </Text>
          <Button label="Agregar un fijo" fullWidth onPress={onAdd} />
        </Stack>
      </Card>
    );
  }

  return (
    <Stack gap="5">
      <Card>
        <Stack gap="0">
          {fixed.map((item, index) => (
            <View key={item.id}>
              <Pressable
                onPress={() => onOpen(item.id)}
                haptic="none"
                scaleOnPress={false}
                accessibilityRole="button"
                accessibilityHint="Cambiar este fijo o ajustar un mes"
                style={{ paddingVertical: theme.space['4'] }}
              >
                <Row gap="3" align="center">
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="bodyMedium">{item.description ?? prettyLabel(item.category)}</Text>
                    <Text variant="caption" tone="muted">
                      cada día {item.dayOfMonth}
                    </Text>
                  </View>
                  <Money amount={item.amount} variant="bodyMedium" />
                  <RowChevron />
                </Row>
              </Pressable>
              {index < fixed.length - 1 && <Divider />}
            </View>
          ))}
        </Stack>
      </Card>

      <Button label="Agregar otro fijo" variant="secondary" fullWidth onPress={onAdd} />
    </Stack>
  );
}
