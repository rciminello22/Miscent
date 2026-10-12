import { View } from 'react-native';
import { Banknote, CreditCard, Landmark, MoreHorizontal, Send, Wallet } from 'lucide-react-native';
import type { PaymentOption } from './paymentOptions';
import { Pressable, Row, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';

/* ────────────────────────────────────────────────────────────────────────── */

/** Etiqueta de un grupo de campos del formulario. */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.space['2'] }}>
      <Text variant="smallMedium" tone="secondary">
        {label}
      </Text>
      {children}
      {hint != null && (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      )}
    </View>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: React.ReactNode;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space['2'],
        paddingVertical: theme.space['2'],
        paddingHorizontal: theme.space['3'],
        borderRadius: theme.radius.pill,
        backgroundColor: selected ? theme.colors.brand : theme.colors.surface,
        borderWidth: 1,
        borderColor: selected ? theme.colors.brand : theme.colors.border,
      }}
    >
      {icon}
      <Text variant="small" tone={selected ? 'onBrand' : 'secondary'}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Dos opciones excluyentes, al estilo de un segmentado. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  const theme = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: theme.colors.surfaceSunken,
        borderRadius: theme.radius.md,
        padding: 3,
      }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            scaleOnPress={false}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={{
              flex: 1,
              height: 38,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: theme.radius.sm,
              backgroundColor: selected ? theme.colors.surface : 'transparent',
            }}
          >
            <Text variant="smallMedium" tone={selected ? 'default' : 'muted'}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

const METHOD_ICONS = {
  cash: Banknote,
  debit: Landmark,
  wallet: Wallet,
  transfer: Send,
  other: MoreHorizontal,
  card: CreditCard,
} as const;

/**
 * §17 campo 7 · "Medio de pago: último usado; efectivo, débito, billetera,
 * transferencia, otro o una tarjeta".
 *
 * El medio importa por una sola razón, y es la más importante del producto:
 * decide CUÁNDO se paga. Al contado es hoy (G-03); con tarjeta, el
 * vencimiento del resumen (T-03). De ahí sale si el gasto va a Gastado o a
 * Comprometido.
 */
/**
 * §17 campo 7 · presentacional. Quién crea el medio que todavía no existe es
 * `PaymentMethodField`, que es lo que usan las pantallas.
 */
export function PaymentMethodPicker({
  options,
  value,
  onPress,
}: {
  options: readonly PaymentOption[];
  value: string | null;
  onPress: (option: PaymentOption) => void;
}) {
  const theme = useTheme();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space['2'] }}>
      {options.map((option) => {
        const Icon = METHOD_ICONS[option.kind];
        const selected = option.methodId != null && option.methodId === value;
        return (
          <Chip
            key={option.key}
            label={option.name}
            selected={selected}
            onPress={() => onPress(option)}
            icon={
              <Icon
                size={14}
                color={selected ? theme.colors.textOnBrand : theme.colors.textSecondary}
              />
            }
          />
        );
      })}
    </View>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

/** §17 campo 8 · "Cantidad (3, 6, 9, 12, 18, otra)". */
export const INSTALLMENT_PRESETS = [3, 6, 9, 12, 18] as const;

export function InstallmentCountPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (next: number | null) => void;
}) {
  const theme = useTheme();

  return (
    <Row gap="2" style={{ flexWrap: 'wrap' }}>
      {INSTALLMENT_PRESETS.map((count) => (
        <Chip
          key={count}
          label={`${count}`}
          selected={value === count}
          onPress={() => onChange(value === count ? null : count)}
        />
      ))}
      <View style={{ justifyContent: 'center' }}>
        <Text variant="caption" tone="muted">
          cuotas
        </Text>
      </View>
    </Row>
  );
}
