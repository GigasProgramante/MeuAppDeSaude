import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '../theme/tokens';

export interface ChartPoint {
  label: string;
  value: number;
  displayValue?: string;
  color?: string;
}

export interface ChartLegendItem {
  label: string;
  color: string;
}

interface BarChartCardProps {
  title: string;
  subtitle?: string;
  unit?: string;
  maxScale?: number;
  emptyMessage?: string;
  data: ChartPoint[];
  legend?: ChartLegendItem[];
  children?: React.ReactNode;
}

const CHART_BAR_AREA_HEIGHT = 132;

export function BarChartCard({
  title,
  subtitle,
  unit = '',
  maxScale,
  emptyMessage = 'Ainda não há dados suficientes para exibir o gráfico.',
  data,
  legend,
  children,
}: BarChartCardProps) {
  const safeData = data || [];
  const rawMax = safeData.reduce((acc, item) => Math.max(acc, item.value), 0);
  const scaleTop = maxScale && maxScale > 0 ? maxScale : Math.max(rawMax * 1.15, 1);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      {children}

      {safeData.length === 0 ? (
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      ) : (
        <View style={styles.chartWrapper}>
          <View style={styles.barsRow}>
            {safeData.map((point, idx) => {
              const ratio = Math.max(0, Math.min(1, point.value / scaleTop));
              const barHeight =
                point.value > 0 ? Math.max(10, Math.round(ratio * CHART_BAR_AREA_HEIGHT)) : 4;
              const barColor = point.color || colors.brand.primary;

              return (
                <View key={`${point.label}-${idx}`} style={styles.barColumn}>
                  <Text style={styles.valueLabel} numberOfLines={1}>
                    {point.displayValue ?? `${point.value}${unit}`}
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: barHeight,
                          backgroundColor: barColor,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.axisLabel} numberOfLines={2}>
                    {point.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {legend && legend.length > 0 && (
        <View style={styles.legendRow}>
          {legend.map((item) => (
            <View key={item.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={styles.legendText}>{item.label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: radii.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    ...shadows.card,
  },
  title: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodyCompact,
    marginBottom: spacing.md,
  },
  emptyText: {
    ...typography.bodyCompact,
    color: colors.text.muted,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  chartWrapper: {
    backgroundColor: colors.surface.canvas,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    gap: 6,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    minWidth: 28,
  },
  valueLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 6,
    textAlign: 'center',
  },
  barTrack: {
    height: CHART_BAR_AREA_HEIGHT,
    width: '72%',
    maxWidth: 36,
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.border.default,
  },
  barFill: {
    width: '100%',
    borderTopLeftRadius: radii.sm,
    borderTopRightRadius: radii.sm,
  },
  axisLabel: {
    marginTop: spacing.sm,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: colors.text.secondary,
    textAlign: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
    color: colors.text.secondary,
  },
});
