import type { Pesos } from '@domain/money';
import { Card, Divider, Money, Row, SectionHeader, Stack, Text } from '@/ui/primitives';
import type { FutureMonth } from '@domain/future';
import { breakdownRows, futureUnassignedCopy } from './futureMonthCopy';

/**
 * §23.1 · el desglose de un mes futuro: Comprometido, Ingreso previsto y Sin
 * asignar.
 *
 * Presentacional y sin estado: el container (Futuro) elige el mes. Está
 * extraído de la pantalla para poder testear el lenguaje de Sin asignar (UX-10).
 */
export function FutureMonthDetail({
  title,
  committed,
  expectedIncome,
  unassigned,
  breakdown,
  cardNames,
}: {
  title: string;
  committed: Pesos;
  expectedIncome: Pesos;
  unassigned: Pesos | null;
  /** §23.1 · el desglose al tocar el mes. Sin él, solo las tres cifras. */
  breakdown?: FutureMonth['breakdown'];
  /** El nombre de cada tarjeta, por id, para rotular su resumen estimado. */
  cardNames?: ReadonlyMap<string, string>;
}) {
  const copy = futureUnassignedCopy(unassigned);
  const rows = breakdown == null ? [] : breakdownRows(breakdown, cardNames ?? new Map());

  return (
    <Stack gap="4">
      <SectionHeader title={title} />
      <Card>
        <Stack gap="3">
          <DetailRow label="Comprometido" amount={committed} />
          <DetailRow label="Ingreso previsto" amount={expectedIncome} />
          <Divider />

          {/* Tres estados excluyentes, como en el radar de Inicio. */}
          {copy.kind === 'noIncome' ? (
            <Text variant="small" tone="secondary">
              {copy.text}
            </Text>
          ) : copy.kind === 'exceeds' ? (
            <Text variant="small" tone="excess">
              {copy.text}{' '}
              <Money amount={copy.amount} sign="never" variant="smallMedium" tone="excess" />.
            </Text>
          ) : (
            <Stack gap="1">
              <DetailRow label={copy.label} amount={copy.amount} emphasis />
              <Text variant="caption" tone="muted">
                {copy.help}
              </Text>
            </Stack>
          )}
        </Stack>
      </Card>

      {/* §23.1 · de qué está hecho lo comprometido (tu parte, §7.3). */}
      {rows.length > 0 && (
        <Stack gap="3">
          <SectionHeader title="De qué está hecho" />
          <Card>
            <Stack gap="3">
              {rows.map((row) => (
                <Row key={row.key} justify="space-between" align="baseline" gap="3">
                  <Text variant="body" tone="secondary" style={{ flex: 1 }}>
                    {row.note == null ? row.label : `${row.label} · ${row.note}`}
                  </Text>
                  <Money amount={row.amount} variant="bodyMedium" />
                </Row>
              ))}
            </Stack>
          </Card>
          <Text variant="caption" tone="muted">
            Un mismo pago puede estar en más de una fila: una cuota con tarjeta cuenta en Cuotas y
            en el resumen de su tarjeta.
          </Text>
        </Stack>
      )}
    </Stack>
  );
}

function DetailRow({
  label,
  amount,
  emphasis = false,
}: {
  label: string;
  amount: number;
  emphasis?: boolean;
}) {
  return (
    <Row justify="space-between" align="baseline" gap="3">
      <Text
        variant={emphasis ? 'bodyMedium' : 'body'}
        tone={emphasis ? 'default' : 'secondary'}
        style={{ flex: 1 }}
      >
        {label}
      </Text>
      <Money amount={amount} variant={emphasis ? 'heading' : 'bodyMedium'} animate />
    </Row>
  );
}
