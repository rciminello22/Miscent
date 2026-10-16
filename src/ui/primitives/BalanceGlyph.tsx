import { View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { useTheme } from '../theme';

/** Cuántos grados se inclina el travesaño. Fijo: es un estado, no una proporción. */
const TILT = 14;
/** El eje del travesaño, en el viewBox de 40x24. */
const PIVOT = { x: 20, y: 9 };

/**
 * La balanza mini de la caja del ícono de una fila de espacio (3ii): un
 * travesaño sobre su eje, inclinado hacia quien puso de más o nivelado con un
 * tilde cuando están a mano. Sin rojo y sin flecha (§4.13). Estática: la que se
 * anima es la `BalanceScale` del espacio. El estado lo calcula
 * `balanceScaleState`; esto solo lo dibuja.
 */
export function BalanceGlyph({
  direction,
  showCheck,
  label,
  muted = false,
  width = 28,
}: {
  /** -1 baja el lado de la izquierda (vos), +1 el de la derecha, 0 nivelada. */
  direction: -1 | 0 | 1;
  showCheck: boolean;
  /** Lo que lee el lector de pantalla: el estado en palabras. */
  label: string;
  /** Apagada: el espacio ya no está activo. */
  muted?: boolean;
  width?: number;
}) {
  const theme = useTheme();
  const color = muted ? theme.colors.textMuted : theme.colors.shared;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      // Hacia dónde cae el travesaño, a la vista de los tests.
      testID={`balance-glyph-${direction === 0 ? 'level' : direction < 0 ? 'left' : 'right'}`}
    >
      <Svg width={width} height={(width * 24) / 40} viewBox="0 0 40 24">
        <G transform={`rotate(${direction * TILT} ${PIVOT.x} ${PIVOT.y})`}>
          <Path d="M4 9H36" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" />
        </G>
        <Path d="M20 9 15 22h10z" fill={color} />
        {showCheck && (
          <G testID="balance-glyph-check">
            <Circle cx={PIVOT.x} cy={PIVOT.y} r={7} fill={theme.colors.surface} stroke={color} strokeWidth={2.2} />
            <Path
              d="m16.8 9.2 2.2 2.2 4.3-4.8"
              fill="none"
              stroke={color}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </G>
        )}
      </Svg>
    </View>
  );
}
