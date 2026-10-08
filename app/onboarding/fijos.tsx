import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { monthOf } from '@domain/calendar';
import type { Category } from '@domain/types';
import { categoryMeta } from '@/features/add/categories';
import { formatPesos } from '@/lib/format';
import { AmountInput } from '@/features/add/AmountInput';
import { DayPicker } from '@/features/onboarding/DayPicker';
import { StepShell } from '@/features/onboarding/StepShell';
import { Field } from '@/features/add/fields';
import { useCreateRecurrence } from '@/features/shared/usePersonalFacts';
import { useToday } from '@/features/shared/useToday';
import { Card, Pressable, Row, Stack, Text } from '@/ui/primitives';
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
 */

const SUGGESTIONS: { category: Category; label: string }[] = [
  { category: 'alquiler', label: 'Alquiler' },
  { category: 'expensas', label: 'Expensas' },
  { category: 'servicios', label: 'Servicios' },
  { category: 'internet', label: 'Internet' },
  { category: 'celular', label: 'Celular' },
  { category: 'gimnasio', label: 'Gimnasio' },
  { category: 'suscripciones', label: 'Streaming' },
  { category: 'salud', label: 'Prepaga' },
];

type Draft = { amount: number; dayOfMonth: number };

export default function Fijos() {
  const theme = useTheme();
  const router = useRouter();
  const today = useToday();
  const createRecurrence = useCreateRecurrence();

  const [drafts, setDrafts] = useState<Partial<Record<Category, Draft>>>({});
  const [editing, setEditing] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);

  const chosen = Object.entries(drafts).filter(([, draft]) => (draft?.amount ?? 0) > 0);

  function toggle(category: Category) {
    setDrafts((previous) => {
      if (previous[category] != null) {
        const next = { ...previous };
        delete next[category];
        if (editing === category) setEditing(null);
        return next;
      }
      setEditing(category);
      return { ...previous, [category]: { amount: 0, dayOfMonth: 1 } };
    });
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

                  <Text variant="bodyMedium" style={{ flex: 1 }}>
                    {suggestion.label}
                  </Text>

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
      </Stack>
    </StepShell>
  );
}
