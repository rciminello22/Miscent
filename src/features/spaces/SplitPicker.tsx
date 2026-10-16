import { TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { halve } from '@domain/money';
import type { Pesos } from '@domain/money';
import type { Slot, Split } from '@domain/types';
import { formatNumber } from '@/lib/format';
import { Segmented } from '@/features/add/fields';
import { Money, Row, Stack, Text } from '@/ui/primitives';
import { duration } from '@/ui/motion';
import { useTheme } from '@/ui/theme';
import { SplitBar } from './SplitBar';

/**
 * §17 campo 6 · el reparto.
 *
 * P3 cerró esto: **50/50 o personalizado POR MONTO. Sin porcentajes en la
 * interfaz.** Y la razón es el usuario objetivo: "$60.000 y $40.000" se
 * entiende sin pensar; "60% y 40%" obliga a hacer una cuenta para saber
 * cuánto es.
 *
 * Los dos campos "se completan entre sí y suman el total" (§17): al escribir
 * uno, el otro se calcula. Así C-02 (las partes suman el total) es imposible
 * de violar desde la interfaz, no solo desde la base.
 *
 * C-04 · uno puede ser $0, y eso es "un gasto que corresponde entero al otro".
 */
export function SplitPicker({
  total,
  split,
  onChange,
  mySlot,
  myName,
  otherName,
}: {
  total: Pesos;
  split: Split;
  onChange: (next: Split) => void;
  mySlot: Slot;
  myName: string;
  otherName: string;
}) {
  const theme = useTheme();

  const even = halve(total);
  const shares =
    split.mode === 'even'
      ? even
      : { slot1: split.shareSlot1, slot2: split.shareSlot2 };

  const myShare = mySlot === 1 ? shares.slot1 : shares.slot2;
  const otherShare = mySlot === 1 ? shares.slot2 : shares.slot1;

  /** Al escribir una parte, la otra se completa para que sumen el total. */
  function setMyShare(next: Pesos) {
    const mine = Math.min(Math.max(next, 0), total);
    const theirs = total - mine;

    onChange({
      mode: 'custom',
      shareSlot1: mySlot === 1 ? mine : theirs,
      shareSlot2: mySlot === 1 ? theirs : mine,
    });
  }

  function setOtherShare(next: Pesos) {
    const theirs = Math.min(Math.max(next, 0), total);
    setMyShare(total - theirs);
  }

  return (
    <Stack gap="4">
      <Segmented
        options={[
          { value: 'even', label: '50/50' },
          { value: 'custom', label: 'Personalizado' },
        ]}
        value={split.mode}
        onChange={(mode) =>
          onChange(
            mode === 'even'
              ? { mode: 'even' }
              : { mode: 'custom', shareSlot1: even.slot1, shareSlot2: even.slot2 },
          )
        }
      />

      {split.mode === 'custom' && (
        <Animated.View entering={FadeInDown.duration(duration.base)}>
          <Stack gap="3">
            <ShareInput label={myName} value={myShare} onChange={setMyShare} />
            <ShareInput label={otherName} value={otherShare} onChange={setOtherShare} />

            {/* C-02 · por construcción suman el total; se muestra para que se vea. */}
            <Row justify="space-between" align="baseline">
              <Text variant="caption" tone="muted">
                Suman
              </Text>
              <Money amount={myShare + otherShare} variant="caption" tone="muted" />
            </Row>

            {myShare === 0 && (
              <Text variant="caption" tone="muted">
                Todo es parte de {otherName}: vos no ponés nada.
              </Text>
            )}
            {otherShare === 0 && (
              <Text variant="caption" tone="muted">
                Todo es tu parte: {otherName} no pone nada.
              </Text>
            )}
          </Stack>
        </Animated.View>
      )}

      {/* Tu parte y la del otro, UNA vez y como forma: reemplaza a la tarjeta de
          partes que cada pantalla repetía. */}
      <SplitBar myShare={myShare} otherShare={otherShare} otherName={otherName} />

      {/* P3 · sin porcentajes en la interfaz, ni acá ni en ningún lado. */}
      <View
        style={{
          padding: theme.space['3'],
          borderRadius: theme.radius.sm,
          backgroundColor: theme.colors.surfaceSunken,
        }}
      >
        <Text variant="caption" tone="muted">
          Si el gasto es en cuotas, cada cuota se divide en la misma proporción.
        </Text>
      </View>
    </Stack>
  );
}

function ShareInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Pesos;
  onChange: (next: Pesos) => void;
}) {
  const theme = useTheme();

  return (
    <Row gap="3" align="center">
      <Text variant="small" tone="secondary" style={{ flex: 1 }} numberOfLines={1}>
        {label}
      </Text>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          paddingHorizontal: theme.space['3'],
          height: 44,
          minWidth: 130,
        }}
      >
        <Text variant="body" tone="muted">
          $
        </Text>
        <TextInput
          value={value > 0 ? formatNumber(value) : ''}
          onChangeText={(raw) => {
            const digits = raw.replace(/\D/g, '').slice(0, 12);
            onChange(digits === '' ? 0 : Number(digits));
          }}
          placeholder="0"
          placeholderTextColor={theme.colors.textMuted}
          keyboardType="number-pad"
          accessibilityLabel={`Parte de ${label}`}
          style={[
            theme.typography.body,
            {
              color: theme.colors.text,
              fontVariant: ['tabular-nums'],
              flex: 1,
              textAlign: 'right',
              padding: 0,
            },
          ]}
        />
      </View>
    </Row>
  );
}
