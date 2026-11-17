import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '../../theme/tokens';
import { AppButton } from './AppButton';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={28} color={colors.brand.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onAction ? (
        <View style={styles.ctaWrap}>
          <AppButton title={actionLabel} onPress={onAction} variant="secondary" compact />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.brand.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.bodyCompact,
    textAlign: 'center',
    maxWidth: 380,
  },
  ctaWrap: {
    marginTop: spacing.lg,
  },
});
