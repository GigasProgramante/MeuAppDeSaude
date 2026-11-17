import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  AreaLembretePreset,
  LEMBRETES_PRESETS_IDOSOS,
  LembretePresetIdoso,
  encontrarLembretePreset,
} from '../../services/lembretesPresets';
import {
  NOTIFICATION_CHANNELS,
  cancelNotifications,
  scheduleNotification,
} from '../../services/notifications';
import { useStore } from '../../store/useStore';
import { colors, radii, spacing, typography } from '../../theme/tokens';
import { AppButton } from './AppButton';
import { AppCard } from './AppCard';
import { StatusBadge } from './StatusBadge';
import { useFeedback } from './FeedbackProvider';

interface PresetRemindersCardProps {
  area: AreaLembretePreset;
  title?: string;
  subtitle?: string;
}

export function PresetRemindersCard({
  area,
  title = 'Lembretes Sugeridos para o Dia a Dia',
  subtitle = 'Ative com 1 toque alarmes simples recomendados para a rotina e prevenção.',
}: PresetRemindersCardProps) {
  const { showToast } = useFeedback();
  const lembretes = useStore((s) => s.lembretes || []);
  const addLembrete = useStore((s) => s.addLembrete);
  const removeLembrete = useStore((s) => s.removeLembrete);

  const presets = LEMBRETES_PRESETS_IDOSOS[area] || [];

  const handleTogglePreset = async (preset: LembretePresetIdoso) => {
    const existente = encontrarLembretePreset(lembretes, preset);

    if (existente) {
      if (Platform.OS !== 'web') {
        const ids = [existente.notificationId, ...(existente.notificationIds || [])].filter(
          Boolean
        ) as string[];
        if (ids.length > 0) {
          await cancelNotifications(ids).catch(() => {});
        }
      }
      removeLembrete(existente.id);
      showToast(`Lembrete "${preset.titulo}" desativado.`, 'info');
      return;
    }

    const [hStr, mStr] = preset.horario.split(':');
    const hour = parseInt(hStr, 10);
    const minute = parseInt(mStr, 10);

    let notifIds: string[] = [];
    if (Platform.OS !== 'web') {
      notifIds = await scheduleNotification(
        {
          title: preset.titulo,
          body: preset.descricao,
          channelId: NOTIFICATION_CHANNELS.LEMBRETES,
        },
        { type: 'daily', hour, minute }
      ).catch(() => []);
    }

    addLembrete({
      tipo: 'acao',
      concluido: false,
      tipoAcao: preset.tipoAcao,
      acaoPersonalizada: preset.titulo,
      horario: preset.horario,
      periodicidade: 'diaria',
      notificationId: notifIds[0],
      notificationIds: notifIds,
    });
    showToast(`Lembrete diário ativado para ${preset.horario}.`, 'success');
  };

  return (
    <AppCard variant="default">
      <View style={styles.headerRow}>
        <Ionicons name="notifications-outline" size={20} color={colors.brand.primary} />
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <View style={styles.list}>
        {presets.map((preset) => {
          const ativo = Boolean(encontrarLembretePreset(lembretes, preset));
          return (
            <View key={preset.id} style={[styles.presetItem, ativo && styles.presetItemActive]}>
              <View style={styles.presetTopRow}>
                <View style={styles.presetTitleWrap}>
                  <Ionicons
                    name={preset.icon}
                    size={18}
                    color={ativo ? colors.semantic.success : colors.brand.primary}
                  />
                  <Text style={styles.presetTitle}>{preset.titulo}</Text>
                </View>
                <StatusBadge
                  label={ativo ? `Ativo · ${preset.horario}` : preset.horario}
                  tone={ativo ? 'success' : 'info'}
                />
              </View>
              <Text style={styles.presetDesc}>{preset.descricao}</Text>
              <AppButton
                title={ativo ? 'Desativar lembrete' : `Ativar todo dia às ${preset.horario}`}
                icon={ativo ? 'notifications-off-outline' : 'alarm-outline'}
                variant={ativo ? 'outline' : 'secondary'}
                compact
                onPress={() => handleTogglePreset(preset)}
              />
            </View>
          );
        })}
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    flex: 1,
  },
  subtitle: {
    ...typography.bodyCompact,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  list: {
    gap: spacing.sm,
  },
  presetItem: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.subtle,
    padding: spacing.md,
    gap: spacing.xs,
  },
  presetItemActive: {
    backgroundColor: colors.semantic.successBg,
    borderColor: colors.semantic.successBorder,
  },
  presetTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  presetTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  presetTitle: {
    ...typography.label,
    color: colors.text.primary,
    flex: 1,
  },
  presetDesc: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
});
