import { StyleSheet } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme/tokens';

export const styles = StyleSheet.create({
  sectionsStack: {
    gap: spacing.lg,
  },
  sectionHeader: {
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
  avatarArea: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatarFrame: {
    position: 'relative',
  },
  photo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: colors.brand.primary,
  },
  photoPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surface.subtle,
    borderWidth: 1,
    borderColor: colors.border.strong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface.card,
  },
  changePhotoText: {
    ...typography.label,
    color: colors.brand.primary,
    marginTop: spacing.xs,
  },
  buttonStack: {
    gap: spacing.sm,
  },
  modalText: {
    ...typography.bodyCompact,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    lineHeight: 21,
  },
  strengthRow: {
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
    gap: 4,
  },
  strengthBarTrack: {
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.border.default,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: radii.pill,
  },
  strengthLabel: {
    ...typography.caption,
    fontWeight: '700',
  },
  deleteWarningBox: {
    backgroundColor: colors.semantic.dangerBg,
    borderColor: colors.semantic.dangerBorder,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  deleteWarningText: {
    ...typography.bodyCompact,
    color: colors.semantic.danger,
    fontWeight: '600',
  },
  disclaimer: {
    ...typography.caption,
    color: colors.text.muted,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
});
