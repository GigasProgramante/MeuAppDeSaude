import { StyleSheet } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme/tokens';

export const styles = StyleSheet.create({
  logoHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logo: {
    width: 72,
    height: 72,
    resizeMode: 'contain',
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
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    minHeight: 44,
    paddingVertical: spacing.xs,
  },
  termsText: {
    ...typography.bodyCompact,
    color: colors.text.primary,
    flex: 1,
  },
  termsLink: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  termsLinkText: {
    ...typography.label,
    color: colors.brand.primary,
  },
  loginPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
    minHeight: 40,
  },
  loginMuted: {
    ...typography.bodyCompact,
    color: colors.text.secondary,
  },
  loginLink: {
    ...typography.bodyCompact,
    fontWeight: '700',
    color: colors.brand.primary,
  },
  disclaimer: {
    ...typography.caption,
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 18,
  },
  modalParagraph: {
    ...typography.bodyCompact,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    lineHeight: 21,
  },
});
