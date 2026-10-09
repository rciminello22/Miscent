import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ClipboardPaste } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { parseInvitationToken } from '@/features/auth/invitationLink';
import { Button, Screen, Stack, Text } from '@/ui/primitives';
import { duration } from '@/ui/motion';
import { useTheme } from '@/ui/theme';

/**
 * O1 paso 1 · "Tengo una invitación" lleva a O2.
 *
 * O2 empieza por "Renzo te invitó a Casa", así que necesita la invitación.
 * Antes, este botón llevaba directo al email: la persona entraba sin token y
 * quedaba como invitada SIN espacios.
 *
 * Y es la salida cuando el enlace no se puede tocar. WhatsApp, Notas o Mail
 * solo vuelven tocable un http(s)://, y el enlace de la app no lo es: llega
 * como texto. Se copia, se pega acá, y sigue O2 igual que si lo hubiera
 * tocado.
 */
export default function TengoUnaInvitacion() {
  const theme = useTheme();
  const router = useRouter();

  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open(input: string) {
    const token = parseInvitationToken(input);
    if (token == null) {
      setError('Eso no parece un enlace de invitación. Copialo entero del mensaje que te mandaron.');
      return;
    }
    // Con params el router codifica una sola vez; armar el string a mano es
    // como se coló la doble codificación del enlace.
    router.push({ pathname: '/invite/[token]', params: { token } });
  }

  async function paste() {
    const clip = await Clipboard.getStringAsync();
    setText(clip);
    setError(null);
    if (parseInvitationToken(clip) != null) open(clip);
  }

  return (
    <Screen>
      <Stack gap="8">
        <Animated.View entering={FadeInDown.duration(duration.deliberate)}>
          <Stack gap="3">
            <Text variant="title">Pegá tu invitación</Text>
            <Text variant="body" tone="secondary">
              Copiá el enlace del mensaje que te mandaron y pegalo acá. Si copiaste el
              mensaje entero, también sirve.
            </Text>
          </Stack>
        </Animated.View>

        <Stack gap="3">
          <Button
            label="Pegar"
            variant="secondary"
            fullWidth
            icon={<ClipboardPaste size={16} color={theme.colors.text} />}
            onPress={() => void paste()}
          />

          <View
            style={{
              borderRadius: theme.radius.md,
              borderWidth: 1,
              borderColor: focused ? theme.colors.brand : theme.colors.border,
              backgroundColor: theme.colors.surface,
              paddingHorizontal: theme.space['4'],
              paddingVertical: theme.space['3'],
              minHeight: 54,
              justifyContent: 'center',
            }}
          >
            <TextInput
              value={text}
              onChangeText={(next) => {
                setText(next);
                setError(null);
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="radar://invite/…"
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              accessibilityLabel="Enlace de invitación"
              style={[theme.typography.body, { color: theme.colors.text }]}
            />
          </View>

          {error != null && (
            <Animated.View entering={FadeInDown.duration(duration.quick)}>
              <Text variant="small" tone="excess">
                {error}
              </Text>
            </Animated.View>
          )}
        </Stack>

        <Button
          label="Continuar"
          size="lg"
          fullWidth
          disabled={text.trim() === ''}
          onPress={() => open(text)}
        />
      </Stack>
    </Screen>
  );
}
