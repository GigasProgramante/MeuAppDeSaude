import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { BarChartCard, ChartPoint } from '../../components/ClinicaCharts';
import {
  AppButton,
  AppCard,
  AppInput,
  AppModal,
  ChipSelector,
  EmptyState,
  ScreenShell,
  SegmentedTabs,
  StatusBadge,
  useFeedback,
} from '../../components/ui';
import { useStore } from '../../store/useStore';
import { colors, spacing } from '../../theme/tokens';
import { HorasSono, QualidadeSono } from '../../types';
import {
  GAD7_PERGUNTAS,
  OPCOES_TRIAGEM,
  PHQ9_PERGUNTAS,
  ResultadoClassificacao,
  TipoQuestionario,
  classificarGAD7,
  classificarPHQ9,
} from './questionarios';
import {
  CONTATOS_CRISE,
  ETAPAS_GROUNDING_54321,
  FASES_RESPIRACAO_478,
  FASES_RESPIRACAO_DIAFRAGMATICA,
} from './regulacaoEmocional';
import { styles } from './styles';

type MoodScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Humor'>;

interface Props {
  navigation: MoodScreenNavigationProp;
}

const MOODS: {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
}[] = [
  { id: 'feliz', label: 'Feliz', icon: 'happy-outline', color: '#15803D', bgColor: '#DCFCE7' },
  { id: 'triste', label: 'Triste', icon: 'sad-outline', color: '#1D4ED8', bgColor: '#DBEAFE' },
  { id: 'nervoso', label: 'Irritado', icon: 'alert-circle-outline', color: '#B91C1C', bgColor: '#FEE2E2' },
  { id: 'ansioso', label: 'Ansioso', icon: 'pulse-outline', color: '#7C3AED', bgColor: '#EDE9FE' },
];

const ACTIVITIES = [
  'Trabalho',
  'Família',
  'Saúde',
  'Sono',
  'Relacionamentos',
  'Estudos',
  'Lazer',
  'Finanças',
];

const HORAS_SONO: HorasSono[] = ['Menos de 5h', '5 a 6h', '7 a 8h', 'Mais de 8h'];
const QUALIDADES_SONO: {
  value: QualidadeSono;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: 'Ruim', label: 'Ruim', icon: 'thumbs-down-outline' },
  { value: 'Regular', label: 'Regular', icon: 'remove-circle-outline' },
  { value: 'Boa', label: 'Boa', icon: 'bed-outline' },
];
const ANOTACAO_MAX = 500;

const REGULACAO_TABS: {
  key: 'respiracao' | 'grounding';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'respiracao', label: 'Respiração Guiada', icon: 'leaf-outline' },
  { key: 'grounding', label: 'Grounding 5-4-3-2-1', icon: 'hand-left-outline' },
];

export default function MoodScreen({ navigation }: Props) {
  const { showAlert, showToast, confirm } = useFeedback();

  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [anotacao, setAnotacao] = useState('');
  const [horasSono, setHorasSono] = useState<HorasSono | null>(null);
  const [qualidadeSono, setQualidadeSono] = useState<QualidadeSono | null>(null);

  const [sosModalVisible, setSosModalVisible] = useState(false);
  const [regulacaoModalVisible, setRegulacaoModalVisible] = useState(false);
  const [abaRegulacao, setAbaRegulacao] = useState<'respiracao' | 'grounding'>('respiracao');
  const [tecnicaResp, setTecnicaResp] = useState<'478' | 'diafragmatica'>('478');
  const [respiracaoAtiva, setRespiracaoAtiva] = useState(false);
  const [faseIndex, setFaseIndex] = useState(0);
  const [segundosRestantes, setSegundosRestantes] = useState(
    FASES_RESPIRACAO_478[0].duracaoSegundos
  );
  const [ciclosConcluidos, setCiclosConcluidos] = useState(0);
  const [groundingMarcados, setGroundingMarcados] = useState<string[]>([]);
  const [timelineFilter, setTimelineFilter] = useState<'todos' | 'humor' | 'avaliacao' | 'sinal'>('todos');

  const [activeQuiz, setActiveQuiz] = useState<TipoQuestionario | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [quizResult, setQuizResult] = useState<{
    tipo: TipoQuestionario;
    pontuacao: number;
    maxPontuacao: number;
    detalhes: ResultadoClassificacao;
  } | null>(null);

  const addHumor = useStore((state) => state.addHumor);
  const humorHistorico = useStore((state) => state.humorHistorico);
  const sinaisVitais = useStore((state) => state.sinaisVitais);
  const avaliacoesPsicologia = useStore((state) => state.avaliacoesPsicologia);
  const addAvaliacaoPsicologia = useStore((state) => state.addAvaliacaoPsicologia);

  const areaAccent = colors.areas.psicologia;
  const fasesRespAtuais =
    tecnicaResp === '478' ? FASES_RESPIRACAO_478 : FASES_RESPIRACAO_DIAFRAGMATICA;
  const faseAtualResp = fasesRespAtuais[faseIndex] || fasesRespAtuais[0];

  useEffect(() => {
    if (!regulacaoModalVisible) {
      setRespiracaoAtiva(false);
    }
  }, [regulacaoModalVisible]);

  useEffect(() => {
    setRespiracaoAtiva(false);
    setFaseIndex(0);
    setSegundosRestantes(fasesRespAtuais[0].duracaoSegundos);
    setCiclosConcluidos(0);
  }, [tecnicaResp, fasesRespAtuais]);

  useEffect(() => {
    if (!respiracaoAtiva || abaRegulacao !== 'respiracao') return;
    const timer = setInterval(() => {
      setSegundosRestantes((prev) => {
        if (prev > 1) return prev - 1;
        const proximoIdx = (faseIndex + 1) % fasesRespAtuais.length;
        if (proximoIdx === 0) {
          setCiclosConcluidos((c) => c + 1);
        }
        setFaseIndex(proximoIdx);
        return fasesRespAtuais[proximoIdx].duracaoSegundos;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [respiracaoAtiva, abaRegulacao, faseIndex, fasesRespAtuais]);

  const abrirLigacaoCrise = async (url: string, nome: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        showAlert('Atendimento', `Disque diretamente para ${nome} no número informado.`);
      }
    } catch {
      showAlert('Atendimento', `Disque diretamente para ${nome} no número informado.`);
    }
  };

  const toggleGrounding = (id: string) => {
    setGroundingMarcados((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const salvarRegistro = (moodId: string, mensagem: string) => {
    const textoDiario = anotacao.trim();
    addHumor({
      moodId,
      activity: selectedActivity ?? undefined,
      anotacao: textoDiario.length > 0 ? textoDiario : undefined,
      horasSono: horasSono ?? undefined,
      qualidadeSono: qualidadeSono ?? undefined,
    });
    showToast(mensagem, 'success');
    setSelectedMood(null);
    setSelectedActivity(null);
    setAnotacao('');
    setHorasSono(null);
    setQualidadeSono(null);
  };

  const handleSave = () => {
    if (!selectedMood) {
      showAlert('Atenção', 'Selecione como você está se sentindo hoje antes de salvar.');
      return;
    }

    if (!selectedActivity) {
      confirm({
        title: 'Faltou o fator de influência',
        message:
          'Selecionar o que influenciou seu humor ajuda a identificar padrões emocionais. Deseja salvar mesmo assim?',
        confirmText: 'Salvar mesmo assim',
        cancelText: 'Escolher fator',
        onConfirm: () => salvarRegistro(selectedMood, 'Seu humor foi registrado com sucesso.'),
      });
      return;
    }

    salvarRegistro(selectedMood, 'Registro emocional completo salvo com sucesso.');
  };

  const iniciarQuestionario = (tipo: TipoQuestionario) => {
    const total = tipo === 'PHQ-9' ? PHQ9_PERGUNTAS.length : GAD7_PERGUNTAS.length;
    setActiveQuiz(tipo);
    setStepIndex(0);
    setAnswers(Array(total).fill(-1));
    setQuizResult(null);
  };

  const fecharQuestionario = () => {
    setActiveQuiz(null);
    setQuizResult(null);
    setStepIndex(0);
    setAnswers([]);
  };

  const perguntasAtuais = activeQuiz === 'PHQ-9' ? PHQ9_PERGUNTAS : GAD7_PERGUNTAS;
  const respostaAtual = answers[stepIndex] ?? -1;

  const selecionarResposta = (valor: number) => {
    const updated = [...answers];
    updated[stepIndex] = valor;
    setAnswers(updated);

    if (stepIndex < perguntasAtuais.length - 1) {
      setStepIndex(stepIndex + 1);
    }
  };

  const finalizarQuestionario = () => {
    if (!activeQuiz) return;
    if (answers.some((a) => a < 0)) {
      showAlert('Atenção', 'Responda todas as perguntas para calcular o escore.');
      return;
    }

    const total = answers.reduce((acc, v) => acc + v, 0);
    const maxPontuacao = perguntasAtuais.length * 3;
    const detalhes =
      activeQuiz === 'PHQ-9'
        ? classificarPHQ9(total, answers[8] ?? 0)
        : classificarGAD7(total);

    addAvaliacaoPsicologia({
      tipo: activeQuiz,
      pontuacao: total,
      maxPontuacao,
      classificacao: detalhes.classificacao,
      orientacao: detalhes.orientacao,
      alertaCritico: detalhes.alertaCritico,
    });

    setQuizResult({
      tipo: activeQuiz,
      pontuacao: total,
      maxPontuacao,
      detalhes,
    });
  };

  const getMoodConfig = (moodId: string) => MOODS.find((m) => m.id === moodId) || MOODS[0];

  const moodFrequencyData: ChartPoint[] = useMemo(() => {
    const agora = Date.now();
    const seteDiasMs = 7 * 24 * 60 * 60 * 1000;
    const recentes = (humorHistorico || []).filter((h) => {
      const t = new Date(h.data).getTime();
      return !isNaN(t) && agora - t <= seteDiasMs;
    });

    if (recentes.length === 0) return [];

    return MOODS.map((m) => {
      const count = recentes.filter((h) => h.moodId === m.id).length;
      return {
        label: m.label,
        value: count,
        displayValue: `${count}x`,
        color: m.color,
      };
    });
  }, [humorHistorico]);

  const mergedHistory = [
    ...(humorHistorico || []).map((h) => ({ type: 'humor' as const, data: h.data, item: h })),
    ...(avaliacoesPsicologia || []).map((a) => ({ type: 'avaliacao' as const, data: a.data, item: a })),
    ...(sinaisVitais || []).map((s) => ({ type: 'sinal' as const, data: s.data, item: s })),
  ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  const filteredHistory = useMemo(
    () =>
      timelineFilter === 'todos'
        ? mergedHistory
        : mergedHistory.filter((item) => item.type === timelineFilter),
    [mergedHistory, timelineFilter]
  );

  return (
    <ScreenShell
      title="Saúde Mental"
      subtitle="Acompanhe seu bem-estar emocional, sono e triagens."
      areaBadge={{ label: 'Psicologia', color: areaAccent.color, bg: areaAccent.bg }}
      onBack={() => navigation.goBack()}
      rightAction={
        <AppButton
          title="Preciso de ajuda"
          icon="call"
          variant="danger"
          compact
          accessibilityLabel="Abrir canais de apoio emocional imediato"
          onPress={() => setSosModalVisible(true)}
        />
      }
    >
      <View style={styles.sectionCardGap}>
        <AppCard variant="alert" tone="info">
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: spacing.sm,
            }}
          >
            <View style={{ flex: 1, minWidth: 190 }}>
              <Text style={[styles.sectionTitle, { color: areaAccent.color }]}>
                Precisa desacelerar?
              </Text>
              <Text style={[styles.sectionSub, { marginBottom: 0 }]}>
                Pratique respiração guiada (4-7-8 / diafragmática) ou ancoragem 5-4-3-2-1.
              </Text>
            </View>
            <AppButton
              title="Iniciar Guia"
              icon="leaf-outline"
              variant="secondary"
              compact
              onPress={() => setRegulacaoModalVisible(true)}
            />
          </View>
        </AppCard>
        <AppCard variant="elevated">
          <Text style={styles.sectionTitle}>Como você está se sentindo hoje?</Text>
          <Text style={styles.sectionSub}>Toque no estado emocional que melhor representa seu momento.</Text>

          <View style={styles.moodGrid}>
            {MOODS.map((mood) => {
              const isSelected = selectedMood === mood.id;
              return (
                <TouchableOpacity
                  key={mood.id}
                  style={[
                    styles.moodCard,
                    isSelected && { borderColor: mood.color, backgroundColor: colors.surface.card },
                  ]}
                  onPress={() => setSelectedMood(mood.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.moodIconCircle, { backgroundColor: mood.bgColor }]}>
                    <Ionicons name={mood.icon} size={26} color={mood.color} />
                  </View>
                  <Text style={[styles.moodLabel, isSelected && { color: mood.color }]}>
                    {mood.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <ChipSelector
            label="O que mais influenciou hoje? (opcional)"
            options={ACTIVITIES}
            selected={selectedActivity}
            onSelect={(act) => setSelectedActivity(selectedActivity === act ? null : act)}
            accentColor={areaAccent.color}
            accentBg={areaAccent.bg}
          />

          <ChipSelector
            label="Horas de sono (opcional)"
            options={HORAS_SONO}
            selected={horasSono}
            onSelect={(h) => setHorasSono(horasSono === h ? null : h)}
            accentColor={areaAccent.color}
            accentBg={areaAccent.bg}
          />

          <ChipSelector
            label="Qualidade do sono (opcional)"
            options={QUALIDADES_SONO}
            selected={qualidadeSono}
            onSelect={(q) => setQualidadeSono(qualidadeSono === q ? null : q)}
            accentColor={areaAccent.color}
            accentBg={areaAccent.bg}
          />

          <AppInput
            label="Como foi seu dia? (opcional)"
            placeholder="Escreva livremente sobre seu dia, pensamentos ou sentimentos"
            value={anotacao}
            onChangeText={setAnotacao}
            multiline
            maxLength={ANOTACAO_MAX}
          />
          <Text style={styles.counterText}>
            {anotacao.length}/{ANOTACAO_MAX}
          </Text>

          <AppButton
            title={selectedMood ? 'Salvar Registro Psicológico' : 'Selecione um humor acima'}
            icon="checkmark-circle-outline"
            variant="primary"
            disabled={!selectedMood}
            onPress={handleSave}
          />
        </AppCard>

        <AppCard variant="default">
          <Text style={styles.sectionTitle}>Questionários de Triagem</Text>
          <Text style={styles.sectionSub}>
            Avaliações orientativas para acompanhar sinais de depressão e ansiedade.
          </Text>
          <View style={styles.screeningRow}>
            <View style={styles.screeningCol}>
              <AppCard variant="outlined">
                <StatusBadge label="9 perguntas" tone="info" />
                <Text style={styles.screeningTitle}>Teste PHQ-9</Text>
                <Text style={styles.screeningDesc}>
                  Triagem orientativa de sintomas depressivos nas últimas 2 semanas.
                </Text>
                <AppButton
                  title="Iniciar PHQ-9"
                  icon="play-outline"
                  variant="secondary"
                  compact
                  onPress={() => iniciarQuestionario('PHQ-9')}
                />
              </AppCard>
            </View>

            <View style={styles.screeningCol}>
              <AppCard variant="outlined">
                <StatusBadge label="7 perguntas" tone="info" />
                <Text style={styles.screeningTitle}>Teste GAD-7</Text>
                <Text style={styles.screeningDesc}>
                  Triagem orientativa de sinais de ansiedade nas últimas 2 semanas.
                </Text>
                <AppButton
                  title="Iniciar GAD-7"
                  icon="play-outline"
                  variant="secondary"
                  compact
                  onPress={() => iniciarQuestionario('GAD-7')}
                />
              </AppCard>
            </View>
          </View>
        </AppCard>

        <BarChartCard
          title="Frequência de Humores na Semana"
          subtitle="Quantas vezes cada estado emocional foi registrado nos últimos 7 dias."
          data={moodFrequencyData}
          emptyMessage="Registre seu humor durante os últimos 7 dias para acompanhar a distribuição emocional."
        />

        <AppCard variant="default">
          <Text style={styles.sectionTitle}>Linha do Tempo</Text>
          <ChipSelector
            options={[
              { value: 'todos', label: 'Todos' },
              { value: 'humor', label: 'Humor' },
              { value: 'avaliacao', label: 'Triagens' },
              { value: 'sinal', label: 'Sinais Vitais' },
            ]}
            selected={timelineFilter}
            onSelect={setTimelineFilter}
            accentColor={areaAccent.color}
            accentBg={areaAccent.bg}
          />
          {filteredHistory.length === 0 ? (
            <EmptyState
              icon="journal-outline"
              title="Nenhum registro nesta categoria"
              description="Seus registros de humor, triagens psicológicas e sinais vitais aparecerão aqui."
            />
          ) : (
            <View style={styles.historyList}>
              {filteredHistory.slice(0, 10).map((record) => {
                if (record.type === 'humor') {
                  const h = record.item;
                  const moodConfig = getMoodConfig(h.moodId);
                  return (
                    <View key={`humor-${h.id}`} style={styles.historyRow}>
                      <View style={[styles.historyIconBadge, { backgroundColor: moodConfig.bgColor }]}>
                        <Ionicons name={moodConfig.icon} size={22} color={moodConfig.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.historyTitle}>{moodConfig.label}</Text>
                        <Text style={styles.historyDate}>
                          {new Date(h.data).toLocaleDateString('pt-BR')} às{' '}
                          {new Date(h.data).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                        {h.activity ? (
                          <Text style={styles.historyDetail}>Influência: {h.activity}</Text>
                        ) : null}
                        {(h.horasSono || h.qualidadeSono) && (
                          <Text style={styles.historyDetail}>
                            Sono:{' '}
                            {[
                              h.horasSono,
                              h.qualidadeSono && `qualidade ${h.qualidadeSono.toLowerCase()}`,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </Text>
                        )}
                        {h.anotacao ? <Text style={styles.historyNote}>"{h.anotacao}"</Text> : null}
                      </View>
                    </View>
                  );
                }

                if (record.type === 'avaliacao') {
                  const a = record.item;
                  return (
                    <View key={`aval-${a.id}`} style={styles.historyRow}>
                      <View
                        style={[styles.historyIconBadge, { backgroundColor: areaAccent.bg }]}
                      >
                        <Ionicons name="clipboard-outline" size={20} color={areaAccent.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.historyTitle}>
                          {a.tipo}: {a.pontuacao}/{a.maxPontuacao} pts — {a.classificacao}
                        </Text>
                        <Text style={styles.historyDate}>
                          {new Date(a.data).toLocaleDateString('pt-BR')} às{' '}
                          {new Date(a.data).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                        <Text style={styles.historyDetail}>{a.orientacao}</Text>
                      </View>
                    </View>
                  );
                }

                const s = record.item;
                return (
                  <View key={`sinal-${s.id}`} style={styles.historyRow}>
                    <View
                      style={[
                        styles.historyIconBadge,
                        { backgroundColor: colors.areas.enfermagem.bg },
                      ]}
                    >
                      <Ionicons name="pulse-outline" size={20} color={colors.areas.enfermagem.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyTitle}>Sinais Vitais</Text>
                      <Text style={styles.historyDate}>
                        {new Date(s.data).toLocaleDateString('pt-BR')} às{' '}
                        {new Date(s.data).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                      <Text style={styles.historyDetail}>
                        {[
                          s.bpm ? `FC ${s.bpm} bpm` : '',
                          s.glicose ? `Glicose ${s.glicose} mg/dL` : '',
                          s.pressao ? `PA ${s.pressao} mmHg` : '',
                          s.oxigenacao ? `SpO₂ ${s.oxigenacao}%` : '',
                          s.temperatura ? `Temp ${s.temperatura}°C` : '',
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </AppCard>
      </View>

      <AppModal
        visible={activeQuiz !== null}
        title={
          activeQuiz === 'PHQ-9'
            ? 'Questionário PHQ-9 (Depressão)'
            : 'Questionário GAD-7 (Ansiedade)'
        }
        onClose={fecharQuestionario}
        footer={
          quizResult === null ? (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {stepIndex > 0 && (
                <AppButton
                  title="Anterior"
                  variant="outline"
                  style={{ flex: 1 }}
                  onPress={() => setStepIndex(stepIndex - 1)}
                />
              )}
              {stepIndex < perguntasAtuais.length - 1 ? (
                <AppButton
                  title="Próxima"
                  variant="primary"
                  style={{ flex: 1 }}
                  onPress={() => {
                    if (respostaAtual < 0) {
                      showAlert('Atenção', 'Selecione uma opção para avançar.');
                      return;
                    }
                    setStepIndex(stepIndex + 1);
                  }}
                />
              ) : (
                <AppButton
                  title="Calcular Resultado"
                  variant="primary"
                  style={{ flex: 1 }}
                  onPress={finalizarQuestionario}
                />
              )}
            </View>
          ) : (
            <AppButton
              title="Concluir e Ver Histórico"
              variant="primary"
              onPress={fecharQuestionario}
            />
          )
        }
      >
        {quizResult === null ? (
          <View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${((stepIndex + 1) / perguntasAtuais.length) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.stepCounter}>
              Pergunta {stepIndex + 1} de {perguntasAtuais.length}
            </Text>
            <Text style={styles.questionPrompt}>
              Nas últimas 2 semanas, com que frequência você foi incomodado(a) por:
            </Text>
            <Text style={styles.questionText}>{perguntasAtuais[stepIndex]}</Text>

            {OPCOES_TRIAGEM.map((op) => {
              const selected = respostaAtual === op.valor;
              return (
                <TouchableOpacity
                  key={op.valor}
                  style={[styles.optionButton, selected && styles.optionButtonSelected]}
                  onPress={() => selecionarResposta(op.valor)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                    {op.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={{ gap: spacing.md }}>
            <View style={[styles.resultBox, { backgroundColor: quizResult.detalhes.corFundo }]}>
              <Text style={[styles.resultScore, { color: quizResult.detalhes.cor }]}>
                {quizResult.pontuacao} / {quizResult.maxPontuacao}
              </Text>
              <Text style={[styles.resultClass, { color: quizResult.detalhes.cor }]}>
                {quizResult.detalhes.classificacao}
              </Text>
              <Text style={styles.resultOrientation}>{quizResult.detalhes.orientacao}</Text>
            </View>

            {quizResult.detalhes.alertaCritico && (
              <AppCard variant="alert" tone="danger">
                <Text style={[styles.sectionTitle, { color: colors.semantic.danger }]}>
                  Apoio Emocional Imediato
                </Text>
                <Text style={styles.sectionSub}>
                  Você não precisa passar por isso sozinho(a). Ligue gratuitamente para o CVV (188, 24h) ou procure o CAPS mais próximo.
                </Text>
                <AppButton
                  title="Abrir contatos de apoio (188 / 192)"
                  variant="danger"
                  icon="call"
                  onPress={() => {
                    fecharQuestionario();
                    setSosModalVisible(true);
                  }}
                />
              </AppCard>
            )}

            <Text style={styles.resultDisclaimer}>
              Este questionário é orientativo e não substitui diagnóstico médico ou psicológico.
            </Text>
          </View>
        )}
      </AppModal>

      <AppModal
        visible={sosModalVisible}
        title="Apoio Emocional Imediato"
        subtitle="Canais gratuitos, sigilosos e disponíveis para acolhimento."
        onClose={() => setSosModalVisible(false)}
        footer={
          <AppButton title="Fechar" variant="outline" onPress={() => setSosModalVisible(false)} />
        }
      >
        <View style={{ gap: spacing.md }}>
          {CONTATOS_CRISE.map((contato) => (
            <AppCard
              key={contato.id}
              variant={contato.destaque ? 'alert' : 'outlined'}
              tone={contato.destaque ? 'danger' : 'info'}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 4,
                  gap: spacing.sm,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary, flex: 1 }}>
                  {contato.nome}
                </Text>
                <StatusBadge
                  label={contato.telefone}
                  tone={contato.destaque ? 'danger' : 'info'}
                />
              </View>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.secondary, marginBottom: 4 }}>
                {contato.disponibilidade}
              </Text>
              <Text style={{ fontSize: 14, color: colors.text.secondary, marginBottom: spacing.sm }}>
                {contato.descricao}
              </Text>
              <AppButton
                title={`Ligar para ${contato.telefone}`}
                variant={contato.destaque ? 'danger' : 'secondary'}
                icon="call-outline"
                compact
                onPress={() => abrirLigacaoCrise(contato.telefoneDiscagem, contato.nome)}
              />
            </AppCard>
          ))}
        </View>
      </AppModal>

      <AppModal
        visible={regulacaoModalVisible}
        title="Regulação Emocional Guiada"
        subtitle="Exercícios práticos para acalmar corpo e mente no momento presente."
        onClose={() => setRegulacaoModalVisible(false)}
        footer={
          <AppButton
            title="Fechar"
            variant="outline"
            onPress={() => setRegulacaoModalVisible(false)}
          />
        }
      >
        <View style={{ gap: spacing.md }}>
          <SegmentedTabs
            tabs={REGULACAO_TABS}
            activeKey={abaRegulacao}
            onChange={setAbaRegulacao}
          />

          {abaRegulacao === 'respiracao' ? (
            <View style={{ gap: spacing.md }}>
              <ChipSelector
                options={[
                  { value: '478', label: 'Técnica 4-7-8' },
                  { value: 'diafragmatica', label: 'Diafragmática (4-2-6)' },
                ]}
                selected={tecnicaResp}
                onSelect={setTecnicaResp}
                accentColor={areaAccent.color}
                accentBg={areaAccent.bg}
              />

              <AppCard variant="outlined" style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
                <StatusBadge label={`Ciclos concluídos: ${ciclosConcluidos}`} tone="info" />
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: '800',
                    color: areaAccent.color,
                    marginTop: 12,
                  }}
                >
                  {faseAtualResp.label}
                </Text>
                <Text
                  style={{
                    fontSize: 44,
                    fontWeight: '800',
                    color: colors.text.primary,
                    marginVertical: 6,
                  }}
                >
                  {segundosRestantes}s
                </Text>
                <Text style={{ fontSize: 14, color: colors.text.secondary, textAlign: 'center' }}>
                  {faseAtualResp.instrucao}
                </Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, width: '100%' }}>
                  <AppButton
                    title={respiracaoAtiva ? 'Pausar' : 'Iniciar Guia'}
                    icon={respiracaoAtiva ? 'pause' : 'play'}
                    variant="primary"
                    style={{ flex: 1 }}
                    onPress={() => setRespiracaoAtiva((prev) => !prev)}
                  />
                  <AppButton
                    title="Reiniciar"
                    icon="refresh"
                    variant="outline"
                    onPress={() => {
                      setRespiracaoAtiva(false);
                      setFaseIndex(0);
                      setSegundosRestantes(fasesRespAtuais[0].duracaoSegundos);
                      setCiclosConcluidos(0);
                    }}
                  />
                </View>
              </AppCard>
            </View>
          ) : (
            <View style={{ gap: spacing.sm }}>
              <Text style={styles.sectionSub}>
                Marque cada sentido conforme você observa o ambiente ({groundingMarcados.length}/5):
              </Text>
              {ETAPAS_GROUNDING_54321.map((etapa) => {
                const marcado = groundingMarcados.includes(etapa.id);
                return (
                  <TouchableOpacity
                    key={etapa.id}
                    onPress={() => toggleGrounding(etapa.id)}
                    activeOpacity={0.8}
                  >
                    <AppCard variant={marcado ? 'alert' : 'outlined'} tone={marcado ? 'success' : 'info'}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Ionicons
                          name={marcado ? 'checkmark-circle' : 'ellipse-outline'}
                          size={22}
                          color={marcado ? colors.semantic.success : colors.text.muted}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
                            {etapa.titulo}
                          </Text>
                          <Text style={{ fontSize: 13, color: colors.text.secondary, marginTop: 2 }}>
                            {etapa.descricao}
                          </Text>
                          <Text style={{ fontSize: 13, color: colors.text.muted, marginTop: 2 }}>
                            {etapa.exemplos}
                          </Text>
                        </View>
                      </View>
                    </AppCard>
                  </TouchableOpacity>
                );
              })}
              {groundingMarcados.length > 0 && (
                <AppButton
                  title="Limpar marcações"
                  variant="ghost"
                  compact
                  onPress={() => setGroundingMarcados([])}
                />
              )}
            </View>
          )}
        </View>
      </AppModal>
    </ScreenShell>
  );
}
