import { View } from 'react-native';
import { Moon, Sun, SunMoon, type LucideIcon } from 'lucide-react-native';
import {
  APPEARANCE_OPTIONS,
  appearanceHelp,
  type AppearancePreference,
} from '@/ui/appearance';
import { useAppearance } from '@/ui/appearanceStore';
import { Card, Pressable, Row, Stack, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';

/** Automático combina el sol y la luna; Claro y Oscuro, cada uno el suyo. */
const OPTION_ICON: Record<AppearancePreference, LucideIcon> = {
  auto: SunMoon,
  light: Sun,
  dark: Moon,
};

/**
 * Apariencia (Perfil · 10B): una fila con la elección actual y un control de
 * tres opciones. Cada opción lleva su ícono y lo elegido se distingue por el
 * fondo y el borde, no solo por el color.
 *
 * Presentacional: `AppearanceSection` la conecta al tema.
 */
export function AppearanceControl({
  value,
  onChange,
}: {
  value: AppearancePreference;
  onChange: (next: AppearancePreference) => void;
}) {
  const theme = useTheme();
  const CurrentIcon = OPTION_ICON[value];

  return (
    <Card>
      <Stack gap="4">
        <Row gap="3" align="center">
          <CurrentIcon size={18} color={theme.colors.brand} />
          <Stack gap="1" style={{ flex: 1 }}>
            <Text variant="bodyMedium">Apariencia</Text>
            <Text variant="small" tone="secondary">
              {appearanceHelp(value)}
            </Text>
          </Stack>
        </Row>

        <View
          accessibilityRole="radiogroup"
          style={{
            flexDirection: 'row',
            backgroundColor: theme.colors.surfaceSunken,
            borderRadius: theme.radius.md,
            padding: 3,
            gap: 2,
          }}
        >
          {APPEARANCE_OPTIONS.map((option) => {
            const selected = option.value === value;
            const color = selected ? theme.colors.text : theme.colors.textSecondary;
            const Icon = OPTION_ICON[option.value];
            return (
              <Pressable
                key={option.value}
                onPress={() => onChange(option.value)}
                haptic="none"
                scaleOnPress={false}
                accessibilityRole="radio"
                accessibilityLabel={option.label}
                accessibilityState={{ selected }}
                style={{
                  flex: 1,
                  minHeight: 44,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: theme.space['1'],
                  paddingHorizontal: theme.space['2'],
                  borderRadius: theme.radius.sm + 1,
                  borderWidth: 1,
                  borderColor: selected ? theme.colors.border : 'transparent',
                  backgroundColor: selected ? theme.colors.surface : 'transparent',
                }}
              >
                <Icon testID={`appearance-icon-${option.value}`} size={14} color={color} />
                <Text
                  variant={selected ? 'smallMedium' : 'small'}
                  numberOfLines={1}
                  style={{ color }}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Stack>
    </Card>
  );
}

/** La fila de Apariencia, conectada a la preferencia guardada. */
export function AppearanceSection() {
  const { preference, setPreference } = useAppearance();
  return <AppearanceControl value={preference} onChange={setPreference} />;
}
