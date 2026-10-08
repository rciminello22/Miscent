import type { ReactNode } from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { Text } from './Text';

/* ────────────────────────────────────────────────────────────────────────── */

export function Screen({
  children,
  scroll = true,
  style,
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const padding = {
    paddingTop: insets.top + theme.space['3'],
    paddingBottom: insets.bottom + theme.space['9'],
    paddingHorizontal: theme.space['5'],
  };

  if (!scroll) {
    return (
      <View style={[{ flex: 1, backgroundColor: theme.colors.background }, padding, style]}>
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      style={[{ flex: 1, backgroundColor: theme.colors.background }, style]}
      contentContainerStyle={[padding, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

type SpaceKey = keyof ReturnType<typeof useTheme>['space'];

export function Stack({
  children,
  gap = '4',
  style,
}: {
  children: ReactNode;
  gap?: SpaceKey;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return <View style={[{ gap: theme.space[gap] }, style]}>{children}</View>;
}

export function Row({
  children,
  gap = '2',
  align = 'center',
  justify = 'flex-start',
  style,
}: {
  children: ReactNode;
  gap?: SpaceKey;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        { flexDirection: 'row', gap: theme.space[gap], alignItems: align, justifyContent: justify },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Spacer({ size = '4' }: { size?: SpaceKey }) {
  const theme = useTheme();
  return <View style={{ height: theme.space[size] }} />;
}

/* ────────────────────────────────────────────────────────────────────────── */

export function Card({
  children,
  style,
  tone = 'surface',
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'surface' | 'sunken' | 'brand' | 'shared';
}) {
  const theme = useTheme();

  const backgroundColor = {
    surface: theme.colors.surface,
    sunken: theme.colors.surfaceSunken,
    brand: theme.colors.brandSoft,
    shared: theme.colors.sharedSoft,
  }[tone];

  return (
    <View
      style={[
        {
          backgroundColor,
          borderRadius: theme.radius.lg,
          padding: theme.space['5'],
          borderWidth: tone === 'surface' ? 1 : 0,
          borderColor: theme.colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

/** §15 · "PRÓXIMOS PAGOS ... Ver todos" */
export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <Row justify="space-between" align="baseline">
      <Text variant="overline" tone="muted">
        {title}
      </Text>
      {action}
    </Row>
  );
}

export function Divider() {
  const theme = useTheme();
  return <View style={{ height: 1, backgroundColor: theme.colors.border }} />;
}
