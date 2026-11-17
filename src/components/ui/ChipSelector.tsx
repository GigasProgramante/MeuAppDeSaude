import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, layout, radii, spacing, typography } from '../../theme/tokens';

export interface ChipOption<T extends string = string> {
  value: T;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface ChipSelectorProps<T extends string> {
  label?: string;
  options: ReadonlyArray<ChipOption<T> | T>;
  selected: T | T[] | null | undefined;
  multiple?: boolean;
  onSelect: (value: T) => void;
  accentColor?: string;
  accentBg?: string;
}

export function ChipSelector<T extends string>({
  label,
  options,
  selected,
  multiple = false,
  onSelect,
  accentColor = colors.brand.primary,
  accentBg = colors.brand.primarySoft,
}: ChipSelectorProps<T>) {
  const isSelected = (val: T) =>
    Array.isArray(selected) ? selected.includes(val) : selected === val;

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={styles.row}
        accessibilityRole={multiple ? 'none' : 'radiogroup'}
        accessibilityLabel={label}
      >
        {options.map((opt) => {
          const item: ChipOption<T> =
            typeof opt === 'string' ? { value: opt, label: opt } : opt;
          const active = isSelected(item.value);

          return (
            <TouchableOpacity
              key={item.value}
              style={[
                styles.chip,
                active && { backgroundColor: accentBg, borderColor: accentColor },
              ]}
              onPress={() => onSelect(item.value)}
              activeOpacity={0.75}
              accessibilityRole={multiple ? 'checkbox' : 'radio'}
              accessibilityState={multiple ? { checked: active } : { selected: active }}
              accessibilityLabel={item.label}
            >
              {item.icon ? (
                <Ionicons
                  name={item.icon}
                  size={17}
                  color={active ? accentColor : colors.text.secondary}
                />
              ) : active ? (
                <Ionicons name="checkmark-circle" size={17} color={accentColor} />
              ) : null}
              <Text style={[styles.chipText, active && { color: accentColor, fontWeight: '700' }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.subtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  chipText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.secondary,
  },
});
