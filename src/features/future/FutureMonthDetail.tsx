import type { Pesos } from '@domain/money';
import { Card, Divider, Money, Row, SectionHeader, Stack, Text } from '@/ui/primitives';
import { futureUnassignedCopy } from './futureMonthCopy';

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
}: {
  title: string;
  committed: Pesos;
  expectedIncome: Pesos;
  unassigned: Pesos | null;
}) {
  const copy = futureUnassignedCopy(unassigned);

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
    <Row justify="space-between" align="baseline">
      <Text variant={emphasis ? 'bodyMedium' : 'body'} tone={emphasis ? 'default' : 'secondary'}>
        {label}
      </Text>
      <Money amount={amount} variant={emphasis ? 'heading' : 'bodyMedium'} animate />
    </Row>
  );
}
