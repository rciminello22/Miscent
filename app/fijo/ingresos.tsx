import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { monthOf } from '@domain/calendar';
import { goBack } from '@/features/shared/navigation';
import { usePersonalFacts } from '@/features/shared/usePersonalFacts';
import { FixedIncomesList } from '@/features/fixed/FixedIncomesList';
import { selectFixedIncomes } from '@/features/fixed/fixedIncomes';
import { AudienceBadge, IconButton, Row, Screen, Stack, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';

/**
 * UX-01 · "Tus ingresos" (Perfil > Ingresos).
 *
 * Lista los ingresos fijos y abre el detalle de cada uno (F-03), que es donde
 * se corrige un sueldo o se ajusta un mes. Antes Perfil > Ingresos abría el
 * paso del onboarding, que SIEMPRE crea un recurrente nuevo: corregir el sueldo
 * lo duplicaba y inflaba "Sin asignar".
 *
 * Vive en /fijo (junto al detalle) y no en un árbol propio: es una hoja de
 * gestión, como el detalle, y /fijo/ingresos gana sobre /fijo/[id].
 */
export default function Ingresos() {
  const theme = useTheme();
  const router = useRouter();
  const { facts, today } = usePersonalFacts();

  const incomes = useMemo(
    () => selectFixedIncomes(facts.recurrences, monthOf(today)),
    [facts.recurrences, today],
  );

  return (
    <Screen>
      <Stack gap="7">
        <Row justify="space-between" align="center">
          <Text variant="heading">Tus ingresos</Text>
          <IconButton
            label="Cerrar"
            onPress={() => goBack(router)}
            icon={<X size={18} color={theme.colors.textSecondary} />}
          />
        </Row>

        <AudienceBadge audience={{ kind: 'private' }} />

        <FixedIncomesList
          incomes={incomes}
          onOpen={(id) => router.push(`/fijo/${id}`)}
          // Un ingreso nuevo, aparte: no sigue al wizard del onboarding.
          onAdd={() => router.push('/onboarding/ingreso?desde=perfil')}
        />
      </Stack>
    </Screen>
  );
}
