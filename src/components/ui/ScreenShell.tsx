import React from 'react';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, layout, radii, spacing, typography } from '../../theme/tokens';

interface ScreenShellProps {
  title?: string;
  subtitle?: string;
  areaBadge?: { label: string; color: string; bg: string };
  onBack?: () => void;
  rightAction?: React.ReactNode;
  maxWidth?: 'form' | 'grid';
  scrollable?: boolean;
  children: React.ReactNode;
  contentStyle?: ViewStyle;
  scrollRef?: React.RefObject<ScrollView | null>;
}

export function ScreenShell({
  title,
  subtitle,
  areaBadge,
  onBack,
  rightAction,
  maxWidth = 'form',
  scrollable = true,
  children,
  contentStyle,
  scrollRef,
}: ScreenShellProps) {
  const widthCap = maxWidth === 'grid' ? layout.maxWidthGrid : layout.maxWidthForm;

  const innerContent = (
    <View style={[styles.innerWrap, { maxWidth: widthCap }, contentStyle]}>{children}</View>
  );

  const hasHeader = Boolean(title || onBack || rightAction || areaBadge || subtitle);

  return (
    <SafeAreaView style={styles.safeArea}>
      {hasHeader && (
        <View style={styles.headerWrapper}>
          <View style={[styles.headerInner, { maxWidth: widthCap }]}>
            <View style={styles.headerLeft}>
              {onBack && (
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={onBack}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel="Voltar"
                >
                  <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
                </TouchableOpacity>
              )}
              <View style={styles.titleBlock}>
                {areaBadge && (
                  <View style={[styles.areaPill, { backgroundColor: areaBadge.bg }]}>
                    <Text style={[styles.areaPillText, { color: areaBadge.color }]}>
                      {areaBadge.label}
                    </Text>
                  </View>
                )}
                {title ? (
                  <Text style={styles.headerTitle} numberOfLines={2}>
                    {title}
                  </Text>
                ) : null}
                {subtitle ? (
                  <Text style={styles.headerSubtitle} numberOfLines={2}>
                    {subtitle}
                  </Text>
                ) : null}
              </View>
            </View>
            {rightAction ? <View style={styles.headerRight}>{rightAction}</View> : null}
          </View>
        </View>
      )}

      {scrollable ? (
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {innerContent}
        </ScrollView>
      ) : (
        <View style={styles.nonScrollBody}>{innerContent}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface.canvas,
  },
  headerWrapper: {
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    paddingTop: Platform.OS === 'android' ? spacing.sm : 0,
  },
  headerInner: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  backBtn: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: radii.md,
    backgroundColor: colors.surface.subtle,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
  },
  areaPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    marginBottom: 4,
  },
  areaPillText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  headerTitle: {
    ...typography.h1,
    fontSize: 22,
    lineHeight: 28,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '500',
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing['3xl'],
    flexGrow: 1,
  },
  nonScrollBody: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  innerWrap: {
    width: '100%',
    alignSelf: 'center',
    flexGrow: 1,
  },
});
