import React, { useEffect } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, layout, radii, shadows, spacing, typography } from '../../theme/tokens';

interface AppModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export function AppModal({
  visible,
  title,
  subtitle,
  onClose,
  footer,
  children,
}: AppModalProps) {
  const { width } = useWindowDimensions();
  const isCentered = Platform.OS === 'web' || width >= 640;

  useEffect(() => {
    if (!visible || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [visible, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isCentered ? 'fade' : 'slide'}
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, isCentered ? styles.overlayCentered : styles.overlayBottom]}>
        <View style={[styles.card, isCentered ? styles.cardCentered : styles.cardBottom]}>
          <View style={styles.header}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Fechar janela"
            >
              <Ionicons name="close" size={22} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.surface.overlay,
  },
  overlayCentered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  overlayBottom: {
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: colors.surface.card,
    maxHeight: '90%',
    width: '100%',
    overflow: 'hidden',
    ...shadows.modal,
  },
  cardCentered: {
    maxWidth: 560,
    borderRadius: radii.xl,
  },
  cardBottom: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    gap: spacing.md,
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    ...typography.h2,
  },
  subtitle: {
    ...typography.bodyCompact,
    marginTop: 4,
  },
  closeBtn: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: radii.md,
    backgroundColor: colors.surface.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    padding: spacing.xl,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    backgroundColor: colors.surface.canvas,
  },
});
