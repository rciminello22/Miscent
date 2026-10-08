import * as Haptics from 'expo-haptics';
import {
  Pressable as RNPressable,
  type PressableProps as RNPressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { pressScale, spring } from '../motion';

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

export type PressableProps = Omit<RNPressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** Un toque físico al confirmar. `none` para lo que se toca muy seguido. */
  haptic?: 'light' | 'success' | 'none';
  /** Desactiva el hundido para elementos grandes, donde el escalado se ve raro. */
  scaleOnPress?: boolean;
};

/**
 * Lo que se toca, responde.
 *
 * El hundido es de 2,5% y tarda lo que tarda un resorte: se SIENTE, no se
 * mira. Es la diferencia entre una app que parece viva y una que parece una
 * página web.
 */
export function Pressable({
  style,
  haptic = 'light',
  scaleOnPress = true,
  onPressIn,
  onPressOut,
  onPress,
  ...rest
}: PressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(event) => {
        if (scaleOnPress) scale.value = spring(pressScale);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        if (scaleOnPress) scale.value = spring(1);
        onPressOut?.(event);
      }}
      onPress={(event) => {
        if (haptic === 'light') {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else if (haptic === 'success') {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        onPress?.(event);
      }}
      style={[style, animatedStyle]}
    />
  );
}
