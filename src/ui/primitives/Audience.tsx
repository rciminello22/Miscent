import { User, Users } from 'lucide-react-native';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { Text } from './Text';
import { audienceLabel, type Audience } from './audienceCopy';

export { audienceLabel, type Audience };

/**
 * Indicador de audiencia. §12 · PR-03: **toda pantalla y todo formulario
 * muestran su audiencia.** No es un adorno ni una ayuda opcional.
 *
 * El ícono de una o dos personas aparece además en cada fila de las listas
 * mixtas (§12), para que no haya que leer para saber quién ve qué.
 */
export function AudienceBadge({
  audience,
  label: customLabel,
  style,
}: {
  audience: Audience;
  /** Otra redacción de la misma audiencia (ver `audienceSentence`). */
  label?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const isPrivate = audience.kind === 'private';
  const Icon = isPrivate ? User : Users;
  const label = customLabel ?? audienceLabel(audience);

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.space['1'],
          paddingVertical: theme.space['1'],
          paddingHorizontal: theme.space['2'],
          borderRadius: theme.radius.pill,
          backgroundColor: isPrivate ? theme.colors.surfaceSunken : theme.colors.sharedSoft,
        },
        style,
      ]}
      accessibilityLabel={label}
    >
      <Icon size={12} color={isPrivate ? theme.colors.textMuted : theme.colors.shared} />
      <Text variant="caption" tone={isPrivate ? 'muted' : 'shared'}>
        {label}
      </Text>
    </View>
  );
}

/** El ícono suelto, para las filas de las listas (§12). */
export function AudienceIcon({ audience, size = 14 }: { audience: Audience; size?: number }) {
  const theme = useTheme();
  const isPrivate = audience.kind === 'private';
  const Icon = isPrivate ? User : Users;

  return (
    <Icon
      size={size}
      color={isPrivate ? theme.colors.textMuted : theme.colors.shared}
      accessibilityLabel={audienceLabel(audience)}
    />
  );
}
