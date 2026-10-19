import { Info, X } from 'lucide-react-native';
import { formatPesos } from '@/lib/format';
import { amountSpeech, type SignedKind } from '@/features/movements/amountSign';
import { Card, IconButton, Money, Row, Stack, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import { FactRows } from './FactRows';
import type { FormerHistoryDetail } from './formerHistoryDetail';

function signedKind(detail: FormerHistoryDetail): SignedKind {
  if (detail.kind === 'expense') return 'expense';
  return detail.sign === 'in' ? 'payment-received' : 'payment-sent';
}

/**
 * SA-02 · SA-05 · el cuerpo del detalle de solo lectura de un registro de un
 * espacio del que saliste: el título, la cifra (tu parte, con el signo de
 * siempre), una tarjeta con lo que quedó en la foto y la frase que dice por qué
 * no se edita. Sin botones de acción: eliminar del historial se decide aparte.
 * Presentacional: el armado vive en `buildFormerHistoryDetail`.
 */
export function FormerHistoryView({
  detail,
  onClose,
}: {
  detail: FormerHistoryDetail;
  onClose: () => void;
}) {
  const theme = useTheme();

  return (
    <Stack gap="7">
      <Row justify="space-between" align="center">
        <Text variant="heading" numberOfLines={1} style={{ flex: 1 }}>
          {detail.title}
        </Text>
        <IconButton
          label="Cerrar"
          onPress={onClose}
          icon={<X size={18} color={theme.colors.textSecondary} />}
        />
      </Row>

      <Stack gap="2">
        <Text variant="small" tone="secondary">
          {detail.context}
        </Text>
        {/* 15 · la cifra grande es TU PARTE (K9): "−" si sale, "+" si entra. */}
        <Money
          amount={detail.amount}
          variant="display"
          sign={detail.sign}
          accessibilityLabel={amountSpeech(signedKind(detail), detail.amount, formatPesos)}
        />
        {detail.ofTotal != null && (
          <Text variant="caption" tone="muted" tabular>
            de {formatPesos(detail.ofTotal)}
          </Text>
        )}
      </Stack>

      <Card>
        <FactRows facts={detail.facts} />
      </Card>

      <Card tone="sunken">
        <Row gap="2" align="flex-start">
          <Info size={16} color={theme.colors.textMuted} style={{ marginTop: 2 }} />
          <Text variant="small" tone="secondary" style={{ flex: 1 }}>
            {detail.note}
          </Text>
        </Row>
      </Card>
    </Stack>
  );
}
