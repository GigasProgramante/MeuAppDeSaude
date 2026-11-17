import { StyleSheet } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme/tokens';

export const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
  editingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  editingText: {
    ...typography.bodyCompact,
    color: colors.text.primary,
    fontWeight: '600',
    flex: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
  },
  sectionSub: {
    ...typography.bodyCompact,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  formDivider: {
    height: 1,
    backgroundColor: colors.border.default,
    marginVertical: spacing.md,
  },
  progressTrack: {
    height: 10,
    backgroundColor: colors.surface.subtle,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.semantic.success,
    borderRadius: radii.pill,
  },
  checklistItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.subtle,
    marginBottom: spacing.sm,
  },
  checklistItemChecked: {
    borderColor: colors.semantic.successBorder,
    backgroundColor: colors.semantic.successBg,
  },
  checklistTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text.primary,
  },
  checklistTitleChecked: {
    color: colors.semantic.success,
  },
  checklistDesc: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  metricTabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  metricTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.subtle,
    minHeight: 36,
    justifyContent: 'center',
  },
  metricTabActive: {
    backgroundColor: colors.areas.enfermagem.color,
    borderColor: colors.areas.enfermagem.color,
  },
  metricTabText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  metricTabTextActive: {
    color: colors.text.inverse,
  },
  historyList: {
    gap: spacing.sm,
  },
  historyCard: {
    backgroundColor: colors.surface.subtle,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  historyCardEditing: {
    borderColor: colors.semantic.warning,
    backgroundColor: colors.semantic.warningBg,
  },
  historyDateBox: {
    minWidth: 56,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.sm,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  historyTime: {
    ...typography.label,
    color: colors.text.primary,
  },
  historyDate: {
    ...typography.caption,
    color: colors.text.muted,
  },
  historyValuesWrap: {
    flex: 1,
    gap: 4,
  },
  valueLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  valueText: {
    ...typography.bodyCompact,
    fontWeight: '600',
    color: colors.text.primary,
  },
  historyActionsCol: {
    gap: spacing.xs,
  },
  iconActionBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
