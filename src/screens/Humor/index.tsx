import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Modal,
  Platform,
  TextInput,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../store/useStore';
import { HorasSono, QualidadeSono } from '../../types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { BarChartCard, ChartPoint } from '../../components/ClinicaCharts';
import { AppButton, AppCard, AppModal, StatusBadge, useFeedback } from '../../components/ui';
import { colors, spacing, radii } from '../../theme/tokens';
import { styles } from './styles';
import {
  CONTATOS_CRISE,
  ETAPAS_GROUNDING_54321,
  FASES_RESPIRACAO_478,
  FASES_RESPIRACAO_DIAFRAGMATICA,
} from './regulacaoEmocional';
import {
  GAD7_PERGUNTAS,
  OPCOES_TRIAGEM,
  PHQ9_PERGUNTAS,
  ResultadoClassificacao,
  TipoQuestionario,
  classificarGAD7,
  classificarPHQ9,
} from './questionarios';

type MoodScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Humor'>;

interface Props {
  navigation: MoodScreenNavigationProp;
}

const MOODS = [
  { id: 'feliz', label: 'Feliz', emoji: '😊', color: '#10B981', bgColor: '#D1FAE5' },
  { id: 'triste', label: 'Triste', emoji: '😢', color: '#3B82F6', bgColor: '#DBEAFE' },
  { id: 'nervoso', label: 'Nervoso', emoji: '😠', color: '#EF4444', bgColor: '#FEE2E2' },
  { id: 'ansioso', label: 'Ansioso', emoji: '😰', color: '#8B5CF6', bgColor: '#EDE9FE' },
];

const ACTIVITIES = [
  'Trabalho', 'Família', 'Saúde', 'Sono',
  'Relacionamentos', 'Estudos', 'Lazer', 'Finanças'
];

const HORAS_SONO: HorasSono[] = ['Menos de 5h', '5 a 6h', '7 a 8h', 'Mais de 8h'];
const QUALIDADES_SONO: { id: QualidadeSono; emoji: string }[] = [
  { id: 'Ruim', emoji: '😫' },
  { id: 'Regular', emoji: '😐' },
  { id: 'Boa', emoji: '😴' },
];
const ANOTACAO_MAX = 500;

export default function MoodScreen({ navigation }: Props) {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [anotacao, setAnotacao] = useState('');
  const [horasSono, setHorasSono] = useState<HorasSono | null>(null);
  const [qualidadeSono, setQualidadeSono] = useState<QualidadeSono | null>(null);

  // T6: Modais de Apoio Emocional Imediato (SOS) e Regulação (Respiração 4-7-8 / Grounding 5-4-3-2-1)
  const { showAlert } = useFeedback();
  const [sosModalVisible, setSosModalVisible] = useState(false);
  const [regulacaoModalVisible, setRegulacaoModalVisible] = useState(false);
  const [abaRegulacao, setAbaRegulacao] = useState<'respiracao' | 'grounding'>('respiracao');
  const [tecnicaResp, setTecnicaResp] = useState<'478' | 'diafragmatica'>('478');
  const [respiracaoAtiva, setRespiracaoAtiva] = useState(false);
  const [faseIndex, setFaseIndex] = useState(0);
  const [segundosRestantes, setSegundosRestantes] = useState(FASES_RESPIRACAO_478[0].duracaoSegundos);
  const [ciclosConcluidos, setCiclosConcluidos] = useState(0);
  const [groundingMarcados, setGroundingMarcados] = useState<string[]>([]);

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
        showAlert('Atendimento', `Disque diretamente para ${nome} no telefone informado.`);
      }
    } catch {
      showAlert('Atendimento', `Disque diretamente para ${nome} no telefone informado.`);
    }
  };

  const toggleGrounding = (id: string) => {
    setGroundingMarcados((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Estados dos Questionários PHQ-9 e GAD-7 (RF41)
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

  const mostrarAlerta = (titulo: string, mensagem: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert(`${titulo}\n\n${mensagem}`);
    } else {
      Alert.alert(titulo, mensagem);
    }
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
    mostrarAlerta(selectedActivity ? 'Excelente!' : 'Tudo certo!', mensagem);
    setSelectedMood(null);
    setSelectedActivity(null);
    setAnotacao('');
    setHorasSono(null);
    setQualidadeSono(null);
  };

  const handleSave = () => {
    if (!selectedMood) {
      mostrarAlerta('Ops!', 'Por favor, selecione como você está se sentindo hoje.');
      return;
    }

    if (!selectedActivity) {
      const msgSemAtividade = 'Seu humor foi registrado com sucesso. 🌟';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const confirmar = window.confirm(
          'Faltou um detalhe\n\nSelecionar o que influenciou seu humor ajuda muito a equipe de psicologia a entender seu padrão de comportamento. Deseja salvar mesmo assim?'
        );
        if (confirmar) {
          salvarRegistro(selectedMood, msgSemAtividade);
        }
        return;
      }

      Alert.alert(
        'Faltou um detalhe',
        'Selecionar o que influenciou seu humor ajuda muito a equipe de psicologia a entender seu padrão de comportamento. Deseja salvar mesmo assim?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Salvar sem atividade',
            onPress: () => salvarRegistro(selectedMood, msgSemAtividade),
          }
        ]
      );
      return;
    }

    salvarRegistro(selectedMood, 'Registro completo salvo com sucesso. Isso ajuda muito na sua análise comportamental. 🌟');
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
      mostrarAlerta('Atenção', 'Responda todas as perguntas para calcular o escore.');
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

  const getMoodConfig = (moodId: string) => {
    return MOODS.find(m => m.id === moodId) || MOODS[0];
  };

  // Frequência de humores nos últimos 7 dias (RF37)
  const moodFrequencyData: ChartPoint[] = useMemo(() => {
    const agora = Date.now();
    const seteDiasMs = 7 * 24 * 60 * 60 * 1000;
    const recentes = (humorHistorico || []).filter((h) => {
      const t = new Date(h.data).getTime();
      return !isNaN(t) && agora - t <= seteDiasMs;
    });

    if (recentes.length === 0) {
      return [];
    }

    return MOODS.map((m) => {
      const count = recentes.filter((h) => h.moodId === m.id).length;
      return {
        label: `${m.emoji} ${m.label}`,
        value: count,
        displayValue: `${count}x`,
        color: m.color,
      };
    });
  }, [humorHistorico]);

  // Merge histories and sort desc
  const mergedHistory = [
    ...(humorHistorico || []).map(h => ({ type: 'humor' as const, data: h.data, item: h })),
    ...(avaliacoesPsicologia || []).map(a => ({ type: 'avaliacao' as const, data: a.data, item: a })),
    ...(sinaisVitais || []).map(s => ({ type: 'sinal' as const, data: s.data, item: s }))
  ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={styles.title}>Saúde Mental (Psicologia & Humor)</Text>
          <Text style={styles.subtitle}>Acompanhe seu bem-estar psicológico e físico</Text>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              minWidth: 150,
              backgroundColor: colors.semantic.dangerBg,
              borderWidth: 1,
              borderColor: colors.semantic.dangerBorder,
              borderRadius: radii.md,
              padding: spacing.md,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
            onPress={() => setSosModalVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="call" size={20} color={colors.semantic.danger} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: colors.semantic.danger, fontSize: 14 }}>
                Preciso de ajuda agora
              </Text>
              <Text style={{ fontSize: 12, color: colors.text.secondary }}>CVV 188 · Apoio imediato</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flex: 1,
              minWidth: 150,
              backgroundColor: colors.areas.psicologia.bg,
              borderWidth: 1,
              borderColor: colors.areas.psicologia.color,
              borderRadius: radii.md,
              padding: spacing.md,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
            onPress={() => setRegulacaoModalVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="leaf" size={20} color={colors.areas.psicologia.color} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: colors.areas.psicologia.color, fontSize: 14 }}>
                Respiração & Grounding
              </Text>
              <Text style={{ fontSize: 12, color: colors.text.secondary }}>4-7-8 · Técnica 5-4-3-2-1</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.moodGrid}>
          {MOODS.map((mood) => {
            const isSelected = selectedMood === mood.id;

            return (
              <TouchableOpacity
                key={mood.id}
                style={[
                  styles.moodCard,
                  isSelected && {
                    borderColor: mood.color,
                    backgroundColor: '#FFFFFF',
                    shadowColor: mood.color,
                    shadowOpacity: 0.15,
                    elevation: 8,
                    transform: [{ scale: 1.02 }]
                  }
                ]}
                onPress={() => setSelectedMood(mood.id)}
                activeOpacity={0.8}
              >
                <View style={[
                  styles.emojiContainer,
                  isSelected ? { backgroundColor: mood.bgColor } : {}
                ]}>
                  <Text style={styles.emoji}>{mood.emoji}</Text>
                </View>
                <Text style={[
                  styles.moodLabel,
                  isSelected && { color: mood.color, fontWeight: '700' }
                ]}>{mood.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.activityContainer}>
          <Text style={styles.sectionTitle}>O que mais influenciou hoje? (opcional)</Text>
          <View style={styles.activityScroll}>
            {ACTIVITIES.map((activity) => (
              <TouchableOpacity
                key={activity}
                style={[
                  styles.activityChip,
                  selectedActivity === activity && styles.activityChipSelected
                ]}
                onPress={() => setSelectedActivity(selectedActivity === activity ? null : activity)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.activityChipText,
                  selectedActivity === activity && styles.activityChipTextSelected
                ]}>
                  {activity}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.activityContainer}>
          <Text style={styles.sectionTitle}>🌙 Como você dormiu? (opcional)</Text>
          <Text style={styles.fieldLabel}>Horas de sono</Text>
          <View style={[styles.activityScroll, styles.fieldGroup]} accessibilityRole="radiogroup" accessibilityLabel="Horas de sono">
            {HORAS_SONO.map((horas) => {
              const ativo = horasSono === horas;
              return (
                <TouchableOpacity
                  key={horas}
                  style={[styles.activityChip, ativo && styles.activityChipSelected]}
                  onPress={() => setHorasSono(ativo ? null : horas)}
                  activeOpacity={0.7}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: ativo }}
                >
                  <Text style={[styles.activityChipText, ativo && styles.activityChipTextSelected]}>{horas}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.fieldLabel}>Qualidade do sono</Text>
          <View style={styles.activityScroll} accessibilityRole="radiogroup" accessibilityLabel="Qualidade do sono">
            {QUALIDADES_SONO.map((q) => {
              const ativo = qualidadeSono === q.id;
              return (
                <TouchableOpacity
                  key={q.id}
                  style={[styles.activityChip, ativo && styles.activityChipSelected]}
                  onPress={() => setQualidadeSono(ativo ? null : q.id)}
                  activeOpacity={0.7}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: ativo }}
                  accessibilityLabel={`Sono ${q.id}`}
                >
                  <Text style={[styles.activityChipText, ativo && styles.activityChipTextSelected]}>
                    {q.emoji} {q.id}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.activityContainer}>
          <Text style={styles.sectionTitle}>📝 Como foi seu dia? (opcional)</Text>
          <TextInput
            style={styles.diaryInput}
            placeholder="Escreva livremente sobre seu dia, pensamentos ou sentimentos (opcional)"
            placeholderTextColor="#6B7280"
            value={anotacao}
            onChangeText={setAnotacao}
            multiline
            maxLength={ANOTACAO_MAX}
            textAlignVertical="top"
            accessibilityLabel="Diário: como foi seu dia?"
          />
          <Text style={styles.diaryCounter}>{anotacao.length}/{ANOTACAO_MAX}</Text>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, !selectedMood && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!selectedMood}
          accessibilityState={{ disabled: !selectedMood }}
          activeOpacity={0.8}
        >
          <Text style={[styles.saveButtonText, !selectedMood && { color: '#4B5563' }]}>
            {selectedMood ? 'Salvar Registro Psicológico' : 'Selecione um humor acima para salvar'}
          </Text>
        </TouchableOpacity>

        {/* Triagem Clínica: PHQ-9 e GAD-7 (RF41) */}
        <View style={styles.screeningSection}>
          <Text style={styles.sectionTitle}>Questionários de Triagem (RF41)</Text>
          <Text style={styles.screeningSubtitle}>
            Avaliações validadas para acompanhar sinais de depressão e ansiedade com resultado orientativo.
          </Text>

          <View style={styles.screeningRow}>
            <TouchableOpacity
              style={styles.screeningCard}
              onPress={() => iniciarQuestionario('PHQ-9')}
              activeOpacity={0.8}
            >
              <View style={[styles.screeningBadge, { backgroundColor: '#DBEAFE' }]}>
                <Text style={[styles.screeningBadgeText, { color: '#1D4ED8' }]}>9 PERGUNTAS</Text>
              </View>
              <Text style={styles.screeningCardTitle}>Teste PHQ-9</Text>
              <Text style={styles.screeningCardDesc}>Triagem orientativa para sintomas de depressão e humor.</Text>
              <Text style={styles.screeningCardAction}>Iniciar PHQ-9 →</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.screeningCard}
              onPress={() => iniciarQuestionario('GAD-7')}
              activeOpacity={0.8}
            >
              <View style={[styles.screeningBadge, { backgroundColor: '#EDE9FE' }]}>
                <Text style={[styles.screeningBadgeText, { color: '#6D28D9' }]}>7 PERGUNTAS</Text>
              </View>
              <Text style={styles.screeningCardTitle}>Teste GAD-7</Text>
              <Text style={styles.screeningCardDesc}>Triagem orientativa para sintomas de ansiedade.</Text>
              <Text style={styles.screeningCardAction}>Iniciar GAD-7 →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Gráfico Semanal de Frequência de Humores (RF37) */}
        <BarChartCard
          title="📊 Frequência de Humores na Semana (RF37)"
          subtitle="Quantas vezes cada estado emocional foi registrado nos últimos 7 dias."
          data={moodFrequencyData}
          emptyMessage="Registre seu humor durante os últimos 7 dias para acompanhar a distribuição emocional da semana."
        />

        <View style={styles.historyContainer}>
          <Text style={styles.historyTitle}>Linha do Tempo (Humor, Triagens & Sinais)</Text>

          {mergedHistory.length === 0 ? (
            <Text style={styles.emptyHistory}>Você ainda não possui registros.</Text>
          ) : (
            mergedHistory.slice(0, 10).map((record) => {
              if (record.type === 'humor') {
                const h = record.item;
                const moodConfig = getMoodConfig(h.moodId);
                return (
                  <View key={`humor-${h.id}`} style={styles.historyCard}>
                    <View style={[styles.historyEmojiContainer, { backgroundColor: moodConfig.bgColor }]}>
                      <Text style={styles.historyEmoji}>{moodConfig.emoji}</Text>
                    </View>
                    <View style={styles.historyContent}>
                      <Text style={styles.historyMoodName}>{moodConfig.label}</Text>
                      <Text style={styles.historyDate}>
                        {new Date(h.data).toLocaleDateString('pt-BR')} às {new Date(h.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      {h.activity ? (
                        <Text style={styles.historyActivity}>Influência: {h.activity}</Text>
                      ) : null}
                      {h.horasSono || h.qualidadeSono ? (
                        <Text style={styles.historyActivity}>
                          🌙 Sono: {[h.horasSono, h.qualidadeSono && `qualidade ${h.qualidadeSono.toLowerCase()}`].filter(Boolean).join(' · ')}
                        </Text>
                      ) : null}
                      {h.anotacao ? (
                        <Text style={styles.historyNote}>“{h.anotacao}”</Text>
                      ) : null}
                    </View>
                  </View>
                );
              } else if (record.type === 'avaliacao') {
                const a = record.item;
                return (
                  <View key={`aval-${a.id}`} style={styles.historyCard}>
                    <View style={[styles.historyEmojiContainer, { backgroundColor: '#EDE9FE' }]}>
                      <Text style={styles.historyEmoji}>📋</Text>
                    </View>
                    <View style={styles.historyContent}>
                      <Text style={styles.historyMoodName}>
                        {a.tipo}: {a.pontuacao}/{a.maxPontuacao} pts — {a.classificacao}
                      </Text>
                      <Text style={styles.historyDate}>
                        {new Date(a.data).toLocaleDateString('pt-BR')} às {new Date(a.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <Text style={styles.historyActivity}>{a.orientacao}</Text>
                    </View>
                  </View>
                );
              } else {
                const s = record.item;
                return (
                  <View key={`sinal-${s.id}`} style={styles.historyCard}>
                    <View style={[styles.historyEmojiContainer, { backgroundColor: '#F0F0F5' }]}>
                      <Text style={styles.historyEmoji}>🩺</Text>
                    </View>
                    <View style={styles.historyContent}>
                      <Text style={styles.historyMoodName}>Sinais Vitais</Text>
                      <Text style={styles.historyDate}>
                        {new Date(s.data).toLocaleDateString('pt-BR')} às {new Date(s.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <Text style={styles.historyActivity}>
                        {s.bpm ? `❤️ ${s.bpm} bpm` : ''}
                        {s.glicose ? `${s.bpm ? ' | ' : ''}🩸 ${s.glicose} mg/dL` : ''}
                        {s.pressao ? `${s.bpm || s.glicose ? ' | ' : ''}🩺 ${s.pressao}` : ''}
                        {s.oxigenacao ? ` | 🫁 ${s.oxigenacao}%` : ''}
                        {s.temperatura ? ` | 🌡️ ${s.temperatura}°C` : ''}
                      </Text>
                    </View>
                  </View>
                );
              }
            })
          )}
        </View>

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Modal Questionário PHQ-9 / GAD-7 */}
      <Modal
        visible={activeQuiz !== null}
        transparent
        animationType="slide"
        onRequestClose={fecharQuestionario}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>
                {activeQuiz === 'PHQ-9' ? 'Questionário PHQ-9 (Depressão)' : 'Questionário GAD-7 (Ansiedade)'}
              </Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={fecharQuestionario}>
                <Text style={styles.modalCloseText}>Fechar</Text>
              </TouchableOpacity>
            </View>

            {quizResult === null ? (
              <ScrollView showsVerticalScrollIndicator={false}>
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
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                        {op.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                <View style={styles.modalNavRow}>
                  {stepIndex > 0 && (
                    <TouchableOpacity
                      style={styles.modalBackStepBtn}
                      onPress={() => setStepIndex(stepIndex - 1)}
                    >
                      <Text style={styles.modalBackStepText}>Anterior</Text>
                    </TouchableOpacity>
                  )}

                  {stepIndex < perguntasAtuais.length - 1 ? (
                    <TouchableOpacity
                      style={[styles.modalNextBtn, respostaAtual < 0 && { opacity: 0.5 }]}
                      onPress={() => {
                        if (respostaAtual < 0) {
                          mostrarAlerta('Atenção', 'Selecione uma opção para avançar.');
                          return;
                        }
                        setStepIndex(stepIndex + 1);
                      }}
                    >
                      <Text style={styles.modalNextBtnText}>Próxima</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.modalNextBtn, { backgroundColor: '#10B981' }, respostaAtual < 0 && { opacity: 0.5 }]}
                      onPress={finalizarQuestionario}
                    >
                      <Text style={styles.modalNextBtnText}>Calcular Resultado</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
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
                  <View style={styles.crisisAlertBox}>
                    <Text style={styles.crisisAlertTitle}>Apoio Emocional Imediato</Text>
                    <Text style={styles.crisisAlertText}>
                      Você não precisa passar por isso sozinho(a). Ligue gratuitamente para o CVV pelo número 188
                      (atendimento 24h) ou procure o CAPS / pronto-atendimento mais próximo.
                    </Text>
                    <View style={{ marginTop: 10 }}>
                      <AppButton
                        title="Abrir contatos de apoio (188 / 192)"
                        variant="danger"
                        icon="call"
                        onPress={() => {
                          fecharQuestionario();
                          setSosModalVisible(true);
                        }}
                      />
                    </View>
                  </View>
                )}

                <Text style={styles.resultDisclaimer}>
                  Este questionário é uma ferramenta de triagem orientativa e não substitui diagnóstico médico ou
                  psicológico. O resultado foi salvo no seu histórico local.
                </Text>

                <TouchableOpacity style={styles.modalNextBtn} onPress={fecharQuestionario}>
                  <Text style={styles.modalNextBtnText}>Concluir e Ver Histórico</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

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
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
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
              <Text style={{ fontSize: 14, color: colors.text.secondary, marginBottom: 10 }}>
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
          <AppButton title="Fechar" variant="outline" onPress={() => setRegulacaoModalVisible(false)} />
        }
      >
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <AppButton
              title="Respiração Guiada"
              variant={abaRegulacao === 'respiracao' ? 'primary' : 'outline'}
              compact
              style={{ flex: 1 }}
              onPress={() => setAbaRegulacao('respiracao')}
            />
            <AppButton
              title="Grounding 5-4-3-2-1"
              variant={abaRegulacao === 'grounding' ? 'primary' : 'outline'}
              compact
              style={{ flex: 1 }}
              onPress={() => setAbaRegulacao('grounding')}
            />
          </View>

          {abaRegulacao === 'respiracao' ? (
            <View style={{ gap: spacing.md }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <AppButton
                  title="Técnica 4-7-8"
                  variant={tecnicaResp === '478' ? 'secondary' : 'ghost'}
                  compact
                  style={{ flex: 1 }}
                  onPress={() => setTecnicaResp('478')}
                />
                <AppButton
                  title="Diafragmática (4-2-6)"
                  variant={tecnicaResp === 'diafragmatica' ? 'secondary' : 'ghost'}
                  compact
                  style={{ flex: 1 }}
                  onPress={() => setTecnicaResp('diafragmatica')}
                />
              </View>

              <AppCard variant="outlined" style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
                <StatusBadge label={`Ciclos concluídos: ${ciclosConcluidos}`} tone="info" />
                <Text style={{ fontSize: 22, fontWeight: '800', color: colors.areas.psicologia.color, marginTop: 12 }}>
                  {faseAtualResp.label}
                </Text>
                <Text style={{ fontSize: 44, fontWeight: '800', color: colors.text.primary, marginVertical: 6 }}>
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
              <Text style={{ fontSize: 14, color: colors.text.secondary }}>
                Marque cada sentido conforme você observa o ambiente com calma ({groundingMarcados.length}/5):
              </Text>
              {ETAPAS_GROUNDING_54321.map((etapa) => {
                const marcado = groundingMarcados.includes(etapa.id);
                return (
                  <TouchableOpacity
                    key={etapa.id}
                    onPress={() => toggleGrounding(etapa.id)}
                    activeOpacity={0.8}
                  >
                    <AppCard
                      variant={marcado ? 'alert' : 'outlined'}
                      tone={marcado ? 'success' : 'info'}
                    >
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
                          <Text style={{ fontSize: 12, color: colors.text.muted, marginTop: 2 }}>
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
    </SafeAreaView>
  );
}
