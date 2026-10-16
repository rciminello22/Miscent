import { useRouter } from 'expo-router';
import { CreditCard, Repeat } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { monthOf } from '@domain/calendar';
import { usePersonalFacts } from '@/features/shared/usePersonalFacts';
// TEMPORAL: variante B en prueba
import { MovementsVariantSwitch } from '@/features/movements/MovementsVariantSwitch';
// TEMPORAL: variante B en prueba
import { useMovementsVariant } from '@/features/movements/movementsVariant';
import { selectFixedExpenses } from '@/features/fixed/fixedExpenses';
import { selectFixedIncomes } from '@/features/fixed/fixedIncomes';
import { selectCards } from '@/features/profile/cards';
import {
  AccountActions,
  DisplayNameCard,
  PrivacySection,
} from '@/features/profile/ProfileSections';
import {
  Card,
  Divider,
  Pressable,
  Row,
  RowChevron,
  Screen,
  SectionHeader,
  Stack,
  Text,
} from '@/ui/primitives';
import { duration } from '@/ui/motion';
import { useTheme } from '@/ui/theme';

/**
 * §14 · Perfil (Estado A): nombre visible, ingresos, tarjetas, categorías,
 * Privacidad y datos, cerrar sesión, eliminar cuenta.
 *
 * Lo común con el perfil del invitado vive en features/profile; acá queda lo
 * que solo tiene sentido con cuenta personal: "Tus datos".
 */
export default function Perfil() {
  const theme = useTheme();
  const router = useRouter();
  const { facts, today } = usePersonalFacts();
  // TEMPORAL: variante B en prueba
  const movementsVariant = useMovementsVariant();

  // UX-01 · UX-21 · cada número sale de la MISMA función que la lista que abre:
  // la cuenta y la lista no pueden discrepar.
  const cards = selectCards(facts.paymentMethods);
  const fixed = selectFixedExpenses(facts.recurrences, monthOf(today));
  const incomes = selectFixedIncomes(facts.recurrences, monthOf(today));

  return (
    <Screen inTabs>
      <Stack gap="7">
        <Text variant="overline" tone="muted">
          Perfil
        </Text>

        <Animated.View entering={FadeInDown.duration(duration.deliberate)}>
          <DisplayNameCard />
        </Animated.View>

        {/* ── Lo que cargaste ─────────────────────────────────────────── */}
        <Stack gap="4">
          <SectionHeader title="Tus datos" />
          <Card>
            <Stack gap="0">
              <SummaryRow
                icon={<Repeat size={16} color={theme.colors.textSecondary} />}
                label="Ingresos"
                value={`${incomes.length}`}
                onPress={() => router.push('/fijo/ingresos')}
              />
              <Divider />
              <SummaryRow
                icon={<CreditCard size={16} color={theme.colors.textSecondary} />}
                label="Tarjetas"
                value={`${cards.length}`}
                onPress={() => router.push('/tarjetas')}
              />
              <Divider />
              <SummaryRow
                icon={<Repeat size={16} color={theme.colors.textSecondary} />}
                label="Fijos"
                value={`${fixed.length}`}
                onPress={() => router.push('/fijo/gastos')}
              />
            </Stack>
          </Card>
        </Stack>

        <PrivacySection />

        {/* TEMPORAL: variante B en prueba. Solo en desarrollo. */}
        {__DEV__ && movementsVariant.variant !== null && (
          <MovementsVariantSwitch
            variant={movementsVariant.variant}
            onToggle={movementsVariant.toggle}
          />
        )}

        <AccountActions kind="personal" />
      </Stack>
    </Screen>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      haptic="none"
      scaleOnPress={false}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ paddingVertical: theme.space['4'] }}
    >
      <Row gap="3" align="center">
        {icon}
        <Text variant="body" style={{ flex: 1 }}>
          {label}
        </Text>
        <Text variant="bodyMedium" tone="secondary" tabular>
          {value}
        </Text>
        <RowChevron />
      </Row>
    </Pressable>
  );
}
