import { StyleSheet } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '../../theme/tokens';

export const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: '#0F2942',
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    ...shadows.card,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  heroEyebrow: {
    ...typography.caption,
    color: '#93C5FD',
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  heroTitle: {
    ...typography.h1,
    color: colors.text.inverse,
    marginBottom: spacing.sm,
  },
  heroDescription: {
    ...typography.bodyCompact,
    color: '#E2E8F0',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  heroActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sectionHeading: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: 4,
  },
  sectionHint: {
    ...typography.bodyCompact,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  clinicHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  clinicTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: 4,
  },
  clinicSub: {
    ...typography.bodyCompact,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  clinicFooterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  phoneText: {
    ...typography.label,
    color: colors.semantic.success,
  },
  seeMoreText: {
    ...typography.label,
    color: colors.brand.primary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  courseCardWrap: {
    flexGrow: 1,
    flexBasis: 240,
  },
  courseIconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  courseTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: 4,
  },
  courseSub: {
    ...typography.bodyCompact,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  courseLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  courseLinkText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.brand.primary,
  },
  gpsCardWrap: {
    marginBottom: spacing.xl,
  },
  gpsStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  gpsStatusText: {
    ...typography.caption,
    color: colors.text.secondary,
    flex: 1,
  },
  campiStack: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  campusTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  campusName: {
    ...typography.h3,
    color: colors.text.primary,
    flex: 1,
  },
  campusAddress: {
    ...typography.bodyCompact,
    color: colors.text.secondary,
  },
  campusHighlight: {
    ...typography.caption,
    color: colors.semantic.success,
    fontWeight: '600',
    marginTop: 4,
  },
  campusActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  impactStack: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  impactEyebrow: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.semantic.success,
  },
  impactTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginTop: 2,
    marginBottom: 4,
  },
  bodyText: {
    ...typography.bodyCompact,
    color: colors.text.secondary,
    lineHeight: 21,
  },
  modalSectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  metaBlockRow: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  metaLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text.muted,
    marginBottom: 2,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  bulletText: {
    ...typography.bodyCompact,
    color: colors.text.primary,
    flex: 1,
    lineHeight: 20,
  },
  contactLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  contactValue: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text.primary,
  },
  mapFrameContainer: {
    height: 220,
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.default,
    marginVertical: spacing.md,
  },
});
