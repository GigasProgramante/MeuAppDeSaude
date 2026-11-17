import { StyleSheet } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme/tokens';

export const styles = StyleSheet.create({
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
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
