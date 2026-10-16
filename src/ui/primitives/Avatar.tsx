import { View } from 'react-native';
import { useTheme } from '../theme';
import { Text } from './Text';

/**
 * Una persona es un círculo con su inicial: nunca foto ni email (K7).
 * Vos en teal (`shared`), el otro en índigo (`committed`); si todavía no entró,
 * el círculo es punteado y sin relleno.
 */
export function Avatar({
  initial,
  tone,
  dashed = false,
  size = 36,
  testID,
}: {
  initial: string;
  tone: 'me' | 'other';
  dashed?: boolean;
  size?: number;
  testID?: string;
}) {
  const theme = useTheme();
  const fill = tone === 'me' ? theme.colors.shared : theme.colors.committed;

  return (
    <View
      testID={testID}
      accessible={false}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: dashed ? 'transparent' : fill,
        borderWidth: dashed ? 2 : 0,
        borderStyle: dashed ? 'dashed' : 'solid',
        borderColor: theme.colors.textMuted,
      }}
    >
      <Text variant={size >= 32 ? 'smallMedium' : 'caption'} tone={dashed ? 'muted' : 'onBrand'}>
        {initial}
      </Text>
    </View>
  );
}
