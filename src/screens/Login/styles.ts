import { StyleSheet } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme/tokens';

export const styles = StyleSheet.create({
  heroBox: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingTop: spacing.sm,
  },
  logo: {
    width: 92,
    height: 92,
    resizeMode: 'contain',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h1,
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  subtitle: {
    ...typography.bodyCompact,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: -spacing.xs,
    marginBottom: spacing.md,
    minHeight: 36,
    justifyContent: 'center',
  },
  forgotText: {
    ...typography.label,
    color: colors.brand.primary,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
    gap: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.default,
  },
  dividerLabel: {
    ...typography.caption,
    color: colors.text.muted,
    fontWeight: '600',
  },
  buttonStack: {
    gap: spacing.sm,
  },
  guestHintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.surface.subtle,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  guestHintText: {
    ...typography.caption,
    color: colors.text.secondary,
    flex: 1,
  },
  registerPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
    minHeight: 40,
  },
  registerMuted: {
    ...typography.bodyCompact,
    color: colors.text.secondary,
  },
  registerLink: {
    ...typography.bodyCompact,
    fontWeight: '700',
    color: colors.brand.primary,
  },
  disclaimerText: {
    ...typography.caption,
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 18,
  },
});
