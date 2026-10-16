import type { ReactNode } from 'react';
import { View } from 'react-native';
import { ArrowRightLeft, Plus, UserPlus } from 'lucide-react-native';
import { Button, Card, Stack, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';

/**
 * El N1 del espacio: la respuesta a "¿cómo están las cuentas entre los dos?".
 *
 * Un panel teñido (`sharedSoft`) con su nombre, la balanza —la forma visual del
 * saldo—, la frase que dice lo mismo, y las acciones. "Agregar gasto" es la
 * acción principal; "Registrar pago" solo aparece si hay saldo, e "Invitar" solo
 * si el otro todavía no entró, y una sola vez en toda la pantalla.
 *
 * Presentacional: el container decide qué hay.
 */
export function SpaceHero({
  spaceName,
  scale,
  sentence,
  advance,
  note,
  invite,
  onPay,
  onAdd,
}: {
  spaceName: string;
  /** La balanza grande (`SpaceBalanceScale`). */
  scale: ReactNode;
  /** `balanceSentence`: "Martina te debe $20.000" / "Están a mano". */
  sentence: string;
  /** §25 · el aviso de adelanto, solo cuando aplica. */
  advance: string | null;
  /** §24 · "Martina todavía no entró" / "Martina · ex miembro". */
  note: string | null;
  /** "Invitar a Martina" / "Invitar de nuevo": solo si el lugar del otro está vacío. */
  invite: { label: string; onPress: () => void } | null;
  /** "Registrar pago": solo si hay saldo. */
  onPay: (() => void) | null;
  onAdd: () => void;
}) {
  const theme = useTheme();

  return (
    <Card
      tone="shared"
      style={{ borderRadius: theme.radius.xl, padding: theme.space['5'] }}
    >
      <Stack gap="4">
        <Text variant="overline" tone="muted">
          {spaceName}
        </Text>

        <View style={{ alignItems: 'center' }}>
          <View style={{ width: '100%', maxWidth: 280 }}>{scale}</View>
        </View>

        <Stack gap="2">
          <Text variant="title" align="center">
            {sentence}
          </Text>
          {advance != null && (
            <Text variant="small" tone="secondary" align="center">
              {advance}
            </Text>
          )}
          {note != null && (
            <Text variant="small" tone="muted" align="center">
              {note}
            </Text>
          )}
        </Stack>

        {(invite != null || onPay != null) && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space['2'] }}>
            {invite != null && (
              <Button
                label={invite.label}
                variant="secondary"
                icon={<UserPlus size={16} color={theme.colors.text} />}
                style={{ flexGrow: 1, flexBasis: 150 }}
                onPress={invite.onPress}
              />
            )}
            {onPay != null && (
              <Button
                label="Registrar pago"
                variant="secondary"
                icon={<ArrowRightLeft size={16} color={theme.colors.text} />}
                style={{ flexGrow: 1, flexBasis: 150 }}
                onPress={onPay}
              />
            )}
          </View>
        )}

        <Button
          label="Agregar gasto"
          variant="shared"
          fullWidth
          icon={<Plus size={16} color={theme.colors.textOnBrand} />}
          onPress={onAdd}
        />
      </Stack>
    </Card>
  );
}
