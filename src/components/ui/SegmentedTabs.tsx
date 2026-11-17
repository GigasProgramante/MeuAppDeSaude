import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, layout, radii, shadows, spacing } from '../../theme/tokens';

export interface SegmentedTabItem<T extends string> {
  key: T;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface SegmentedTabsProps<T extends string> {
  tabs: ReadonlyArray<SegmentedTabItem<T>>;
  activeKey: T;
  onChange: (key: T) => void;
}

export function SegmentedTabs<T extends string>({
  tabs,
  activeKey,
  onChange,
}: SegmentedTabsProps<T>) {
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, active && styles.tabActive]}
            onPress={() => onChange(tab.key)}
            activeOpacity={0.8}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            {tab.icon ? (
              <Ionicons
                name={tab.icon}
                size={18}
                color={active ? colors.brand.primary : colors.text.secondary}
              />
            ) : null}
            <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.surface.subtle,
    borderRadius: radii.md,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  tab: {
    flex: 1,
    minHeight: layout.minTouchTarget,
    borderRadius: radii.sm + 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabActive: {
    backgroundColor: colors.surface.card,
    ...shadows.card,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.secondary,
    textAlign: 'center',
  },
  tabTextActive: {
    color: colors.brand.primary,
  },
});
