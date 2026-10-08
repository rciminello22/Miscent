import { User, Users } from 'lucide-react-native';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { Text } from './Text';

/**
 * Indicador de audiencia. §12 · PR-03: **toda pantalla y todo formulario
 * muestran su audiencia.** No es un adorno ni una ayuda opcional.
 *
 * El ícono de una o dos personas aparece además en cada fila de las listas
 * mixtas (§12), para que no haya que leer para saber quién ve qué.
 */

export type Audience =
  | { kind: 'private' }
  | { kind: 'shared'; otherMemberName: string; spaceName?: string };

export function audienceLabel(audience: Audience): string {
  // Los textos son los de §33, literales.
  return audience.kind === 'private'
    ? 'Solo vos'
    : `Lo ven vos y ${audience.otherMemberName}`;
}

export function AudienceBadge({
  audience,
  style,
}: {
  audience: Audience;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const isPrivate = audience.kind === 'private';
  const Icon = isPrivate ? User : Users;

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
      accessibilityLabel={audienceLabel(audience)}
    >
      <Icon size={12} color={isPrivate ? theme.colors.textMuted : theme.colors.shared} />
      <Text variant="caption" tone={isPrivate ? 'muted' : 'shared'}>
        {audienceLabel(audience)}
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
