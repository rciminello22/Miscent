import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radarForMonth, type PersonalFacts } from '@domain/index';

/**
 * Pantalla provisoria de la Fase 1.
 *
 * Existe para una sola cosa: comprobar en un dispositivo real que el motor de
 * cálculo del dominio corre dentro de la app. Se reemplaza por Inicio (§15) en
 * la Fase 3.
 */

const DEMO: PersonalFacts = {
  userId: 'demo',
  paymentMethods: [{ id: 'debito', kind: 'debit', name: 'Débito', closingDay: null, dueDay: null }],
  movements: [
    {
      id: 'ingreso',
      kind: 'income',
      amount: 1_200_000,
      date: '2026-10-05',
      category: 'sueldo',
      description: null,
      paymentMethodId: null,
      installments: null,
    },
    {
      id: 'gasto',
      kind: 'expense',
      amount: 320_000,
      date: '2026-10-10',
      category: 'supermercado',
      description: null,
      paymentMethodId: 'debito',
      installments: null,
    },
  ],
  recurrences: [
    {
      id: 'alquiler',
      kind: 'expense',
      amount: 480_000,
      category: 'alquiler',
      dayOfMonth: 1,
      startMonth: '2026-10',
      endMonth: null,
      ownerUserId: 'demo',
      spaceId: null,
      paymentMethodId: 'debito',
      payerSlot: null,
      split: null,
    },
  ],
  overrides: [],
  declaredStatements: [],
  spaces: [],
};

function formatPesos(amount: number): string {
  return `$${Math.abs(amount).toLocaleString('es-AR')}`;
}

export default function Index() {
  const insets = useSafeAreaInsets();
  const radar = radarForMonth(DEMO, '2026-10');

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}
    >
      <Text style={styles.audience}>Solo vos</Text>
      <Text style={styles.month}>OCTUBRE</Text>

      <Text style={styles.incomeLabel}>Tus ingresos de octubre</Text>
      <Text style={styles.income}>{formatPesos(radar.registeredIncome)} registrados</Text>

      <View style={styles.rows}>
        <Row label="Gastado" value={formatPesos(radar.spent)} />
        <Row label="Comprometido" value={formatPesos(radar.committed)} />
        <Row
          label="Sin asignar"
          value={radar.unassigned == null ? '—' : formatPesos(radar.unassigned)}
        />
      </View>

      <Text style={styles.help}>Todavía sin destino, según lo que registraste</Text>

      <Text style={styles.note}>
        Fase 1 · motor de cálculo del dominio funcionando. Inicio (§15) llega en la Fase 3.
      </Text>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FBFBFD' },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  audience: { fontSize: 12, color: '#8A8A93', textAlign: 'right' },
  month: { fontSize: 13, letterSpacing: 1.2, color: '#8A8A93', marginTop: 4 },
  incomeLabel: { fontSize: 15, color: '#55555E', marginTop: 28 },
  income: { fontSize: 32, fontWeight: '600', color: '#16161A', marginTop: 4 },
  rows: { marginTop: 32, gap: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  rowLabel: { fontSize: 16, color: '#55555E' },
  rowValue: { fontSize: 18, fontWeight: '500', color: '#16161A', fontVariant: ['tabular-nums'] },
  help: { fontSize: 13, color: '#8A8A93', marginTop: 10 },
  note: { fontSize: 12, color: '#A0A0A8', marginTop: 40, lineHeight: 18 },
});
