import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, layout, radii, spacing, typography } from '../../theme/tokens';
import { StatusBadge } from './StatusBadge';

interface StepperInputProps {
  label: string;
  value: string;
  onChangeText: (val: string) => void;
  min: number;
  max: number;
  step?: number;
  defaultStart?: number;
  unit?: string;
  placeholder?: string;
  decimal?: boolean;
  maxLength?: number;
  statusFeedback?: {
    tone: 'success' | 'warning' | 'danger' | 'info';
    label: string;
    detail?: string;
  } | null;
}

export function StepperInput({
  label,
  value,
  onChangeText,
  min,
  max,
  step = 1,
  defaultStart,
  unit,
  placeholder,
  decimal = false,
  maxLength = 4,
  statusFeedback,
}: StepperInputProps) {
  const [focused, setFocused] = useState(false);

  const adjust = (direction: -1 | 1) => {
    const clean = value.replace(',', '.');
    const parsed = decimal ? parseFloat(clean) : parseInt(clean, 10);
    const base = isNaN(parsed) ? (defaultStart ?? Math.round((min + max) / 2)) : parsed;
    const rawNext = Math.min(max, Math.max(min, base + direction * step));
    const formatted = decimal ? rawNext.toFixed(1) : String(Math.round(rawNext));
    onChangeText(formatted);
  };

  const handleBlurClamp = () => {
    setFocused(false);
    if (!value.trim()) return;
    const clean = value.replace(',', '.');
    const parsed = decimal ? parseFloat(clean) : parseInt(clean, 10);
    if (!isNaN(parsed) && parsed < min) {
      onChangeText(decimal ? min.toFixed(1) : String(min));
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {statusFeedback ? (
          <StatusBadge label={statusFeedback.label} tone={statusFeedback.tone} />
        ) : null}
      </View>

      <View
        style={[
          styles.row,
          { borderColor: focused ? colors.brand.primary : colors.border.strong },
        ]}
      >
        <TouchableOpacity
          style={styles.stepBtn}
          onPress={() => adjust(-1)}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={`Diminuir ${label}`}
        >
          <Ionicons name="remove" size={22} color={colors.brand.primary} />
        </TouchableOpacity>

        <View style={styles.inputCenter}>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.text.muted}
            keyboardType={decimal ? 'decimal-pad' : 'numeric'}
            maxLength={maxLength}
            onFocus={() => setFocused(true)}
            onBlur={handleBlurClamp}
            accessibilityLabel={label}
          />
          {unit ? <Text style={styles.unit}>{unit}</Text> : null}
        </View>

        <TouchableOpacity
          style={styles.stepBtn}
          onPress={() => adjust(1)}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={`Aumentar ${label}`}
        >
          <Ionicons name="add" size={22} color={colors.brand.primary} />
        </TouchableOpacity>
      </View>

      {statusFeedback?.detail ? (
        <Text
          style={[
            styles.detailText,
            {
              color:
                statusFeedback.tone === 'danger'
                  ? colors.semantic.danger
                  : statusFeedback.tone === 'warning'
                    ? colors.semantic.warning
                    : statusFeedback.tone === 'success'
                      ? colors.semantic.success
                      : colors.semantic.info,
            },
          ]}
        >
          {statusFeedback.detail}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.lg,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.label,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.card,
    borderWidth: 1.5,
    borderRadius: radii.md,
    minHeight: 52,
    overflow: 'hidden',
  },
  stepBtn: {
    width: 52,
    height: 52,
    minWidth: layout.minTouchTarget,
    minHeight: layout.minTouchTarget,
    backgroundColor: colors.surface.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  input: {
    minWidth: 56,
    textAlign: 'center',
    fontSize: 19,
    fontWeight: '700',
    color: colors.text.primary,
    paddingVertical: spacing.sm,
  },
  unit: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.muted,
    marginLeft: 4,
  },
  detailText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: spacing.xs,
    lineHeight: 18,
  },
});
