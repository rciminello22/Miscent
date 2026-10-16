import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { calculateUpcomingPayments, type UpcomingPayment } from '@domain/upcoming';
import { StatementDetailSheet } from '@/features/upcoming/StatementDetailSheet';
import { UpcomingPaymentRow } from '@/features/upcoming/UpcomingPaymentRow';
import { canOpenPayment } from '@/features/upcoming/statementDetail';
import { usePersonalFacts } from '@/features/shared/usePersonalFacts';
import { Divider, Skeleton, Stack, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import { FutureDetailShell } from './FutureDetailShell';
import { paymentsFootnotes } from './futureView';
import { futurePaymentsView, initialPaymentsMonth } from './paymentsMonth';

/**
 * §23.2 · Próximos pagos del mes elegido, en su pantalla (N3). El mes en curso
 * muestra solo los pagos desde hoy; uno futuro, todos los del mes.
 *
 * La frase de N-10 y las demás notas van UNA vez, al pie: cada resumen ya se
 * rotula "resumen estimado" en su fila.
 */
export function FuturePaymentsScreen() {
  const theme = useTheme();
  const { mes } = useLocalSearchParams<{ mes?: string }>();
  const { facts, expansion, today, isLoading, refetch } = usePersonalFacts();
  // UX-08 · el resumen estimado abierto en la hoja de detalle.
  const [openPayment, setOpenPayment] = useState<UpcomingPayment | null>(null);

  const view = useMemo(
    () =>
      futurePaymentsView({
        payments: calculateUpcomingPayments(expansion, today, facts.paymentMethods),
        today,
        selectedMonth: initialPaymentsMonth(mes, today),
      }),
    [expansion, today, facts.paymentMethods, mes],
  );

  return (
    <FutureDetailShell title={view.title} onRefresh={refetch}>
      {isLoading ? (
        <Stack gap="3">
          <Skeleton height={44} />
          <Skeleton height={44} />
        </Stack>
      ) : (
        <Stack gap="4">
          {view.payments.length === 0 && (
            <Text variant="small" tone="secondary">
              No tenés más pagos este mes.
            </Text>
          )}

          <Stack gap="0">
            {view.payments.map((payment, index) => (
              <View key={payment.id}>
                {index > 0 && <Divider />}
                {/* UX-08 · el resumen estimado se abre (§23.2, §4.10). */}
                <View style={{ paddingVertical: theme.space['3'] }}>
                  <UpcomingPaymentRow
                    payment={payment}
                    onPress={canOpenPayment(payment) ? () => setOpenPayment(payment) : undefined}
                  />
                </View>
              </View>
            ))}
          </Stack>

          {paymentsFootnotes(view.payments).map((note) => (
            <Text key={note} variant="caption" tone="muted">
              {note}
            </Text>
          ))}
        </Stack>
      )}

      <StatementDetailSheet payment={openPayment} onClose={() => setOpenPayment(null)} />
    </FutureDetailShell>
  );
}
