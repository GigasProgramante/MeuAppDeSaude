import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, layout, radii, spacing } from '../../theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

interface AppButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  compact = false,
  style,
  accessibilityLabel,
}: AppButtonProps) {
  const isDisabled = disabled || loading;

  const palette = {
    primary: {
      bg: colors.brand.primary,
      border: colors.brand.primary,
      text: colors.text.inverse,
    },
    secondary: {
      bg: colors.brand.primarySoft,
      border: colors.brand.primarySoft,
      text: colors.brand.primary,
    },
    outline: {
      bg: colors.surface.card,
      border: colors.brand.primary,
      text: colors.brand.primary,
    },
    ghost: {
      bg: 'transparent',
      border: 'transparent',
      text: colors.brand.primary,
    },
    danger: {
      bg: colors.semantic.danger,
      border: colors.semantic.danger,
      text: colors.text.inverse,
    },
  }[variant];

  return (
    <TouchableOpacity
      style={[
        styles.button,
        compact && styles.compact,
        {
          backgroundColor: isDisabled && variant === 'primary' ? '#CBD5E1' : palette.bg,
          borderColor: isDisabled && variant === 'primary' ? '#CBD5E1' : palette.border,
          borderWidth: variant === 'outline' ? 1.5 : 1,
        },
        isDisabled && variant !== 'primary' && { opacity: 0.55 },
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: isDisabled }}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <>
          {icon ? (
            <Ionicons
              name={icon}
              size={20}
              color={isDisabled && variant === 'primary' ? colors.text.secondary : palette.text}
            />
          ) : null}
          <Text
            style={[
              styles.text,
              compact && styles.compactText,
              {
                color: isDisabled && variant === 'primary' ? colors.text.secondary : palette.text,
              },
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: layout.minButtonHeight,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  compact: {
    minHeight: layout.minTouchTarget,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  compactText: {
    fontSize: 15,
  },
});
