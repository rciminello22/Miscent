import type { ReactNode } from 'react';
import { Card, Money, Pressable, Row, RowChevron, Stack, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import type { FutureHeroLine } from './futureView';

/**
 * El N1 de Futuro (§23.1): la respuesta a "¿cómo vienen mis próximos meses?".
 *
 * Un panel teñido con el mes elegido —su comprometido en grande, con Sin
 * asignar y "según tus ingresos previstos" debajo, o la frase de N-08 si es
 * negativo—, las barras de los meses como selector (su forma visual) y la línea
 * de cuotas que terminan. Con el mes en curso elegido, que solo muestra los
 * pagos que faltan, la respuesta es cuántos.
 *
 * Presentacional: el container elige el mes y arma las frases.
 */
export type FutureHeroContent =
  | { kind: 'month'; committed: number; line: FutureHeroLine }
  | { kind: 'current'; headline: string };

export function FutureHero({
  monthLabel,
  hero,
  onOpenDetail,
  selector,
  endings,
}: {
  monthLabel: string;
  hero: FutureHeroContent;
  /** Tocar la cifra abre su detalle (§23.1: comprometido, ingreso previsto y sin asignar). */
  onOpenDetail: (() => void) | null;
  /** El selector de mes: la pastilla del mes en curso y las barras. */
  selector: ReactNode;
  /** CA-38 · "En marzo terminan 2 cuotas: tu comprometido baja $X por mes." */
  endings: readonly string[];
}) {
  const theme = useTheme();

  return (
    <Card tone="brand" style={{ borderRadius: theme.radius.xl, padding: theme.space['5'] }}>
      <Stack gap="4">
        {hero.kind === 'month' ? (
          <Stack gap="1">
            <Text variant="caption" tone="secondary">
              {monthLabel}
            </Text>
            <FigureTap onPress={onOpenDetail}>
              <Row gap="2" align="baseline">
                <Money amount={hero.committed} variant="display" animate />
                <Text variant="small" tone="secondary">
                  comprometidos
                </Text>
                {onOpenDetail != null && <RowChevron size={14} />}
              </Row>
            </FigureTap>
            <HeroLine line={hero.line} />
          </Stack>
        ) : (
          <Stack gap="1">
            <Text variant="caption" tone="secondary">
              {monthLabel}
            </Text>
            <Text variant="title">{hero.headline}</Text>
          </Stack>
        )}

        {selector}

        {endings.map((line) => (
          <Text key={line} variant="caption" tone="secondary">
            {line}
          </Text>
        ))}
      </Stack>
    </Card>
  );
}

function FigureTap({ onPress, children }: { onPress: (() => void) | null; children: ReactNode }) {
  if (onPress == null) return <>{children}</>;

  return (
    <Pressable
      onPress={onPress}
      scaleOnPress={false}
      haptic="none"
      accessibilityRole="button"
      accessibilityLabel="Comprometido del mes"
      accessibilityHint="Ver de qué se compone"
    >
      {children}
    </Pressable>
  );
}

/** N-08 y N-04: tres estados excluyentes, como el radar de Inicio. */
function HeroLine({ line }: { line: FutureHeroLine }) {
  if (line.kind === 'exceeds') {
    return (
      <Text variant="small" tone="excess">
        {line.text}{' '}
        <Money amount={line.amount} sign="never" variant="smallMedium" tone="excess" />.
      </Text>
    );
  }

  return (
    <Text variant="caption" tone="secondary">
      {line.text}
    </Text>
  );
}
