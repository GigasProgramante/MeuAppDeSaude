import React, { useMemo, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, Alert, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useStore } from '../../store/useStore';
import { BarChartCard, ChartPoint } from '../../components/ClinicaCharts';
import { AppButton, AppCard, AppInput, AppModal, StatusBadge, useFeedback } from '../../components/ui';
import { NOTIFICATION_CHANNELS, scheduleNotification } from '../../services/notifications';
import { formatarMascaraHora } from '../../services/clinicaHelpers';
import { colors, spacing } from '../../theme/tokens';
import { RegiaoDor, TipoDor } from '../../types';
import { EXERCICIOS_FISIO_HOJE, PRESETS_POSTURA_FISIO, PresetPosturaLembrete } from './fisioData';
import { styles } from './styles';

type FisioterapiaNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Fisioterapia'>;

interface Props {
  navigation: FisioterapiaNavigationProp;
}

const REGIOES_DOR: RegiaoDor[] = ['Coluna Lombar', 'Pescoço', 'Joelho', 'Ombro', 'Punho'];
const TIPOS_DOR: TipoDor[] = ['Muscular', 'Articular', 'Pontada', 'Queimação'];

interface ChipGroupProps<T extends string> {
  label: string;
  options: T[];
  selected: T | null;
  onSelect: (value: T) => void;
}

function ChipGroup<T extends string>({ label, options, selected, onSelect }: ChipGroupProps<T>) {
  return (
    <View style={styles.chipSection}>
      <Text style={styles.chipLabel}>{label}</Text>
      <View style={styles.chipRow} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((option) => {
          const ativo = selected === option;
          return (
            <TouchableOpacity
              key={option}
              style={[styles.chip, ativo && styles.chipActive]}
              onPress={() => onSelect(option)}
              accessibilityRole="radio"
              accessibilityState={{ selected: ativo }}
              accessibilityLabel={option}
            >
              <Text style={[styles.chipText, ativo && styles.chipTextActive]}>{option}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TelaFisioterapia({ navigation }: Props) {
  const { showAlert, showToast } = useFeedback();
  const [nivelDor, setNivelDor] = useState('');
  const [regiaoDor, setRegiaoDor] = useState<RegiaoDor | null>(null);
  const [tipoDor, setTipoDor] = useState<TipoDor | null>(null);
  const [exerciciosModalVisible, setExerciciosModalVisible] = useState(false);
  const [posturaModalVisible, setPosturaModalVisible] = useState(false);
  const [exercicioAbertoId, setExercicioAbertoId] = useState<string | null>(EXERCICIOS_FISIO_HOJE[0].id);

  // Agendamento de sessão ou postura
  const [horarioFisio, setHorarioFisio] = useState('14:00');
  const [fisioLocal, setFisioLocal] = useState('');
  const [fisioTerapeuta, setFisioTerapeuta] = useState('');
  const [fisioOrientacoes, setFisioOrientacoes] = useState('');

  const historicoDor = useStore((state) => state.historicoDor || []);
  const addRegistroDor = useStore((state) => state.addRegistroDor);
  const addLembrete = useStore((state) => state.addLembrete);

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

  const mostrarAlerta = (titulo: string, mensagem: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert(`${titulo}\n\n${mensagem}`);
    } else {
      Alert.alert(titulo, mensagem);
    }
  };

  const handleSaveDor = () => {
    const nivel = parseInt(nivelDor, 10);
    if (isNaN(nivel) || nivel < 0 || nivel > 10) {
      mostrarAlerta('Erro', 'Por favor, insira um nível de dor válido (0 a 10).');
      return;
    }
    if (!regiaoDor) {
      mostrarAlerta('Erro', 'Selecione a região onde está sentindo dor.');
      return;
    }
    if (!tipoDor) {
      mostrarAlerta('Erro', 'Selecione o tipo de dor que está sentindo.');
      return;
    }

    addRegistroDor({ nivel, regiao: regiaoDor, tipo: tipoDor });
    mostrarAlerta('Salvo', 'Nível de dor registrado. Melhoras!');
    setNivelDor('');
    setRegiaoDor(null);
    setTipoDor(null);
  };

  const painChartData: ChartPoint[] = useMemo(() => {
    return (historicoDor || []).slice(-7).map((h) => ({
      label: new Date(h.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      value: h.nivel,
      displayValue: `${h.nivel}`,
      color: h.nivel <= 3 ? '#10B981' : h.nivel <= 6 ? '#F59E0B' : '#EF4444',
    }));
  }, [historicoDor]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Fisioterapia</Text>
        <Text style={styles.subtitle}>Gerencie suas dores e exercícios terapêuticos.</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Registro de Dor (EVA)</Text>
          <Text style={styles.infoText}>Mapeie a intensidade da dor hoje (0 a 10).</Text>
          <TextInput placeholderTextColor="#6B7280"
            style={styles.input}
            placeholder="Nível de 0 a 10"
            keyboardType="numeric"
            value={nivelDor}
            onChangeText={(text) => setNivelDor(text.replace(/[^\d]/g, ''))}
            maxLength={2}
          />
          <ChipGroup label="Onde dói?" options={REGIOES_DOR} selected={regiaoDor} onSelect={setRegiaoDor} />
          <ChipGroup label="Como é a dor?" options={TIPOS_DOR} selected={tipoDor} onSelect={setTipoDor} />
          <TouchableOpacity style={styles.actionButton} onPress={handleSaveDor}>
            <Text style={styles.actionButtonText}>Salvar Dor de Hoje</Text>
          </TouchableOpacity>
        </View>

        <BarChartCard
          title="📊 Evolução da Dor (EVA 0–10)"
          subtitle="Acompanhe os últimos 7 registros da Escala Visual Analógica (RF46)."
          maxScale={10}
          data={painChartData}
          emptyMessage="Registre seu nível de dor para acompanhar o gráfico de evolução."
          legend={[
            { label: 'Leve (0–3)', color: '#10B981' },
            { label: 'Moderada (4–6)', color: '#F59E0B' },
            { label: 'Intensa (7–10)', color: '#EF4444' },
          ]}
        />

        <View style={styles.historyContainer}>
          <Text style={styles.historyTitle}>Histórico de Dor</Text>
          {historicoDor.length === 0 ? (
            <Text style={styles.emptyHistory}>Nenhum registro ainda.</Text>
          ) : (
            historicoDor.slice().reverse().slice(0, 10).map((h) => (
              <View key={h.id} style={styles.historyItem}>
                <Text style={styles.historyItemText}>
                  {new Date(h.data).toLocaleDateString('pt-BR')}: Dor nível {h.nivel}/10
                </Text>
                {(h.regiao || h.tipo) && (
                  <Text style={styles.historyItemDetail}>
                    {[h.regiao && `📍 ${h.regiao}`, h.tipo && `⚡ ${h.tipo}`].filter(Boolean).join('  ·  ')}
                  </Text>
                )}
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Plano Terapêutico</Text>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setExerciciosModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Exercícios de Hoje</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setPosturaModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Lembretes de Postura e Sessões</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </ScrollView>

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
                  style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>
                      {ex.titulo}
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.text.secondary, marginTop: 2 }}>
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
                  <View style={{ marginTop: spacing.md, gap: 6 }}>
                    <Text style={{ fontSize: 13, color: colors.text.secondary }}>
                      <Text style={{ fontWeight: '700' }}>Objetivo: </Text>
                      {ex.objetivo}
                    </Text>
                    {ex.passos.map((passo, idx) => (
                      <Text key={idx} style={{ fontSize: 14, color: colors.text.primary, lineHeight: 20 }}>
                        {idx + 1}. {passo}
                      </Text>
                    ))}
                    <View
                      style={{
                        backgroundColor: colors.semantic.warningBg,
                        borderColor: colors.semantic.warningBorder,
                        borderWidth: 1,
                        borderRadius: 8,
                        padding: 8,
                        marginTop: 4,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: colors.semantic.warning, fontWeight: '600' }}>
                        Atenção: {ex.alertaSeguranca}
                      </Text>
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
        subtitle="Ative um lembrete rápido de postura ou agende uma sessão."
        onClose={() => setPosturaModalVisible(false)}
        footer={
          <AppButton title="Fechar" variant="outline" onPress={() => setPosturaModalVisible(false)} />
        }
      >
        <View style={{ gap: spacing.md }}>
          {PRESETS_POSTURA_FISIO.map((preset) => (
            <AppCard key={preset.id} variant="outlined">
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary, flex: 1 }}>
                  {preset.titulo}
                </Text>
                <StatusBadge label={preset.horarioSugerido} tone="info" />
              </View>
              <Text style={{ fontSize: 13, color: colors.text.secondary, marginBottom: 8 }}>
                {preset.descricao}
              </Text>
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
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: 10 }}>
              Agendar Sessão Personalizada
            </Text>
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
    </SafeAreaView>
  );
}


