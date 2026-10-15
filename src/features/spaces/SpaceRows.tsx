import { View } from 'react-native';
import type { SpaceOccurrence } from '@domain/occurrences';
import type { DeletedRecord, MemberPayment } from '@domain/types';
import { formatDayMonth, formatInstallment, formatMonth, formatPesos } from '@/lib/format';
import { prettyLabel } from '@/features/add/categories';
import {
  ContributionBar,
  Money,
  Pressable,
  Row,
  RowChevron,
  Stack,
  Text,
  TextLink,
} from '@/ui/primitives';
import { useTheme } from '@/ui/theme';

/**
 * Las filas y barras de la pantalla del espacio (§24). Presentacionales: reciben
 * todo por props; `SpaceScreen` decide qué mostrar.
 */

/**
 * §24 · la barra de lo que puso cada uno, con la marca de su parte.
 *
 * "Parte" y no "le corresponde" (decisión del 10/10): en la pantalla de las
 * deudas, "te corresponden $350.000" se leía como plata que te deben. "Parte"
 * es el sinónimo exacto del glosario (§7.2).
 */
export function MemberContribution({
  name,
  put,
  share,
  max,
  tone,
  index,
}: {
  name: string;
  put: number;
  share: number;
  max: number;
  tone: 'viewer' | 'other';
  index: number;
}) {
  const isViewer = tone === 'viewer';

  return (
    <Stack gap="2">
      <Row justify="space-between" align="baseline">
        <Text variant="small" tone="secondary">
          {isViewer ? 'Pusiste' : `${name} puso`}
        </Text>
        <Money amount={put} variant="smallMedium" />
      </Row>

      <ContributionBar put={put} share={share} max={max} tone={tone} index={index} />

      <Row justify="flex-end">
        <Text variant="caption" tone="muted">
          {isViewer ? 'tu parte ' : 'su parte '}
        </Text>
        <Money amount={share} variant="caption" tone="muted" />
      </Row>
    </Stack>
  );
}

export type SpaceMovement =
  | { kind: 'occurrence'; date: string; occurrence: SpaceOccurrence }
  | { kind: 'payment'; date: string; payment: MemberPayment };

/**
 * §25 · un pago entre miembros en los movimientos del espacio. P-04: no cambia
 * lo que cada uno puso ni el radar; solo lo que se deben.
 */
export function PaymentRow({
  sentence,
  date,
  amount,
  reviewTag = null,
  onPress,
}: {
  sentence: string;
  date: string;
  amount: number;
  reviewTag?: string | null;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      haptic="none"
      scaleOnPress={false}
      accessibilityRole="button"
      accessibilityLabel={sentence}
      style={{ paddingVertical: theme.space['3'] }}
    >
      <Row gap="3" align="flex-start">
        <View style={{ flex: 1, gap: 3 }}>
          <Text variant="bodyMedium" numberOfLines={1}>
            {sentence}
          </Text>
          <Text variant="caption" tone="muted">
            {formatDayMonth(date)} · pago entre ustedes · no cambia lo que cada uno puso
          </Text>
          {reviewTag != null && <ReviewTag label={reviewTag} />}
        </View>
        <Money amount={amount} variant="bodyMedium" tone="muted" />
        {/* UX-11 · el pago se abre. */}
        <View style={{ marginTop: 3 }}>
          <RowChevron />
        </View>
      </Row>
    </Pressable>
  );
}

/**
 * Opción B · el rastro de algo que eliminó el otro. Tachado y en gris: ya no
 * cuenta en ningún número, y se dice qué era para que se entienda el cambio.
 */
export function DeletedRow({
  item,
  label,
  tag,
  onReviewed,
}: {
  item: DeletedRecord;
  label: string;
  tag: string;
  onReviewed: () => void;
}) {
  const theme = useTheme();

  return (
    <View style={{ paddingVertical: theme.space['3'], gap: 3 }}>
      <Row gap="3" align="flex-start">
        <View style={{ flex: 1, gap: 3 }}>
          <Text
            variant="bodyMedium"
            tone="muted"
            numberOfLines={1}
            style={{ textDecorationLine: 'line-through' }}
          >
            {label}
          </Text>
          {item.occurredOn != null && (
            <Text variant="caption" tone="muted">
              {formatDayMonth(item.occurredOn)}
            </Text>
          )}
          <ReviewTag label={tag} />
        </View>
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          {item.amount != null && (
            <Text
              variant="bodyMedium"
              tone="muted"
              tabular
              style={{ textDecorationLine: 'line-through' }}
            >
              {formatPesos(item.amount)}
            </Text>
          )}
          <TextLink label="Está bien" variant="smallMedium" onPress={onReviewed} />
        </View>
      </Row>
    </View>
  );
}

/** Opción B · la marca de "para revisar": un punto y quién lo cargó. */
export function ReviewTag({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <Row gap="2" align="center">
      <View
        style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.shared }}
      />
      <Text variant="caption" tone="shared">
        {label}
      </Text>
    </Row>
  );
}

/**
 * Una ocurrencia del espacio.
 *
 * Muestra el TOTAL, no la parte: en el espacio la cifra principal es lo que se
 * gastó entre los dos (§7.3, lente del espacio). La parte de cada uno aparece
 * en el reparto, debajo.
 */
export function SharedRow({
  occurrence,
  mySlot,
  otherName,
  myName,
  showMonth = false,
  reviewTag = null,
  onPress,
}: {
  occurrence: SpaceOccurrence;
  mySlot: 1 | 2;
  otherName: string;
  myName: string;
  showMonth?: boolean;
  /** Opción B · "Lo cargó Martina · para revisar". */
  reviewTag?: string | null;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const iPaid = occurrence.payerSlot === mySlot;
  const myShare = mySlot === 1 ? occurrence.shares.slot1 : occurrence.shares.slot2;

  const row = (
    <Row gap="3" align="flex-start">
      <View style={{ flex: 1, gap: 3 }}>
        <Text variant="bodyMedium" numberOfLines={1}>
          {prettyLabel(occurrence.label)}
        </Text>

        <Text variant="caption" tone="muted">
          {[
            showMonth
              ? formatMonth(occurrence.month, occurrence.month)
              : formatDayMonth(occurrence.balanceDate),
            // G-06 · "pagó X" es una declaración, no una verificación.
            `pagó ${iPaid ? myName : otherName}`,
            occurrence.installment != null
              ? `cuota ${formatInstallment(occurrence.installment.index, occurrence.installment.count)}`
              : null,
            occurrence.isRecurrence ? 'fijo' : null,
          ]
            .filter((part) => part != null)
            .join(' · ')}
        </Text>

        <Text variant="caption" tone="shared">
          tu parte <Money amount={myShare} variant="caption" tone="shared" />
        </Text>

        {reviewTag != null && <ReviewTag label={reviewTag} />}
      </View>

      <Money amount={occurrence.amount} variant="bodyMedium" />

      {/* UX-11 · solo la fila que abre algo lleva chevron. */}
      {onPress != null && (
        <View style={{ marginTop: 3 }}>
          <RowChevron />
        </View>
      )}
    </Row>
  );

  // UX-11 · "Próximos meses" del espacio no abre nada: fila informativa, sin
  // rol de botón ni chevron. La misma fila en Movimientos sí se abre.
  if (onPress == null) {
    return <View style={{ paddingVertical: theme.space['3'] }}>{row}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      haptic="none"
      scaleOnPress={false}
      accessibilityRole="button"
      accessibilityLabel={prettyLabel(occurrence.label)}
      style={{ paddingVertical: theme.space['3'] }}
    >
      {row}
    </Pressable>
  );
}
