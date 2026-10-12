import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { monthOf } from '@domain/calendar';
import { alreadyInSpaces } from '@domain/duplicates';
import type { Category } from '@domain/types';
import { categoryLabel, categoryMeta } from '@/features/add/categories';
import { formatPesos } from '@/lib/format';
import { AmountInput } from '@/features/add/AmountInput';
import { DayPicker } from '@/features/onboarding/DayPicker';
import { StepShell } from '@/features/onboarding/StepShell';
import { alreadyInLine, anotherOneQuestion } from '@/features/onboarding/alreadyInSpacesCopy';
import { Field } from '@/features/add/fields';
import { useCreateRecurrence, usePersonalFacts } from '@/features/shared/usePersonalFacts';
import { useToday } from '@/features/shared/useToday';
import { Button, Card, Pressable, Row, Stack, Text } from '@/ui/primitives';
import { duration, stagger } from '@/ui/motion';
import { useTheme } from '@/ui/theme';

/**
 * O3 paso 5 · Gastos fijos: "sugerencias tildables".
 *
 * §13 da la lista exacta: alquiler, expensas, servicios, internet, celular,
 * gimnasio, streaming, prepaga.
 *
 * Son sugerencias y no un formulario vacío por el usuario objetivo de §2:
 * alguien que abandonó la planilla. Una pantalla en blanco que dice "agregá
 * tus gastos fijos" lo deja pensando qué cuenta como fijo. Una lista tildable
 * le recuerda los que tiene.
 *
 * CA-09 · los que ya están en un espacio aparecen como "Ya en Casa · tu parte
 * $250.000". Se pueden tildar igual, pero antes se pregunta "¿Es otro
 * alquiler?" (§11 paso 3): sin esa pregunta, el radar contaría dos veces el
 * mismo alquiler, una por la parte de Casa (K9) y otra por el fijo personal.
 */

const SUGGESTIONS: { category: Category; label: string; another: string }[] = [
  { category: 'alquiler', label: 'Alquiler', another: '¿Es otro alquiler?' },
  { category: 'expensas', label: 'Expensas', another: '¿Son otras expensas?' },
  { category: 'servicios', label: 'Servicios', another: '¿Son otros servicios?' },
  { category: 'internet', label: 'Internet', another: '¿Es otro internet?' },
  { category: 'celular', label: 'Celular', another: '¿Es otro celular?' },
  { category: 'gimnasio', label: 'Gimnasio', another: '¿Es otro gimnasio?' },
  { category: 'suscripciones', label: 'Streaming', another: '¿Es otro streaming?' },
  { category: 'salud', label: 'Prepaga', another: '¿Es otra prepaga?' },
];

const SUGGESTED = new Set(SUGGESTIONS.map((suggestion) => suggestion.category));

type Draft = { amount: number; dayOfMonth: number };

export default function Fijos() {
  const theme = useTheme();
  const router = useRouter();
  const today = useToday();
  const { facts } = usePersonalFacts();
  const createRecurrence = useCreateRecurrence();

  const [drafts, setDrafts] = useState<Partial<Record<Category, Draft>>>({});
  const [editing, setEditing] = useState<Category | null>(null);
  // §11 paso 3 · la sugerencia que está preguntando "¿Es otro alquiler?".
  const [confirming, setConfirming] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);

  const inSpaces = useMemo(() => alreadyInSpaces(facts.spaces, today).fixed, [facts.spaces, today]);
  const matchesFor = (category: Category) => inSpaces.filter((item) => item.category === category);
  // Los fijos compartidos sin sugerencia propia también se muestran (CA-09).
  const others = inSpaces.filter((item) => !SUGGESTED.has(item.category));

  const chosen = Object.entries(drafts).filter(([, draft]) => (draft?.amount ?? 0) > 0);

  function select(category: Category) {
    setConfirming(null);
    setEditing(category);
    setDrafts((previous) => ({ ...previous, [category]: { amount: 0, dayOfMonth: 1 } }));
  }

  function toggle(category: Category) {
    if (drafts[category] != null) {
      setDrafts((previous) => {
        const next = { ...previous };
        delete next[category];
        return next;
      });
      if (editing === category) setEditing(null);
      return;
    }
    if (matchesFor(category).length > 0) {
      setConfirming(confirming === category ? null : category);
      return;
    }
    select(category);
  }

  function update(category: Category, patch: Partial<Draft>) {
    setDrafts((previous) => ({
      ...previous,
      [category]: { ...(previous[category] ?? { amount: 0, dayOfMonth: 1 }), ...patch },
    }));
  }

  async function save() {
    setSaving(true);
    try {
      for (const [category, draft] of chosen) {
        if (draft == null) continue;
        await createRecurrence.mutateAsync({
          kind: 'expense',
          amount: draft.amount,
          category: category as Category,
          dayOfMonth: draft.dayOfMonth,
          startMonth: monthOf(today),
          endMonth: null,
          paymentMethodId: null,
        });
      }
      router.replace('/onboarding/listo');
    } catch {
      setSaving(false);
    }
  }

  return (
    <StepShell
      step={4}
      total={5}
      title="¿Qué pagás todos los meses?"
      description="Los fijos son la mitad de tu Futuro: una vez cargados, se repiten solos."
      help="Tildá los que tengas y poné el monto. Los que falten los agregás después."
      saving={saving}
      onContinue={() => void save()}
      onSkip={() => router.replace('/onboarding/listo')}
      continueLabel={chosen.length > 0 ? `Guardar ${chosen.length}` : 'Continuar'}
      continueDisabled={false}
    >
      <Stack gap="3">
        {SUGGESTIONS.map((suggestion, index) => {
          const draft = drafts[suggestion.category];
          const selected = draft != null;
          const Icon = categoryMeta(suggestion.category).icon;
          const isEditing = editing === suggestion.category;
          const matches = matchesFor(suggestion.category);

          return (
            <Animated.View
              key={suggestion.category}
              layout={LinearTransition}
              entering={FadeInDown.delay(stagger(index, 50)).duration(duration.base)}
            >
              <Pressable
                onPress={() => toggle(suggestion.category)}
                scaleOnPress={false}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={suggestion.label}
                accessibilityHint={matches.map(alreadyInLine).join('. ') || undefined}
                style={{
                  borderRadius: theme.radius.lg,
                  borderWidth: 1,
                  borderColor: selected ? theme.colors.brand : theme.colors.border,
                  backgroundColor: selected ? theme.colors.brandSoft : theme.colors.surface,
                  padding: theme.space['4'],
                }}
              >
                <Row gap="3" align="center">
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      borderWidth: selected ? 0 : 1.5,
                      borderColor: theme.colors.borderStrong,
                      backgroundColor: selected ? theme.colors.brand : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {selected && <Check size={14} color={theme.colors.textOnBrand} />}
                  </View>

                  <Icon size={16} color={theme.colors.textSecondary} />

                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium">{suggestion.label}</Text>
                    {matches.map((match) => (
                      <Text key={match.recurrenceId} variant="caption" tone="shared">
                        {alreadyInLine(match)}
                      </Text>
                    ))}
                  </View>

                  {selected && draft != null && draft.amount > 0 && !isEditing && (
                    <Pressable
                      onPress={() => setEditing(suggestion.category)}
                      haptic="none"
                      scaleOnPress={false}
                    >
                      <Text variant="smallMedium" tone="brand" tabular>
                        {formatPesos(draft.amount)}
                      </Text>
                    </Pressable>
                  )}
                </Row>
              </Pressable>

              {confirming === suggestion.category && (
                <Animated.View
                  entering={FadeInDown.duration(duration.base)}
                  style={{ marginTop: theme.space['2'] }}
                >
                  <Card tone="sunken">
                    <Stack gap="4">
                      <Text variant="small">
                        {anotherOneQuestion(suggestion.label, suggestion.another, matches)}
                      </Text>
                      <Row gap="2">
                        <Button
                          label="No, es el mismo"
                          variant="ghost"
                          onPress={() => setConfirming(null)}
                          style={{ flex: 1 }}
                        />
                        <Button
                          label="Sí, es otro"
                          variant="secondary"
                          onPress={() => select(suggestion.category)}
                          style={{ flex: 1 }}
                        />
                      </Row>
                    </Stack>
                  </Card>
                </Animated.View>
              )}

              {selected && isEditing && draft != null && (
                <Animated.View
                  entering={FadeInDown.duration(duration.base)}
                  style={{ marginTop: theme.space['2'] }}
                >
                  <Card tone="sunken">
                    <Stack gap="5">
                      <View>
                        <AmountInput
                          value={draft.amount}
                          onChange={(amount) => update(suggestion.category, { amount })}
                        />
                      </View>

                      <Field label="¿Qué día lo pagás?">
                        <DayPicker
                          value={draft.dayOfMonth}
                          onChange={(day) =>
                            update(suggestion.category, { dayOfMonth: day ?? 1 })
                          }
                        />
                      </Field>
                    </Stack>
                  </Card>
                </Animated.View>
              )}
            </Animated.View>
          );
        })}

        {others.length > 0 && (
          <Card tone="sunken">
            <Stack gap="3">
              <Text variant="smallMedium" tone="secondary">
                También están en tus espacios. No hace falta cargarlos: tu parte ya cuenta.
              </Text>
              {others.map((item) => {
                const OtherIcon = categoryMeta(item.category).icon;
                return (
                  <Row key={item.recurrenceId} gap="3" align="center">
                    <OtherIcon size={16} color={theme.colors.textSecondary} />
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyMedium">{categoryLabel(item.category)}</Text>
                      <Text variant="caption" tone="shared">
                        {alreadyInLine(item)}
                      </Text>
                    </View>
                  </Row>
                );
              })}
            </Stack>
          </Card>
        )}
      </Stack>
    </StepShell>
  );
}
