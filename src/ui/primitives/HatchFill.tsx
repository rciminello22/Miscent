import Svg, { Defs, Line, Pattern, Rect } from 'react-native-svg';

/** El rayado del exceso: paso y grosor de la línea, en px. */
const HATCH_STEP = 5;
const HATCH_STROKE = 2;

/**
 * N-08 · el relleno rayado a 45° del exceso. Se distingue por la forma, no solo
 * por el ámbar. Llena el contenedor (que le pone el tamaño y el contorno).
 *
 * `id` tiene que ser único por pantalla: un patrón por tramo.
 */
export function HatchFill({ id, color }: { id: string; color: string }) {
  return (
    <Svg width="100%" height="100%">
      <Defs>
        <Pattern
          id={id}
          width={HATCH_STEP}
          height={HATCH_STEP}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <Line x1="0" y1="0" x2="0" y2={HATCH_STEP} stroke={color} strokeWidth={HATCH_STROKE} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}
