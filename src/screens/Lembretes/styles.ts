import { StyleSheet } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme/tokens';

export const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
  adherenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  adherenceTitleRow: {
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
    marginBottom: spacing.sm,
  },
  progressTrack: {
    height: 10,
    backgroundColor: colors.surface.subtle,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.areas.farmacia.color,
    borderRadius: radii.pill,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionFlex: {
    flex: 1,
    minWidth: 150,
  },
  listStack: {
    gap: spacing.md,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardMainRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.text.primary,
  },
  cardTitleDone: {
    textDecorationLine: 'line-through',
    color: colors.text.muted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  metaText: {
    ...typography.bodyCompact,
    color: colors.text.secondary,
  },
  notesText: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 4,
  },
  cardActionsCol: {
    gap: spacing.xs,
    alignItems: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDone: {
    backgroundColor: colors.semantic.successBg,
    borderColor: colors.semantic.successBorder,
  },
  medMetaBox: {
    backgroundColor: colors.surface.subtle,
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
    gap: 4,
  },
  medButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  discontinuedBlock: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  discontinuedHeading: {
    ...typography.label,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
