import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radii, shadows, spacing } from '../../theme/tokens';

type CardVariant = 'default' | 'elevated' | 'outlined' | 'alert';
type AlertTone = 'info' | 'success' | 'warning' | 'danger';

interface AppCardProps {
  variant?: CardVariant;
  tone?: AlertTone;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function AppCard({ variant = 'default', tone = 'info', style, children }: AppCardProps) {
  const toneColors = {
    info: { bg: colors.semantic.infoBg, border: colors.semantic.infoBorder },
    success: { bg: colors.semantic.successBg, border: colors.semantic.successBorder },
    warning: { bg: colors.semantic.warningBg, border: colors.semantic.warningBorder },
    danger: { bg: colors.semantic.dangerBg, border: colors.semantic.dangerBorder },
  }[tone];

  return (
    <View
      style={[
        styles.base,
        variant === 'default' && styles.defaultCard,
        variant === 'elevated' && styles.elevatedCard,
        variant === 'outlined' && styles.outlinedCard,
        variant === 'alert' && {
          backgroundColor: toneColors.bg,
          borderColor: toneColors.border,
          borderWidth: 1.5,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  defaultCard: {
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    ...shadows.card,
  },
  elevatedCard: {
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    ...shadows.modal,
  },
  outlinedCard: {
    backgroundColor: colors.surface.card,
    borderWidth: 1.5,
    borderColor: colors.border.strong,
  },
});
