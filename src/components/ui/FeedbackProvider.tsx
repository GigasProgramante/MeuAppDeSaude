import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, layout, radii, shadows, spacing, typography } from '../../theme/tokens';
import { AppButton } from './AppButton';

export type ToastTone = 'info' | 'success' | 'warning' | 'danger';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}

interface DialogState {
  title: string;
  message: string;
  mode: 'alert' | 'confirm';
  confirmText: string;
  cancelText: string;
  destructive: boolean;
  onConfirm?: () => void | Promise<void>;
}

interface ToastState {
  message: string;
  tone: ToastTone;
}

interface FeedbackContextValue {
  showToast: (message: string, tone?: ToastTone) => void;
  showAlert: (title: string, message: string, onOk?: () => void | Promise<void>) => void;
  confirm: (options: ConfirmOptions) => void;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [dialogBusy, setDialogBusy] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = useCallback((message: string, tone: ToastTone = 'info') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, tone });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 3600);
  }, []);

  const showAlert = useCallback(
    (title: string, message: string, onOk?: () => void | Promise<void>) => {
      setDialog({
        title,
        message,
        mode: 'alert',
        confirmText: 'Entendi',
        cancelText: 'Cancelar',
        destructive: false,
        onConfirm: onOk,
      });
    },
    []
  );

  const confirm = useCallback((options: ConfirmOptions) => {
    setDialog({
      title: options.title,
      message: options.message,
      mode: 'confirm',
      confirmText: options.confirmText || 'Confirmar',
      cancelText: options.cancelText || 'Cancelar',
      destructive: Boolean(options.destructive),
      onConfirm: options.onConfirm,
    });
  }, []);

  const handleCloseDialog = () => {
    if (dialogBusy) return;
    setDialog(null);
  };

  const handleConfirmDialog = async () => {
    if (!dialog) return;
    const action = dialog.onConfirm;
    if (!action) {
      setDialog(null);
      return;
    }

    setDialogBusy(true);
    try {
      await action();
      setDialog(null);
    } finally {
      setDialogBusy(false);
    }
  };

  const toastPalette = toast
    ? {
        info: {
          bg: colors.semantic.infoBg,
          border: colors.semantic.infoBorder,
          text: colors.semantic.info,
          icon: 'information-circle' as const,
        },
        success: {
          bg: colors.semantic.successBg,
          border: colors.semantic.successBorder,
          text: colors.semantic.success,
          icon: 'checkmark-circle' as const,
        },
        warning: {
          bg: colors.semantic.warningBg,
          border: colors.semantic.warningBorder,
          text: colors.semantic.warning,
          icon: 'alert-circle' as const,
        },
        danger: {
          bg: colors.semantic.dangerBg,
          border: colors.semantic.dangerBorder,
          text: colors.semantic.danger,
          icon: 'warning' as const,
        },
      }[toast.tone]
    : null;

  return (
    <FeedbackContext.Provider value={{ showToast, showAlert, confirm }}>
      {children}

      {toast && toastPalette ? (
        <View style={styles.toastWrapper} pointerEvents="box-none">
          <View
            style={[
              styles.toastBox,
              { backgroundColor: toastPalette.bg, borderColor: toastPalette.border },
            ]}
          >
            <Ionicons name={toastPalette.icon} size={22} color={toastPalette.text} />
            <Text style={[styles.toastText, { color: toastPalette.text }]}>{toast.message}</Text>
            <TouchableOpacity
              style={styles.toastClose}
              onPress={() => setToast(null)}
              accessibilityLabel="Fechar aviso"
            >
              <Ionicons name="close" size={18} color={toastPalette.text} />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <Modal
        visible={dialog !== null}
        transparent
        animationType="fade"
        onRequestClose={handleCloseDialog}
      >
        <View style={styles.overlay}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>{dialog?.title}</Text>
            <Text style={styles.dialogMessage}>{dialog?.message}</Text>

            <View style={styles.dialogActions}>
              {dialog?.mode === 'confirm' ? (
                <AppButton
                  title={dialog.cancelText}
                  variant="outline"
                  onPress={handleCloseDialog}
                  disabled={dialogBusy}
                  style={styles.dialogBtn}
                />
              ) : null}
              <AppButton
                title={dialog?.confirmText || 'OK'}
                variant={dialog?.destructive ? 'danger' : 'primary'}
                onPress={handleConfirmDialog}
                loading={dialogBusy}
                style={styles.dialogBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackContextValue {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    throw new Error('useFeedback deve ser usado dentro de FeedbackProvider.');
  }
  return ctx;
}

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    top: Platform.OS === 'web' ? spacing.lg : 50,
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
    zIndex: 9999,
  },
  toastBox: {
    width: '100%',
    maxWidth: 520,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
    ...shadows.modal,
  },
  toastText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  toastClose: {
    minWidth: layout.minTouchTarget,
    minHeight: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.surface.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.surface.card,
    borderRadius: radii.xl,
    padding: spacing['2xl'],
    ...shadows.modal,
  },
  dialogTitle: {
    ...typography.h2,
    marginBottom: spacing.sm,
  },
  dialogMessage: {
    ...typography.body,
    marginBottom: spacing.xl,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  dialogBtn: {
    flex: 1,
  },
});
