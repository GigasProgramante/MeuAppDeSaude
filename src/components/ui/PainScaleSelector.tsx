import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, layout, radii, spacing, typography } from '../../theme/tokens';

interface PainScaleSelectorProps {
  value: number | null;
  onChange: (nivel: number) => void;
}

const PAIN_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export function getPainBand(nivel: number): {
  label: string;
  color: string;
  bg: string;
  border: string;
} {
  if (nivel <= 3) {
    return {
      label: nivel === 0 ? 'Sem dor (0)' : `Dor leve (${nivel}/10)`,
      color: colors.semantic.success,
      bg: colors.semantic.successBg,
      border: colors.semantic.successBorder,
    };
  }
  if (nivel <= 6) {
    return {
      label: `Dor moderada (${nivel}/10)`,
      color: colors.semantic.warning,
      bg: colors.semantic.warningBg,
      border: colors.semantic.warningBorder,
    };
  }
  return {
    label: `Dor intensa (${nivel}/10)`,
    color: colors.semantic.danger,
    bg: colors.semantic.dangerBg,
    border: colors.semantic.dangerBorder,
  };
}

export function PainScaleSelector({ value, onChange }: PainScaleSelectorProps) {
  const activeBand = value !== null ? getPainBand(value) : null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>Intensidade da dor (0 a 10)</Text>
        {activeBand ? (
          <View
            style={[
              styles.bandBadge,
              { backgroundColor: activeBand.bg, borderColor: activeBand.border },
            ]}
          >
            <Text style={[styles.bandText, { color: activeBand.color }]}>{activeBand.label}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.grid} accessibilityRole="radiogroup" accessibilityLabel="Escala de dor de 0 a 10">
        {PAIN_LEVELS.map((nivel) => {
          const selected = value === nivel;
          const band = getPainBand(nivel);
          return (
            <TouchableOpacity
              key={nivel}
              style={[
                styles.cell,
                {
                  backgroundColor: selected ? band.color : band.bg,
                  borderColor: selected ? band.color : band.border,
                },
              ]}
              onPress={() => onChange(nivel)}
              activeOpacity={0.75}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`Dor nível ${nivel}`}
            >
              <Text style={[styles.cellText, { color: selected ? colors.text.inverse : band.color }]}>
                {nivel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.legendRow}>
        <Text style={[styles.legendText, { color: colors.semantic.success }]}>0–3 Leve</Text>
        <Text style={[styles.legendText, { color: colors.semantic.warning }]}>4–6 Moderada</Text>
        <Text style={[styles.legendText, { color: colors.semantic.danger }]}>7–10 Intensa</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.lg,
  },
  headerRow: {
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
  bandBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  bandText: {
    fontSize: 13,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cell: {
    minWidth: layout.minTouchTarget,
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 17,
    fontWeight: '800',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  legendText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
