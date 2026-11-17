import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BarChartCard, ChartPoint } from '../../components/ClinicaCharts';
import {
  AppButton,
  AppCard,
  AppInput,
  AppModal,
  ChipSelector,
  EmptyState,
  PainScaleSelector,
  StatusBadge,
  getPainBand,
  useFeedback,
} from '../../components/ui';
import { formatarMascaraHora } from '../../services/clinicaHelpers';
import { NOTIFICATION_CHANNELS, scheduleNotification } from '../../services/notifications';
import { useStore } from '../../store/useStore';
import { colors, radii, spacing, typography } from '../../theme/tokens';
import { RegiaoDor, TipoDor } from '../../types';
import {
  EXERCICIOS_FISIO_HOJE,
  PRESETS_POSTURA_FISIO,
  PresetPosturaLembrete,
} from './fisioData';

const REGIOES_DOR: RegiaoDor[] = ['Coluna Lombar', 'Pescoço', 'Joelho', 'Ombro', 'Punho'];
const TIPOS_DOR: TipoDor[] = ['Muscular', 'Articular', 'Pontada', 'Queimação'];

export function FisioterapiaPainSection() {
  const { showAlert, showToast } = useFeedback();
  const [nivelDor, setNivelDor] = useState<number | null>(null);
  const [regiaoDor, setRegiaoDor] = useState<RegiaoDor | null>(null);
  const [tipoDor, setTipoDor] = useState<TipoDor | null>(null);

  const [exerciciosModalVisible, setExerciciosModalVisible] = useState(false);
  const [posturaModalVisible, setPosturaModalVisible] = useState(false);
  const [exercicioAbertoId, setExercicioAbertoId] = useState<string | null>(
    EXERCICIOS_FISIO_HOJE[0].id
  );

  const [horarioFisio, setHorarioFisio] = useState('14:00');
  const [fisioLocal, setFisioLocal] = useState('');
  const [fisioTerapeuta, setFisioTerapeuta] = useState('');
  const [fisioOrientacoes, setFisioOrientacoes] = useState('');

  const historicoDor = useStore((state) => state.historicoDor || []);
  const addRegistroDor = useStore((state) => state.addRegistroDor);
  const addLembrete = useStore((state) => state.addLembrete);

  const areaAccent = colors.areas.corpoMovimento;

  const handleSaveDor = () => {
    if (nivelDor === null || nivelDor < 0 || nivelDor > 10) {
      showAlert('Atenção', 'Selecione na escala de 0 a 10 a intensidade da dor.');
      return;
    }
    if (!regiaoDor) {
      showAlert('Atenção', 'Selecione a região onde está sentindo dor.');
      return;
    }
    if (!tipoDor) {
      showAlert('Atenção', 'Selecione a característica da dor.');
      return;
    }

    addRegistroDor({ nivel: nivelDor, regiao: regiaoDor, tipo: tipoDor });
    showToast(`Dor nível ${nivelDor}/10 registrada com sucesso.`, 'success');
    setNivelDor(null);
    setRegiaoDor(null);
    setTipoDor(null);
  };

  const agendarPresetPostura = async (preset: PresetPosturaLembrete) => {
    const [hStr, mStr] = preset.horarioSugerido.split(':');
    const hour = parseInt(hStr, 10);
    const minute = parseInt(mStr, 10);

    let notifIds: string[] = [];
    if (Platform.OS !== 'web') {
      notifIds = await scheduleNotification(
        {
          title: `Fisioterapia & Postura: ${preset.titulo}`,
          body: preset.orientacoes,
          channelId: NOTIFICATION_CHANNELS.LEMBRETES,
        },
        { type: 'daily', hour, minute }
      );
    }

    addLembrete({
      tipo: 'acao',
      concluido: false,
      tipoAcao: 'fisioterapia',
      acaoPersonalizada: preset.titulo,
      horario: preset.horarioSugerido,
      periodicidade: 'diaria',
      fisioOrientacoes: preset.orientacoes,
      notificationId: notifIds[0],
      notificationIds: notifIds,
    });
    showToast(`Lembrete "${preset.titulo}" agendado para ${preset.horarioSugerido}.`, 'success');
  };

  const handleAgendarSessaoFisio = async () => {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(horarioFisio.trim())) {
      showAlert('Horário inválido', 'Informe o horário no formato HH:MM (ex.: 14:00).');
      return;
    }

    const [hStr, mStr] = horarioFisio.trim().split(':');
    const hour = parseInt(hStr, 10);
    const minute = parseInt(mStr, 10);

    let notifIds: string[] = [];
    if (Platform.OS !== 'web') {
      notifIds = await scheduleNotification(
        {
          title: 'Sessão de Fisioterapia',
          body: [fisioLocal.trim() || 'Clínica / domiciliar', fisioTerapeuta.trim()]
            .filter(Boolean)
            .join(' · '),
          channelId: NOTIFICATION_CHANNELS.LEMBRETES,
        },
        { type: 'daily', hour, minute }
      );
    }

    addLembrete({
      tipo: 'acao',
      concluido: false,
      tipoAcao: 'fisioterapia',
      acaoPersonalizada: 'Sessão de Fisioterapia',
      horario: horarioFisio.trim(),
      periodicidade: 'diaria',
      fisioLocal: fisioLocal.trim() || undefined,
      fisioTerapeuta: fisioTerapeuta.trim() || undefined,
      fisioOrientacoes: fisioOrientacoes.trim() || undefined,
      notificationId: notifIds[0],
      notificationIds: notifIds,
    });

    setFisioLocal('');
    setFisioTerapeuta('');
    setFisioOrientacoes('');
    setPosturaModalVisible(false);
    showToast(`Lembrete de fisioterapia salvo para ${horarioFisio.trim()}.`, 'success');
  };

  const painChartData: ChartPoint[] = useMemo(() => {
    return (historicoDor || []).slice(-7).map((h) => ({
      label: new Date(h.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      value: h.nivel,
      displayValue: `${h.nivel}`,
      color:
        h.nivel <= 3
          ? colors.semantic.success
          : h.nivel <= 6
            ? colors.semantic.warning
            : colors.semantic.danger,
    }));
  }, [historicoDor]);

  return (
    <View style={styles.container}>
      <AppCard variant="elevated">
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="medkit-outline" size={22} color={areaAccent.color} />
          <Text style={styles.sectionTitle}>Registro de Dor (EVA)</Text>
        </View>
        <Text style={styles.sectionSub}>
          Toque em um número de 0 (sem dor) a 10 (dor insuportável) e identifique local e tipo.
        </Text>

        <PainScaleSelector value={nivelDor} onChange={setNivelDor} />

        <ChipSelector
          label="Onde está a dor?"
          options={REGIOES_DOR}
          selected={regiaoDor}
          onSelect={setRegiaoDor}
          accentColor={areaAccent.color}
          accentBg={areaAccent.bg}
        />

        <ChipSelector
          label="Como é a dor?"
          options={TIPOS_DOR}
          selected={tipoDor}
          onSelect={setTipoDor}
          accentColor={areaAccent.color}
          accentBg={areaAccent.bg}
        />

        <AppButton
          title="Salvar Registro de Dor"
          icon="checkmark-circle-outline"
          variant="primary"
          onPress={handleSaveDor}
          style={{ marginTop: spacing.xs }}
        />
      </AppCard>

      <AppCard variant="elevated">
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="walk-outline" size={22} color={areaAccent.color} />
          <Text style={styles.sectionTitle}>Plano Terapêutico e Postura</Text>
        </View>
        <Text style={styles.sectionSub}>
          Consulte séries guiadas de fisioterapia ou configure alertas diários de postura e sessões.
        </Text>
        <View style={styles.buttonStack}>
          <AppButton
            title="Exercícios Terapêuticos de Hoje"
            icon="barbell-outline"
            variant="secondary"
            onPress={() => setExerciciosModalVisible(true)}
          />
          <AppButton
            title="Lembretes de Postura e Sessões"
            icon="alarm-outline"
            variant="outline"
            onPress={() => setPosturaModalVisible(true)}
          />
        </View>
      </AppCard>

      <BarChartCard
        title="Evolução da Dor (EVA 0–10)"
        subtitle="Acompanhe os últimos 7 registros na Escala Visual Analógica."
        maxScale={10}
        data={painChartData}
        emptyMessage="Registre seu nível de dor para acompanhar o gráfico de evolução."
        legend={[
          { label: 'Leve (0–3)', color: colors.semantic.success },
          { label: 'Moderada (4–6)', color: colors.semantic.warning },
          { label: 'Intensa (7–10)', color: colors.semantic.danger },
        ]}
      />

      <AppCard variant="default">
        <Text style={styles.sectionTitle}>Histórico de Dor</Text>
        {historicoDor.length === 0 ? (
          <EmptyState
            icon="pulse-outline"
            title="Nenhum registro de dor"
            description="Quando registrar sua intensidade de dor acima, o histórico detalhado aparecerá aqui."
          />
        ) : (
          <View style={styles.historyList}>
            {historicoDor
              .slice()
              .reverse()
              .slice(0, 10)
              .map((h) => {
                const banda = getPainBand(h.nivel);
                const bandaTone =
                  h.nivel <= 3 ? 'success' : h.nivel <= 6 ? 'warning' : 'danger';
                return (
                  <View key={h.id} style={styles.historyItem}>
                    <View style={styles.historyTopRow}>
                      <Text style={styles.historyDate}>
                        {new Date(h.data).toLocaleDateString('pt-BR')} · Dor {h.nivel}/10
                      </Text>
                      <StatusBadge label={banda.label} tone={bandaTone} />
                    </View>
                    {(h.regiao || h.tipo) && (
                      <View style={styles.historyDetailRow}>
                        {h.regiao ? (
                          <View style={styles.metaChip}>
                            <Ionicons name="location-outline" size={14} color={colors.text.secondary} />
                            <Text style={styles.metaText}>{h.regiao}</Text>
                          </View>
                        ) : null}
                        {h.tipo ? (
                          <View style={styles.metaChip}>
                            <Ionicons name="flash-outline" size={14} color={colors.text.secondary} />
                            <Text style={styles.metaText}>{h.tipo}</Text>
                          </View>
                        ) : null}
                      </View>
                    )}
                  </View>
                );
              })}
          </View>
        )}
      </AppCard>

      <AppModal
        visible={exerciciosModalVisible}
        title="Exercícios Terapêuticos de Hoje"
        subtitle="Realize os movimentos com calma, respeitando os limites de dor."
        onClose={() => setExerciciosModalVisible(false)}
        footer={
          <AppButton title="Fechar" variant="outline" onPress={() => setExerciciosModalVisible(false)} />
        }
      >
        <View style={{ gap: spacing.md }}>
          {EXERCICIOS_FISIO_HOJE.map((ex) => {
            const aberto = exercicioAbertoId === ex.id;
            return (
              <AppCard key={ex.id} variant="outlined">
                <TouchableOpacity
                  onPress={() => setExercicioAbertoId(aberto ? null : ex.id)}
                  style={styles.accordionHeader}
                >
                  <View style={{ flex: 1, paddingRight: spacing.sm }}>
                    <Text style={styles.accordionTitle}>{ex.titulo}</Text>
                    <Text style={styles.accordionMeta}>
                      {ex.regiao} · {ex.duracao} · {ex.series}
                    </Text>
                  </View>
                  <Ionicons
                    name={aberto ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.text.secondary}
                  />
                </TouchableOpacity>
                {aberto && (
                  <View style={styles.accordionBody}>
                    <Text style={styles.objectiveText}>
                      <Text style={{ fontWeight: '700' }}>Objetivo: </Text>
                      {ex.objetivo}
                    </Text>
                    {ex.passos.map((passo, idx) => (
                      <Text key={idx} style={styles.stepText}>
                        {idx + 1}. {passo}
                      </Text>
                    ))}
                    <View style={styles.safetyBox}>
                      <Text style={styles.safetyText}>Atenção: {ex.alertaSeguranca}</Text>
                    </View>
                  </View>
                )}
              </AppCard>
            );
          })}
        </View>
      </AppModal>

      <AppModal
        visible={posturaModalVisible}
        title="Postura e Sessões de Fisioterapia"
        subtitle="Ative um lembrete diário de postura ou agende uma sessão."
        onClose={() => setPosturaModalVisible(false)}
        footer={
          <AppButton title="Fechar" variant="outline" onPress={() => setPosturaModalVisible(false)} />
        }
      >
        <View style={{ gap: spacing.md }}>
          {PRESETS_POSTURA_FISIO.map((preset) => (
            <AppCard key={preset.id} variant="outlined">
              <View style={styles.presetHeader}>
                <Text style={styles.presetTitle}>{preset.titulo}</Text>
                <StatusBadge label={preset.horarioSugerido} tone="info" />
              </View>
              <Text style={styles.presetDesc}>{preset.descricao}</Text>
              <AppButton
                title={`Agendar todos os dias às ${preset.horarioSugerido}`}
                variant="secondary"
                icon="alarm-outline"
                compact
                onPress={() => agendarPresetPostura(preset)}
              />
            </AppCard>
          ))}

          <AppCard variant="elevated">
            <Text style={styles.formModalTitle}>Agendar Sessão Personalizada</Text>
            <AppInput
              label="Horário (HH:MM)"
              value={horarioFisio}
              onChangeText={(txt) => setHorarioFisio(formatarMascaraHora(txt))}
              keyboardType="numeric"
              placeholder="14:00"
              maxLength={5}
            />
            <AppInput
              label="Local / Clínica (opcional)"
              value={fisioLocal}
              onChangeText={setFisioLocal}
              placeholder="Ex: Clínica-Escola UNC"
            />
            <AppInput
              label="Fisioterapeuta (opcional)"
              value={fisioTerapeuta}
              onChangeText={setFisioTerapeuta}
              placeholder="Nome do profissional ou estagiário"
            />
            <AppInput
              label="Orientações / Exercícios (opcional)"
              value={fisioOrientacoes}
              onChangeText={setFisioOrientacoes}
              placeholder="Ex: Levar exame, fazer compressa"
              multiline
            />
            <AppButton
              title="Salvar Lembrete de Fisioterapia"
              variant="primary"
              icon="calendar-outline"
              onPress={handleAgendarSessaoFisio}
            />
          </AppCard>
        </View>
      </AppModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
  },
  sectionSub: {
    ...typography.bodyCompact,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  buttonStack: {
    gap: spacing.sm,
  },
  historyList: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  historyItem: {
    backgroundColor: colors.surface.subtle,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.md,
  },
  historyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  historyDate: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text.primary,
    flex: 1,
  },
  historyDetailRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accordionTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text.primary,
  },
  accordionMeta: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  accordionBody: {
    marginTop: spacing.md,
    gap: 6,
  },
  objectiveText: {
    ...typography.bodyCompact,
    color: colors.text.secondary,
  },
  stepText: {
    ...typography.bodyCompact,
    color: colors.text.primary,
    lineHeight: 20,
  },
  safetyBox: {
    backgroundColor: colors.semantic.warningBg,
    borderColor: colors.semantic.warningBorder,
    borderWidth: 1,
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  safetyText: {
    ...typography.caption,
    color: colors.semantic.warning,
    fontWeight: '600',
  },
  presetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  presetTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text.primary,
    flex: 1,
  },
  presetDesc: {
    ...typography.bodyCompact,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  formModalTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
});
