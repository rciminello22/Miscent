import type { ReactNode } from 'react';
import { Modal, Pressable as RNPressable, View } from 'react-native';
import { X } from 'lucide-react-native';
import Animated, { FadeIn, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { duration } from '../motion';
import { useTheme } from '../theme';
import { IconButton } from './IconButton';
import { Row } from './layout';
import { Text } from './Text';

/**
 * Hoja inferior.
 *
 * Es un Modal nativo y no una librería de bottom sheets porque lo único que
 * necesitamos es que suba, se lea y se cierre: no hay gestos de arrastre ni
 * puntos de anclaje. Una dependencia más para eso no se paga.
 *
 * El fondo se puede tocar para cerrar, que es lo que la gente intenta primero.
 */
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        entering={FadeIn.duration(duration.quick)}
        style={{ flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' }}
      >
        <RNPressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Cerrar" />

        <Animated.View
          entering={SlideInDown.duration(duration.base)}
          exiting={SlideOutDown.duration(duration.quick)}
          style={{
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: theme.radius.xl,
            borderTopRightRadius: theme.radius.xl,
            paddingTop: theme.space['5'],
            paddingBottom: insets.bottom + theme.space['6'],
            paddingHorizontal: theme.space['5'],
            gap: theme.space['5'],
            maxHeight: '85%',
          }}
        >
          <Row justify="space-between" align="center">
            <Text variant="heading" style={{ flex: 1 }}>
              {title}
            </Text>
            {/* UX-12 · el dibujo mide 32; el área de toque llega a 44. */}
            <IconButton
              label="Cerrar"
              size={32}
              onPress={onClose}
              icon={<X size={16} color={theme.colors.textSecondary} />}
            />
          </Row>

          <View>{children}</View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
