import { useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, Plus, X } from 'lucide-react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { monthOf } from '@domain/calendar';
import { alreadyInSpaces } from '@domain/duplicates';
import { EXPENSE_CATEGORIES, categoryLabel, categoryMeta } from '@/features/add/categories';
import { CategoryGrid } from '@/features/add/CategoryGrid';
import { formatPesos } from '@/lib/format';
import { AmountInput } from '@/features/add/AmountInput';
import { DayPicker } from '@/features/onboarding/DayPicker';
import { StepShell } from '@/features/onboarding/StepShell';
import { onboardingBranches, onboardingProgress } from '@/features/onboarding/onboardingProgress';
import { alreadyInLine, anotherOneQuestion } from '@/features/onboarding/alreadyInSpacesCopy';
import {
  SUGGESTIONS,
  fixedToSave,
  matchesSuggestion,
  type CustomFixed,
  type FixedDraft,
  type Suggestion,
} from '@/features/onboarding/fixedSuggestions';
import { Field } from '@/features/add/fields';
import { useFeedback } from '@/features/shared/useFeedback';
import { useCreateRecurrences, usePersonalFacts } from '@/features/shared/usePersonalFacts';
import { draftId } from '@/data/ids';
import { useSession } from '@/features/auth/SessionProvider';
import { useToday } from '@/features/shared/useToday';
import { Button, Card, Pressable, Row, Stack, Text, TextField } from '@/ui/primitives';
import { duration, stagger } from '@/ui/motion';
import { useTheme } from '@/ui/theme';
import { LINK_HIT_SLOP, hitSlopFor } from '@/ui/touch';

/**
 * O3 paso 5 · Gastos fijos: "sugerencias tildables".
 *
 * §13 da la lista: alquiler, expensas, servicios, internet, celular, gimnasio,
 * streaming, prepaga. Servicios va abierto en Luz, Gas y Agua, porque cada uno
 * llega en su factura y con su monto (12/10). Lo que no está en la lista se
 * carga como "Otro fijo", con su nombre.
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

export default function Fijos() {
  const theme = useTheme();
  const router = useRouter();
  const today = useToday();
  const feedback = useFeedback();
  const { facts } = usePersonalFacts();
  const createRecurrences = useCreateRecurrences();
  const { session } = useSession();
  // UX-22 · Pagados contestado ya no tiene gastos pendientes; si se pasó por ese
  // paso, `pagados` viene en la ruta y el total lo cuenta.
  const { pagados } = useLocalSearchParams<{ pagados?: string }>();
  const progress = onboardingProgress('fijos', {
    hasCards: onboardingBranches(facts, today).hasCards,
    hasPaidByMe: pagados === '1',
  });

  const [drafts, setDrafts] = useState<Partial<Record<string, FixedDraft>>>({});
  const [editing, setEditing] = useState<string | null>(null);
  // §11 paso 3 · la sugerencia que está preguntando "¿Es otro alquiler?".
  const [confirming, setConfirming] = useState<string | null>(null);
  const [customs, setCustoms] = useState<CustomFixed[]>([]);
  const keys = useRef(0);
  const [saving, setSaving] = useState(false);

  const inSpaces = useMemo(() => alreadyInSpaces(facts.spaces, today).fixed, [facts.spaces, today]);
  const matchesFor = (suggestion: Suggestion) =>
    inSpaces.filter((item) => matchesSuggestion(item, suggestion));
  // Los fijos compartidos que no son de ninguna sugerencia también se muestran (CA-09).
  const others = inSpaces.filter(
    (item) => !SUGGESTIONS.some((suggestion) => matchesSuggestion(item, suggestion)),
  );

  const toSave = fixedToSave(drafts, customs);

  function select(key: string) {
    setConfirming(null);
    setEditing(key);
    setDrafts((previous) => ({ ...previous, [key]: { amount: 0, dayOfMonth: 1 } }));
  }

  function toggle(suggestion: Suggestion) {
    const { key } = suggestion;
    if (drafts[key] != null) {
      setDrafts((previous) => {
        const next = { ...previous };
        delete next[key];
        return next;
      });
      if (editing === key) setEditing(null);
      return;
    }
    if (matchesFor(suggestion).length > 0) {
      setConfirming(confirming === key ? null : key);
      return;
    }
    select(key);
  }

  function update(key: string, patch: Partial<FixedDraft>) {
    setDrafts((previous) => ({
      ...previous,
      [key]: { ...(previous[key] ?? { amount: 0, dayOfMonth: 1 }), ...patch },
    }));
  }

  function addCustom() {
    keys.current += 1;
    setCustoms((previous) => [
      ...previous,
      { key: String(keys.current), name: '', category: 'otros', amount: 0, dayOfMonth: 1 },
    ]);
  }
  function updateCustom(key: string, patch: Partial<CustomFixed>) {
    setCustoms((previous) =>
      previous.map((custom) => (custom.key === key ? { ...custom, ...patch } : custom)),
    );
  }
  function removeCustom(key: string) {
    setCustoms((previous) => previous.filter((custom) => custom.key !== key));
  }

  async function save() {
    setSaving(true);
    try {
      // H-16 · todos en una escritura (entran todos o ninguno) y cada uno con
      // el id de su borrador: reintentar, o volver y continuar, no duplica.
      await createRecurrences.mutateAsync(
        toSave.map((fixed) => ({
          id: draftId(`${session?.user.id ?? ''}:onboarding-fijos`, fixed.key),
          kind: 'expense' as const,
          amount: fixed.amount,
          category: fixed.category,
          description: fixed.description,
          dayOfMonth: fixed.dayOfMonth,
          startMonth: monthOf(today),
          endMonth: null,
          paymentMethodId: null,
        })),
      );
      router.replace('/onboarding/listo');
    } catch (cause) {
      feedback.error('No pudimos guardar tus fijos', cause);
    } finally {
      // Éxito o falla, el botón se libera: si la pantalla queda en el stack, no
      // puede quedar cargando para siempre.
      setSaving(false);
    }
  }

  return (
    <StepShell
      step={progress.step}
      total={progress.total}
      title="¿Qué pagás todos los meses?"
      description="Los fijos son la mitad de tu Futuro: una vez cargados, se repiten solos."
      help="Tildá los que tengas y poné el monto. Los que falten los agregás después."
      saving={saving}
      onContinue={() => void save()}
      onSkip={() => router.replace('/onboarding/listo')}
      continueLabel={toSave.length > 0 ? `Guardar ${toSave.length}` : 'Continuar'}
      continueDisabled={false}
    >
      <Stack gap="3">
        {SUGGESTIONS.map((suggestion, index) => {
          const draft = drafts[suggestion.key];
          const selected = draft != null;
          const Icon = categoryMeta(suggestion.category).icon;
          const isEditing = editing === suggestion.key;
          const matches = matchesFor(suggestion);

          return (
            <Animated.View
              key={suggestion.key}
              layout={LinearTransition}
              entering={FadeInDown.delay(stagger(index, 50)).duration(duration.base)}
            >
              <Pressable
                onPress={() => toggle(suggestion)}
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
                      onPress={() => setEditing(suggestion.key)}
                      haptic="none"
                      scaleOnPress={false}
                      accessibilityRole="button"
                      accessibilityHint="Cambiar el monto"
                      hitSlop={LINK_HIT_SLOP}
                    >
                      <Text variant="smallMedium" tone="brand" tabular>
                        {formatPesos(draft.amount)}
                      </Text>
                    </Pressable>
                  )}
                </Row>
              </Pressable>

              {confirming === suggestion.key && (
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
                          onPress={() => select(suggestion.key)}
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
                          onChange={(amount) => update(suggestion.key, { amount })}
                        />
                      </View>

                      <Field label="¿Qué día lo pagás?">
                        <DayPicker
                          value={draft.dayOfMonth}
                          onChange={(day) => update(suggestion.key, { dayOfMonth: day ?? 1 })}
                        />
                      </Field>
                    </Stack>
                  </Card>
                </Animated.View>
              )}
            </Animated.View>
          );
        })}

        {customs.map((custom) => (
          <Animated.View
            key={custom.key}
            layout={LinearTransition}
            entering={FadeInDown.duration(duration.base)}
          >
            <CustomFixedForm
              custom={custom}
              onChange={(patch) => updateCustom(custom.key, patch)}
              onRemove={() => removeCustom(custom.key)}
            />
          </Animated.View>
        ))}

        {/* Lo que no está en la lista: monotributo, telepase, la cuota del club… */}
        <Button
          label="Otro fijo"
          variant="ghost"
          icon={<Plus size={16} color={theme.colors.brand} />}
          onPress={addCustom}
        />

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
                      <Text variant="bodyMedium">
                        {item.description ?? categoryLabel(item.category)}
                      </Text>
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

/** "Otro fijo": nombre propio, una categoría de la lista fija (P13), monto y día. */
function CustomFixedForm({
  custom,
  onChange,
  onRemove,
}: {
  custom: CustomFixed;
  onChange: (patch: Partial<CustomFixed>) => void;
  onRemove: () => void;
}) {
  const theme = useTheme();

  return (
    <Card tone="sunken">
      <Stack gap="5">
        <Row justify="space-between" align="center">
          <Text variant="smallMedium">Otro fijo</Text>
          <Pressable
            onPress={onRemove}
            haptic="none"
            accessibilityRole="button"
            accessibilityLabel="Quitar este fijo"
            hitSlop={hitSlopFor(18, 18)}
          >
            <X size={18} color={theme.colors.textSecondary} />
          </Pressable>
        </Row>

        <Field label="¿Cómo se llama?">
          <TextField
            value={custom.name}
            onChangeText={(name) => onChange({ name })}
            placeholder="Monotributo, telepase, club…"
            maxLength={140}
            autoFocus
            accessibilityLabel="Nombre del fijo"
          />
        </Field>

        <Field label="¿De qué es?">
          <CategoryGrid
            categories={EXPENSE_CATEGORIES}
            value={custom.category}
            onChange={(category) => onChange({ category })}
          />
        </Field>

        <Field label="¿Cuánto es por mes?">
          <View>
            <AmountInput
              value={custom.amount}
              onChange={(amount) => onChange({ amount })}
              autoFocus={false}
            />
          </View>
        </Field>

        <Field label="¿Qué día lo pagás?">
          <DayPicker
            value={custom.dayOfMonth}
            onChange={(day) => onChange({ dayOfMonth: day ?? 1 })}
          />
        </Field>
      </Stack>
    </Card>
  );
}
