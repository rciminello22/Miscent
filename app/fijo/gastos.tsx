import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { monthOf } from '@domain/calendar';
import { goBack } from '@/features/shared/navigation';
import { usePersonalFacts } from '@/features/shared/usePersonalFacts';
import { FixedExpensesList } from '@/features/fixed/FixedExpensesList';
import { selectFixedExpenses } from '@/features/fixed/fixedExpenses';
import { AudienceBadge, IconButton, Row, Screen, Stack, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';

/**
 * UX-21 · "Tus fijos" (Perfil > Fijos).
 *
 * Lista los gastos fijos personales y abre el detalle de cada uno (F-03). Antes
 * Perfil > Fijos abría el paso del onboarding, que solo evitaba duplicados
 * contra los espacios y no contra los fijos propios: se podía recrear
 * "Alquiler" ya cargado.
 *
 * Mismo modelo que /fijo/ingresos. Un fijo nuevo se carga desde Agregar con
 * "Se repite cada mes" ya prendido: es el mismo alta de un gasto fijo que usa
 * el resto de la app.
 */
export default function Gastos() {
  const theme = useTheme();
  const router = useRouter();
  const { facts, today } = usePersonalFacts();

  const fixed = useMemo(
    () => selectFixedExpenses(facts.recurrences, monthOf(today)),
    [facts.recurrences, today],
  );

  return (
    <Screen>
      <Stack gap="7">
        <Row justify="space-between" align="center">
          <Text variant="heading">Tus fijos</Text>
          <IconButton
            label="Cerrar"
            onPress={() => goBack(router)}
            icon={<X size={18} color={theme.colors.textSecondary} />}
          />
        </Row>

        <AudienceBadge audience={{ kind: 'private' }} />

        <FixedExpensesList
          fixed={fixed}
          onOpen={(id) => router.push(`/fijo/${id}`)}
          onAdd={() => router.push('/agregar?fijo=1')}
        />
      </Stack>
    </Screen>
  );
}
