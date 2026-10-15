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
 * UX-01 · "Tus ingresos": los ingresos fijos, cada uno con su detalle.
 *
 * Presentacional: no sabe de rutas ni de datos. Tocar una fila abre el detalle
 * del fijo (F-03: "Este mes fue distinto", "Cambiar desde este mes"), que es
 * donde se corrige un sueldo. Registrar uno nuevo es un botón aparte: el
 * ingreso que ya existe nunca se "edita" creando otro.
 */
export function FixedIncomesList({
  incomes,
  onOpen,
  onAdd,
}: {
  incomes: readonly Recurrence[];
  onOpen: (id: string) => void;
  onAdd: () => void;
}) {
  const theme = useTheme();

  if (incomes.length === 0) {
    return (
      <Card tone="sunken">
        <Stack gap="5">
          <Text variant="body" tone="secondary">
            Todavía no registraste ningún ingreso.
          </Text>
          <Text variant="small" tone="muted">
            Con tu ingreso, el radar muestra qué parte ya tiene destino.
          </Text>
          <Button label="Registrar mi ingreso" fullWidth onPress={onAdd} />
        </Stack>
      </Card>
    );
  }

  return (
    <Stack gap="5">
      <Card>
        <Stack gap="0">
          {incomes.map((income, index) => (
            <View key={income.id}>
              <Pressable
                onPress={() => onOpen(income.id)}
                haptic="none"
                scaleOnPress={false}
                accessibilityRole="button"
                accessibilityHint="Cambiar este ingreso o ajustar un mes"
                style={{ paddingVertical: theme.space['4'] }}
              >
                <Row gap="3" align="center">
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="bodyMedium">
                      {income.description ?? prettyLabel(income.category)}
                    </Text>
                    <Text variant="caption" tone="muted">
                      cada día {income.dayOfMonth}
                    </Text>
                  </View>
                  <Money amount={income.amount} variant="bodyMedium" />
                  <RowChevron />
                </Row>
              </Pressable>
              {index < incomes.length - 1 && <Divider />}
            </View>
          ))}
        </Stack>
      </Card>

      <Button label="Agregar otro ingreso" variant="secondary" fullWidth onPress={onAdd} />
    </Stack>
  );
}
