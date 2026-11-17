import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../../theme/tokens';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface StatusBadgeProps {
  label: string;
  tone?: BadgeTone;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function StatusBadge({ label, tone = 'neutral', icon }: StatusBadgeProps) {
  const palette = {
    success: {
      bg: colors.semantic.successBg,
      text: colors.semantic.success,
      border: colors.semantic.successBorder,
    },
    warning: {
      bg: colors.semantic.warningBg,
      text: colors.semantic.warning,
      border: colors.semantic.warningBorder,
    },
    danger: {
      bg: colors.semantic.dangerBg,
      text: colors.semantic.danger,
      border: colors.semantic.dangerBorder,
    },
    info: {
      bg: colors.semantic.infoBg,
      text: colors.semantic.info,
      border: colors.semantic.infoBorder,
    },
    neutral: {
      bg: colors.surface.subtle,
      text: colors.text.secondary,
      border: colors.border.default,
    },
  }[tone];

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: palette.bg, borderColor: palette.border },
      ]}
    >
      {icon ? <Ionicons name={icon} size={14} color={palette.text} /> : null}
      <Text style={[styles.text, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    gap: 5,
  },
  text: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
});
