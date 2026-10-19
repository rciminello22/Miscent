import { View } from 'react-native';
import { Money, Row, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import { formatPesos } from '@/lib/format';
import { splitBarFractions } from './splitBarFractions';

/**
 * El reparto como una barra de dos tramos —tu parte en teal, la del otro en
 * índigo, como sus avatares— con los dos montos debajo: "Tu parte $50.000" y
 * "Parte de Martina $50.000". Reemplaza a la tarjeta de partes que repetía lo
 * que ya decía el campo del reparto.
 *
 * Sin porcentajes (P3). Presentacional.
 */
export function SplitBar({
  myShare,
  otherShare,
  otherName,
}: {
  myShare: number;
  otherShare: number;
  otherName: string;
}) {
  const theme = useTheme();
  const fractions = splitBarFractions(myShare, otherShare);

  return (
    <View style={{ gap: theme.space['2'] }}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Reparto: tu parte ${formatPesos(myShare)}, parte de ${otherName} ${formatPesos(otherShare)}`}
        style={{
          flexDirection: 'row',
          height: 10,
          gap: 2,
          borderRadius: 5,
          overflow: 'hidden',
          backgroundColor: theme.colors.unassignedTrack,
        }}
      >
        <View
          testID="split-bar-mine"
          style={{ flex: fractions.mine, backgroundColor: theme.colors.shared }}
        />
        <View
          testID="split-bar-other"
          style={{ flex: fractions.other, backgroundColor: theme.colors.committed }}
        />
      </View>

      <Row justify="space-between" align="baseline">
        <Row gap="1" align="baseline">
          <Text variant="caption" tone="secondary">
            Tu parte
          </Text>
          <Money amount={myShare} variant="smallMedium" animate numberOfLines={1} />
        </Row>
        {/* El nombre cede antes de empujar el monto (Montos · 11). */}
        <Row gap="1" align="baseline" style={{ flexShrink: 1 }}>
          <Text variant="caption" tone="secondary" numberOfLines={1} style={{ flexShrink: 1 }}>
            Parte de {otherName}
          </Text>
          <Money amount={otherShare} variant="smallMedium" animate numberOfLines={1} />
        </Row>
      </Row>
    </View>
  );
}
