import { View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import type { UpcomingPayment } from '@domain/upcoming';
import { formatPaymentWhen } from '@/lib/format';
import { Money, Pressable, Row, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import { paymentLabel } from './paymentLabel';
import { ESTIMATE_NOTE } from './statementDetail';

/**
 * §23.2 · una fila de Próximos pagos.
 *
 * Extraída de la pantalla porque concentra tres textos que la spec declara
 * obligatorios, y los tres son fáciles de olvidar:
 *
 *   N-10 / CA-35 · todo resumen de tarjeta va rotulado como estimado: "resumen
 *                   estimado" en cada fila (como el ejemplo de §15) y la frase
 *                   "Estimado según lo que registraste" una vez por bloque. No
 *                   es opcional: el resumen real del banco va a diferir, y la
 *                   app no promete conciliar
 *   §7.3        · "incluye $X de Martina" cuando el pago lleva la parte de
 *                   otro miembro. Sin eso, el usuario leería el total como si
 *                   fuera todo suyo y las dos lentes se mezclarían
 *   G-06 / CA-37 · "Ya pasó", NUNCA "Pagado". La app no verifica pagos
 *
 * T-05 · y cuando no se conoce el día, se muestra el mes y se avisa que las
 * fechas son aproximadas. Nunca se inventa una fecha.
 */

export const UPCOMING_COPY = {
  estimate: ESTIMATE_NOTE,
  approximate: 'Fechas aproximadas',
  /** T-02 · la marca de una fecha que sale de un "Más o menos". */
  approxMark: 'aprox.',
  /** G-06 · el estado correcto. "Pagado" está prohibido (CA-45). */
  past: 'Ya pasó',
  includes: 'incluye',
} as const;

export function UpcomingPaymentRow({
  payment,
  /**
   * UX-08 · §4.10 · "cada número se puede abrir": si viene, la fila es un botón con
   * chevron que abre el detalle. Sin esto es informativa.
   */
  onPress,
  /** Inicio usa el cuerpo grande; Futuro, el chico. */
  size = 'small',
}: {
  payment: UpcomingPayment;
  onPress?: () => void;
  size?: 'small' | 'body';
}) {
  const theme = useTheme();
  const body = size === 'body';

  const row = (
    <Row gap="3" align="flex-start">
      <Text variant="small" tone="muted" tabular style={{ width: body ? 54 : 58 }}>
        {formatPaymentWhen({
          date: payment.date,
          month: payment.month,
          approx: payment.dateApprox,
        })}
      </Text>

      <View style={{ flex: 1, gap: 2 }}>
        {/* N-10 / CA-35 · el rótulo corto en CADA resumen; la frase completa, una vez por bloque. */}
        <Text variant={body ? 'bodyMedium' : 'smallMedium'}>{paymentLabel(payment)}</Text>

        {/* §7.3 · la parte del otro, siempre aclarada. */}
        {payment.includesOtherShare > 0 && payment.otherMemberName != null && (
          <Text variant="caption" tone="shared">
            {UPCOMING_COPY.includes}{' '}
            <Money
              amount={payment.includesOtherShare}
              variant="caption"
              tone="shared"
            />{' '}
            de {payment.otherMemberName}
          </Text>
        )}

        {/* T-02 · solo lo que salió de un "Más o menos". T-05 ("Fechas aproximadas") va una vez, al pie de la lista. */}
        {payment.dateApprox && (
          <Text variant="caption" tone="muted">
            {UPCOMING_COPY.approxMark}
          </Text>
        )}

        {/* G-06 / CA-37 / CA-45 */}
        {payment.hasPassed && (
          <Text variant="caption" tone="muted">
            {UPCOMING_COPY.past}
          </Text>
        )}
      </View>

      <Money amount={payment.amount} variant={body ? 'bodyMedium' : 'smallMedium'} />

      {onPress != null && (
        // UX-11 · lo tocable lleva chevron.
        <View style={{ height: body ? 23 : 20, justifyContent: 'center' }}>
          <ChevronRight size={14} color={theme.colors.textMuted} />
        </View>
      )}
    </Row>
  );

  if (onPress == null) return row;

  return (
    <Pressable
      onPress={onPress}
      scaleOnPress={false}
      haptic="none"
      accessibilityRole="button"
      accessibilityHint="Ver de qué se compone este resumen"
    >
      {row}
    </Pressable>
  );
}
