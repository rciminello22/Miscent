import type { Pesos } from '@domain/money';
import { formatPesos } from '@/lib/format';
import { amountSpeech } from '@/features/movements/amountSign';
import { Card, Money, Stack, Text } from '@/ui/primitives';
import { FactRows } from './FactRows';
import type { IncomeDetailCopy } from './incomeDetail';

/**
 * 15·5 · el cuerpo del detalle de un ingreso, fijo o puntual: el monto con "+" y
 * color (es plata que entró), una línea que dice qué es, y una tarjeta con las
 * mismas filas en los dos casos. Presentacional: el copy viene de `incomeDetail`.
 */
export function IncomeSummary({ amount, copy }: { amount: Pesos; copy: IncomeDetailCopy }) {
  return (
    <Stack gap="5">
      <Stack gap="2">
        {/* El color va solo en la cifra grande: sobre brandSoft no llega a 4,5:1 en texto chico. */}
        <Money
          amount={amount}
          variant="display"
          sign="in"
          accessibilityLabel={amountSpeech('income', amount, formatPesos)}
        />
        <Text variant="small" tone="secondary">
          {copy.subtitle}
        </Text>
      </Stack>

      <Card>
        <FactRows facts={copy.facts} />
      </Card>
    </Stack>
  );
}
