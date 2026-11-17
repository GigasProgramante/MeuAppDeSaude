import { StyleSheet } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme/tokens';

export const styles = StyleSheet.create({
  sectionCardGap: {
    gap: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  sectionSub: {
    ...typography.bodyCompact,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  moodCard: {
    flexGrow: 1,
    flexBasis: 130,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.subtle,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
  },
  moodIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodLabel: {
    ...typography.label,
    color: colors.text.primary,
  },
  counterText: {
    ...typography.caption,
    color: colors.text.muted,
    textAlign: 'right',
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  screeningRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  screeningCol: {
    flex: 1,
    minWidth: 220,
  },
  screeningTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  screeningDesc: {
    ...typography.bodyCompact,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  historyList: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.surface.subtle,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.md,
  },
  historyIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text.primary,
  },
  historyDate: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: 2,
  },
  historyDetail: {
    ...typography.bodyCompact,
    color: colors.text.secondary,
    marginTop: 4,
  },
  historyNote: {
    ...typography.bodyCompact,
    color: colors.text.primary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  progressTrack: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.border.default,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.areas.psicologia.color,
  },
  stepCounter: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.areas.psicologia.color,
    marginBottom: spacing.xs,
  },
  questionPrompt: {
    ...typography.bodyCompact,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  questionText: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  optionButton: {
    borderWidth: 1.5,
    borderColor: colors.border.default,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface.subtle,
    marginBottom: spacing.sm,
    minHeight: 48,
    justifyContent: 'center',
  },
  optionButtonSelected: {
    borderColor: colors.areas.psicologia.color,
    backgroundColor: colors.areas.psicologia.bg,
  },
  optionText: {
    ...typography.bodyCompact,
    color: colors.text.primary,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: colors.areas.psicologia.color,
    fontWeight: '700',
  },
  resultBox: {
    borderRadius: radii.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  resultScore: {
    ...typography.display,
  },
  resultClass: {
    ...typography.h3,
    textAlign: 'center',
    marginTop: 4,
  },
  resultOrientation: {
    ...typography.bodyCompact,
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  resultDisclaimer: {
    ...typography.caption,
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
