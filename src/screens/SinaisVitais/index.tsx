import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { BarChartCard, ChartPoint } from '../../components/ClinicaCharts';
import {
  AppButton,
  AppCard,
  AppModal,
  ChipSelector,
  EmptyState,
  ScreenShell,
  StatusBadge,
  StepperInput,
  useFeedback,
} from '../../components/ui';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { VITALS_LIMITS, obterFaixaGlicose } from '../../services/clinicaHelpers';
import {
  NOTIFICATION_CHANNELS,
  initializeNotifications,
  sendImmediateNotification,
} from '../../services/notifications';
import { getHojeLocalKey } from '../../services/sync';
import { useStore } from '../../store/useStore';
import { colors, spacing } from '../../theme/tokens';
import { SinalVital } from '../../types';
import { styles } from './styles';

type VitalsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SinaisVitais'>;

interface Props {
  navigation: VitalsScreenNavigationProp;
}

const BASIC_MOODS = ['Bem', 'Neutro', 'Mal'];
const GLICOSE_TIPOS = ['Jejum', 'Pré-prandial', 'Pós-prandial'] as const;

const CHECKLIST_CUIDADOS_ITENS = [
  { id: 'higiene_bucal', titulo: 'Higiene bucal e corporal', desc: 'Escovação dentária, banho assistido e limpeza da pele.' },
  { id: 'hidratacao', titulo: 'Hidratação e cuidado com a pele', desc: 'Ingestão adequada de água e hidratação cutânea.' },
  { id: 'decubito', titulo: 'Mudança de posição (decúbito)', desc: 'Alternar posição a cada 2h para prevenção de lesões por pressão.' },
  { id: 'inspecao_pele', titulo: 'Inspeção de pontos de pressão', desc: 'Checar calcanhares, região sacral, cotovelos e curativos.' },
  { id: 'medicacao', titulo: 'Medicações do turno conferidas', desc: 'Conferir horários, doses prescritas e aceitação.' },
  { id: 'ambiente', titulo: 'Ambiente ventilado e seguro', desc: 'Leito organizado, boa ventilação e prevenção de quedas.' },
];

const VITALS_CONFIG = VITALS_LIMITS;

export default function TelaSinaisVitais({ navigation }: Props) {
  const { showAlert, showToast, confirm } = useFeedback();

  const [bpm, setBpm] = useState('');
  const [glucose, setGlucose] = useState('');
  const [glicoseTipo, setGlicoseTipo] = useState<string | null>(null);
  const [pressaoSistolica, setPressaoSistolica] = useState('');
  const [pressaoDiastolica, setPressaoDiastolica] = useState('');
  const [oxigenacao, setOxigenacao] = useState('');
  const [temperatura, setTemperatura] = useState('');
  const [humor, setHumor] = useState<string | null>(null);
  const [exercicio, setExercicio] = useState<boolean | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [checklistModalVisible, setChecklistModalVisible] = useState(false);
  const [chartMetric, setChartMetric] = useState<
    'bpm' | 'glicose' | 'pressao' | 'oxigenacao' | 'temperatura'
  >('bpm');

  const scrollViewRef = useRef<ScrollView>(null);
  const lastNotificationTime = useRef<Record<string, number>>({});

  const addSinalVital = useStore((state) => state.addSinalVital);
  const updateSinalVital = useStore((state) => state.updateSinalVital);
  const removeSinalVital = useStore((state) => state.removeSinalVital);
  const historico = useStore((state) => state.sinaisVitais || []);
  const checklistCuidados = useStore((state) => state.checklistCuidados);
  const setChecklistCuidados = useStore((state) => state.setChecklistCuidados);

  const areaAccent = colors.areas.enfermagem;
  const hojeKey = getHojeLocalKey();
  const itensChecklistHoje =
    checklistCuidados?.data === hojeKey ? checklistCuidados.itensConcluidos || [] : [];

  const toggleChecklistItem = (id: string) => {
    const exists = itensChecklistHoje.includes(id);
    const next = exists
      ? itensChecklistHoje.filter((item) => item !== id)
      : [...itensChecklistHoje, id];
    setChecklistCuidados({ data: hojeKey, itensConcluidos: next });
  };

  useEffect(() => {
    initializeNotifications().catch(() => {});
  }, []);

  const triggerInstantNotification = async (title: string, body: string) => {
    const key = `${title}:${body}`;
    const now = Date.now();
    if (lastNotificationTime.current[key] && now - lastNotificationTime.current[key] < 8000) {
      return;
    }
    lastNotificationTime.current[key] = now;

    try {
      await sendImmediateNotification({
        title,
        body,
        channelId: NOTIFICATION_CHANNELS.ALERTAS_SAUDE,
        highPriority: true,
      });
    } catch {
      // Ignora em ambiente sem permissão/web
    }
  };

  useEffect(() => {
    if (!bpm) return;
    const t = setTimeout(() => {
      const val = parseInt(bpm, 10);
      if (
        !isNaN(val) &&
        (val < VITALS_CONFIG.bpm.healthyMin || val > VITALS_CONFIG.bpm.healthyMax)
      ) {
        triggerInstantNotification(
          'Alerta: Batimentos Cardíacos',
          `Frequência cardíaca em ${val} bpm (faixa saudável: ${VITALS_CONFIG.bpm.healthyMin}-${VITALS_CONFIG.bpm.healthyMax} bpm).`
        );
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [bpm]);

  useEffect(() => {
    if (!glucose || !glicoseTipo) return;
    const t = setTimeout(() => {
      const val = parseInt(glucose, 10);
      if (!isNaN(val)) {
        const { min: gMin, max: gMax } = obterFaixaGlicose(glicoseTipo);
        if (val < gMin || val > gMax) {
          triggerInstantNotification(
            `Alerta: Glicemia (${glicoseTipo})`,
            `Glicemia em ${val} mg/dL (faixa saudável: ${gMin}-${gMax} mg/dL).`
          );
        }
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [glucose, glicoseTipo]);

  useEffect(() => {
    if (!pressaoSistolica || !pressaoDiastolica) return;
    const t = setTimeout(() => {
      const sys = parseInt(pressaoSistolica, 10);
      const dia = parseInt(pressaoDiastolica, 10);
      if (!isNaN(sys) && !isNaN(dia)) {
        const alerts: string[] = [];
        if (
          sys < VITALS_CONFIG.pressaoSistolica.healthyMin ||
          sys > VITALS_CONFIG.pressaoSistolica.healthyMax
        ) {
          alerts.push(
            `Sistólica em ${sys} mmHg (saudável: ${VITALS_CONFIG.pressaoSistolica.healthyMin}-${VITALS_CONFIG.pressaoSistolica.healthyMax}).`
          );
        }
        if (
          dia < VITALS_CONFIG.pressaoDiastolica.healthyMin ||
          dia > VITALS_CONFIG.pressaoDiastolica.healthyMax
        ) {
          alerts.push(
            `Diastólica em ${dia} mmHg (saudável: ${VITALS_CONFIG.pressaoDiastolica.healthyMin}-${VITALS_CONFIG.pressaoDiastolica.healthyMax}).`
          );
        }
        const diff = sys - dia;
        if (diff < 30) {
          alerts.push(`Pressão convergente (diferença de ${diff} mmHg).`);
        } else if (diff > 60) {
          alerts.push(`Pressão divergente (diferença de ${diff} mmHg).`);
        }
        if (alerts.length > 0) {
          triggerInstantNotification('Alerta: Pressão Arterial', alerts.join('\n'));
        }
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [pressaoSistolica, pressaoDiastolica]);

  useEffect(() => {
    if (!oxigenacao) return;
    const t = setTimeout(() => {
      const val = parseInt(oxigenacao, 10);
      if (!isNaN(val) && val < VITALS_CONFIG.oxigenacao.healthyMin) {
        triggerInstantNotification(
          'Alerta: Saturação de Oxigênio',
          `SpO2 em ${val}% (saudável >= ${VITALS_CONFIG.oxigenacao.healthyMin}%).`
        );
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [oxigenacao]);

  useEffect(() => {
    if (!temperatura) return;
    const t = setTimeout(() => {
      const clean = temperatura.replace(',', '.').trim();
      if (!clean || clean.endsWith('.')) return;
      const val = parseFloat(clean);
      if (!isNaN(val) && val >= 25 && val <= 45) {
        if (val > 37.8) {
          triggerInstantNotification(
            'Alerta: Febre Detectada',
            `Temperatura em ${val.toFixed(1)} °C (> 37.8 °C). Hidrate-se e procure orientação se persistir.`
          );
        } else if (val < 35.0) {
          triggerInstantNotification(
            'Alerta: Hipotermia Detectada',
            `Temperatura em ${val.toFixed(1)} °C (< 35.0 °C). Mantenha-se aquecido e procure avaliação clínica.`
          );
        }
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [temperatura]);

  const handleIntInput = (
    text: string,
    field: 'bpm' | 'glicose' | 'pressaoSistolica' | 'pressaoDiastolica' | 'oxigenacao'
  ) => {
    const config = VITALS_CONFIG[field];
    const cleaned = text.replace(/[^\d]/g, '');
    const setFn =
      field === 'bpm'
        ? setBpm
        : field === 'glicose'
          ? (v: string) => {
              setGlucose(v);
              if (!v) setGlicoseTipo(null);
            }
          : field === 'pressaoSistolica'
            ? setPressaoSistolica
            : field === 'pressaoDiastolica'
              ? setPressaoDiastolica
              : setOxigenacao;

    if (!cleaned) {
      setFn('');
      return;
    }
    const num = parseInt(cleaned, 10);
    setFn(num > config.max ? String(config.max) : cleaned);
  };

  const handleTempChange = (text: string) => {
    let cleaned = text.replace(/[^\d.,]/g, '').replace(',', '.');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    if (cleaned.includes('.')) {
      const [intPart, decPart] = cleaned.split('.');
      cleaned = intPart.slice(0, 2) + '.' + decPart.slice(0, 1);
    } else {
      cleaned = cleaned.slice(0, 2);
    }
    setTemperatura(cleaned);
  };

  const resetForm = () => {
    setBpm('');
    setGlucose('');
    setGlicoseTipo(null);
    setPressaoSistolica('');
    setPressaoDiastolica('');
    setOxigenacao('');
    setTemperatura('');
    setHumor(null);
    setExercicio(null);
    setEditingId(null);
  };

  const handleStartEdit = (registro: SinalVital) => {
    setEditingId(registro.id);
    setBpm(registro.bpm || '');
    setGlucose(registro.glicose || '');
    setGlicoseTipo(registro.glicoseTipo || null);

    if (registro.pressao && registro.pressao.includes('/')) {
      const [sys, dia] = registro.pressao.split('/');
      setPressaoSistolica((sys || '').trim());
      setPressaoDiastolica((dia || '').trim());
    } else {
      setPressaoSistolica('');
      setPressaoDiastolica('');
    }

    setOxigenacao(registro.oxigenacao || '');
    setTemperatura(registro.temperatura || '');
    setHumor(registro.humor || null);
    setExercicio(registro.exercicio !== undefined ? registro.exercicio : null);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleDeleteRecord = (id: string) => {
    confirm({
      title: 'Excluir registro',
      message: 'Deseja realmente remover esta medição dos últimos registros?',
      confirmText: 'Excluir',
      destructive: true,
      onConfirm: () => {
        removeSinalVital(id);
        if (editingId === id) {
          resetForm();
        }
        showToast('Medição removida.', 'info');
      },
    });
  };

  const checkVitalsAndNotifyOnSave = async (
    bpmVal: number,
    glucoseVal: number,
    glucoseTypeVal: string | null,
    sysVal: number,
    diaVal: number,
    oxVal: number,
    tempVal: number
  ): Promise<boolean> => {
    const alerts: string[] = [];

    if (
      !isNaN(bpmVal) &&
      (bpmVal < VITALS_CONFIG.bpm.healthyMin || bpmVal > VITALS_CONFIG.bpm.healthyMax)
    ) {
      alerts.push(
        `Batimentos Cardíacos: ${bpmVal} bpm (saudável: ${VITALS_CONFIG.bpm.healthyMin}-${VITALS_CONFIG.bpm.healthyMax})`
      );
    }

    if (!isNaN(glucoseVal) && glucoseTypeVal) {
      const { min: gMin, max: gMax } = obterFaixaGlicose(glucoseTypeVal);
      if (glucoseVal < gMin || glucoseVal > gMax) {
        alerts.push(
          `Glicemia (${glucoseTypeVal}): ${glucoseVal} mg/dL (saudável: ${gMin}-${gMax})`
        );
      }
    }

    if (
      !isNaN(sysVal) &&
      (sysVal < VITALS_CONFIG.pressaoSistolica.healthyMin ||
        sysVal > VITALS_CONFIG.pressaoSistolica.healthyMax)
    ) {
      alerts.push(
        `Pressão Sistólica: ${sysVal} mmHg (saudável: ${VITALS_CONFIG.pressaoSistolica.healthyMin}-${VITALS_CONFIG.pressaoSistolica.healthyMax})`
      );
    }

    if (
      !isNaN(diaVal) &&
      (diaVal < VITALS_CONFIG.pressaoDiastolica.healthyMin ||
        diaVal > VITALS_CONFIG.pressaoDiastolica.healthyMax)
    ) {
      alerts.push(
        `Pressão Diastólica: ${diaVal} mmHg (saudável: ${VITALS_CONFIG.pressaoDiastolica.healthyMin}-${VITALS_CONFIG.pressaoDiastolica.healthyMax})`
      );
    }

    if (!isNaN(sysVal) && !isNaN(diaVal)) {
      const pulsePressure = sysVal - diaVal;
      if (pulsePressure < 30) {
        alerts.push(`Pressão convergente (diferença de ${pulsePressure} mmHg).`);
      } else if (pulsePressure > 60) {
        alerts.push(`Pressão divergente (diferença de ${pulsePressure} mmHg).`);
      }
    }

    if (!isNaN(oxVal) && oxVal < VITALS_CONFIG.oxigenacao.healthyMin) {
      alerts.push(
        `Saturação de Oxigênio: ${oxVal}% (saudável >= ${VITALS_CONFIG.oxigenacao.healthyMin}%)`
      );
    }

    if (!isNaN(tempVal)) {
      if (tempVal > 37.8) {
        alerts.push(`Temperatura Corporal: ${tempVal.toFixed(1)} °C — Febre (> 37.8 °C)`);
      } else if (tempVal < 35.0) {
        alerts.push(`Temperatura Corporal: ${tempVal.toFixed(1)} °C — Hipotermia (< 35.0 °C)`);
      }
    }

    if (alerts.length > 0) {
      try {
        await sendImmediateNotification({
          title: 'Resumo de Sinais Vitais Fora da Faixa',
          body: alerts.join('\n'),
          channelId: NOTIFICATION_CHANNELS.ALERTAS_SAUDE,
        });
      } catch {
        // Ignora falha de permissão
      }

      showAlert(
        'Alerta Clínico',
        'Os seguintes sinais registrados requerem atenção:\n\n' +
          alerts.map((a) => `• ${a}`).join('\n') +
          '\n\nRepouse e procure avaliação profissional se os valores persistirem.'
      );
      return true;
    }
    return false;
  };

  const hasGlucose = glucose.length > 0;
  const isGlucoseValid = !hasGlucose || (hasGlucose && glicoseTipo !== null);
  const isPressaoValid =
    (pressaoSistolica.length > 0 && pressaoDiastolica.length > 0) ||
    (pressaoSistolica.length === 0 && pressaoDiastolica.length === 0);
  const tempClean = temperatura.replace(',', '.').trim();
  const tempParsed = tempClean ? parseFloat(tempClean) : NaN;
  const isTempValid =
    !tempClean || (!isNaN(tempParsed) && tempParsed >= 30 && tempParsed <= 43 && !tempClean.endsWith('.'));
  const hasAnyVital =
    bpm.length > 0 ||
    hasGlucose ||
    (pressaoSistolica.length > 0 && pressaoDiastolica.length > 0) ||
    oxigenacao.length > 0 ||
    tempClean.length > 0 ||
    humor !== null ||
    exercicio !== null;
  const isFormValid = hasAnyVital && isGlucoseValid && isPressaoValid && isTempValid;

  const handleSave = () => {
    try {
      if (!isFormValid) {
        if (!isGlucoseValid) {
          showAlert(
            'Atenção',
            'Como a glicose foi preenchida, selecione o tipo de medição (Jejum, Pré-prandial ou Pós-prandial).'
          );
        } else if (!isPressaoValid) {
          showAlert(
            'Atenção',
            'Para registrar a pressão arterial, preencha tanto a Sistólica quanto a Diastólica.'
          );
        } else if (!isTempValid) {
          showAlert('Atenção', 'Informe uma temperatura corporal válida entre 30.0 °C e 43.0 °C.');
        } else {
          showAlert('Atenção', 'Preencha pelo menos um sinal vital ou informação para registrar.');
        }
        return;
      }

      const bpmNum = parseInt(bpm, 10);
      const glucoseNum = parseInt(glucose, 10);
      const sysNum = parseInt(pressaoSistolica, 10);
      const diaNum = parseInt(pressaoDiastolica, 10);
      const oxNum = parseInt(oxigenacao, 10);
      const tempNum = tempClean ? parseFloat(tempClean) : NaN;

      const pressaoConsolidada =
        pressaoSistolica && pressaoDiastolica ? `${pressaoSistolica}/${pressaoDiastolica}` : undefined;
      const payload = {
        bpm,
        glicose: glucose,
        glicoseTipo: glicoseTipo || undefined,
        pressao: pressaoConsolidada,
        oxigenacao,
        temperatura: tempClean ? tempNum.toFixed(1) : undefined,
        humor: humor !== null ? humor : undefined,
        exercicio: exercicio !== null ? exercicio : undefined,
      };

      const estavaEditando = editingId !== null;
      if (editingId) {
        updateSinalVital(editingId, payload);
      } else {
        addSinalVital(payload);
      }

      const msgSucesso = estavaEditando
        ? 'Medição de sinais vitais atualizada com sucesso.'
        : 'Sinais vitais registrados com sucesso.';

      checkVitalsAndNotifyOnSave(bpmNum, glucoseNum, glicoseTipo, sysNum, diaNum, oxNum, tempNum)
        .then((hadAlerts) => {
          if (!hadAlerts) {
            showToast(msgSucesso, 'success');
          }
        })
        .catch(() => {
          showToast(msgSucesso, 'success');
        });

      resetForm();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Falha inesperada.';
      showAlert('Erro', `Ocorreu um erro ao salvar: ${msg}`);
    }
  };

  // Feedbacks inline para StepperInput
  const bpmFeedback = useMemo(() => {
    const v = parseInt(bpm, 10);
    if (!bpm || isNaN(v)) return null;
    if (v < VITALS_CONFIG.bpm.healthyMin || v > VITALS_CONFIG.bpm.healthyMax) {
      return {
        tone: 'danger' as const,
        label: 'Atenção',
        detail: `Referência repouso: ${VITALS_CONFIG.bpm.healthyMin}–${VITALS_CONFIG.bpm.healthyMax} bpm.`,
      };
    }
    return { tone: 'success' as const, label: 'Normal' };
  }, [bpm]);

  const glicoseFeedback = useMemo(() => {
    const v = parseInt(glucose, 10);
    if (!glucose || isNaN(v)) return null;
    const faixa = obterFaixaGlicose(glicoseTipo);
    if (v < faixa.min || v > faixa.max) {
      return {
        tone: 'danger' as const,
        label: 'Fora da faixa',
        detail: `Referência ${glicoseTipo || 'geral'}: ${faixa.min}–${faixa.max} mg/dL.`,
      };
    }
    return { tone: 'success' as const, label: 'Normal' };
  }, [glucose, glicoseTipo]);

  const sysFeedback = useMemo(() => {
    const v = parseInt(pressaoSistolica, 10);
    if (!pressaoSistolica || isNaN(v)) return null;
    if (
      v < VITALS_CONFIG.pressaoSistolica.healthyMin ||
      v > VITALS_CONFIG.pressaoSistolica.healthyMax
    ) {
      return {
        tone: 'warning' as const,
        label: v > VITALS_CONFIG.pressaoSistolica.healthyMax ? 'Elevada' : 'Baixa',
        detail: `Referência: ${VITALS_CONFIG.pressaoSistolica.healthyMin}–${VITALS_CONFIG.pressaoSistolica.healthyMax} mmHg.`,
      };
    }
    return { tone: 'success' as const, label: 'Normal' };
  }, [pressaoSistolica]);

  const diaFeedback = useMemo(() => {
    const v = parseInt(pressaoDiastolica, 10);
    if (!pressaoDiastolica || isNaN(v)) return null;
    if (
      v < VITALS_CONFIG.pressaoDiastolica.healthyMin ||
      v > VITALS_CONFIG.pressaoDiastolica.healthyMax
    ) {
      return {
        tone: 'warning' as const,
        label: v > VITALS_CONFIG.pressaoDiastolica.healthyMax ? 'Elevada' : 'Baixa',
        detail: `Referência: ${VITALS_CONFIG.pressaoDiastolica.healthyMin}–${VITALS_CONFIG.pressaoDiastolica.healthyMax} mmHg.`,
      };
    }
    return { tone: 'success' as const, label: 'Normal' };
  }, [pressaoDiastolica]);

  const oxFeedback = useMemo(() => {
    const v = parseInt(oxigenacao, 10);
    if (!oxigenacao || isNaN(v)) return null;
    if (v < VITALS_CONFIG.oxigenacao.healthyMin) {
      return {
        tone: 'danger' as const,
        label: 'Baixa',
        detail: `Recomendado >= ${VITALS_CONFIG.oxigenacao.healthyMin}%.`,
      };
    }
    return { tone: 'success' as const, label: 'Normal' };
  }, [oxigenacao]);

  const tempFeedback = useMemo(() => {
    if (!tempClean || tempClean.endsWith('.') || isNaN(tempParsed) || tempParsed < 25) return null;
    if (tempParsed > 37.8) {
      return {
        tone: 'danger' as const,
        label: 'Febre',
        detail: 'Acima de 37.8 °C. Hidrate-se e monitore.',
      };
    }
    if (tempParsed < 35.0) {
      return {
        tone: 'info' as const,
        label: 'Hipotermia',
        detail: 'Abaixo de 35.0 °C. Aqueça-se e procure orientação.',
      };
    }
    return { tone: 'success' as const, label: 'Normal' };
  }, [tempClean, tempParsed]);

  const chartConfig = useMemo(() => {
    const metrics: {
      id: typeof chartMetric;
      label: string;
      subtitle: string;
      unit: string;
      maxScale?: number;
    }[] = [
      {
        id: 'bpm',
        label: 'BPM',
        subtitle: `Faixa saudável: ${VITALS_CONFIG.bpm.healthyMin} a ${VITALS_CONFIG.bpm.healthyMax} bpm`,
        unit: '',
      },
      {
        id: 'glicose',
        label: 'Glicose',
        subtitle: `Referência geral: ${VITALS_CONFIG.glicose.healthyMin} a ${VITALS_CONFIG.glicose.healthyMax} mg/dL`,
        unit: '',
      },
      {
        id: 'pressao',
        label: 'Pressão',
        subtitle: `Sistólica saudável: ${VITALS_CONFIG.pressaoSistolica.healthyMin} a ${VITALS_CONFIG.pressaoSistolica.healthyMax} mmHg`,
        unit: '',
      },
      {
        id: 'oxigenacao',
        label: 'SpO₂',
        subtitle: `Saturação recomendada >= ${VITALS_CONFIG.oxigenacao.healthyMin}%`,
        unit: '%',
        maxScale: 100,
      },
      {
        id: 'temperatura',
        label: 'Temp.',
        subtitle: `Temperatura normal: ${VITALS_CONFIG.temperatura.healthyMin.toFixed(1)} a ${VITALS_CONFIG.temperatura.healthyMax.toFixed(1)} °C`,
        unit: '°',
        maxScale: 43,
      },
    ];

    const current = metrics.find((m) => m.id === chartMetric) || metrics[0];
    const points: ChartPoint[] = [];

    historico.forEach((h) => {
      const dateObj = new Date(h.data);
      const label = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

      if (chartMetric === 'bpm' && h.bpm) {
        const val = parseInt(h.bpm, 10);
        if (!isNaN(val) && val > 0) {
          points.push({
            label,
            value: val,
            displayValue: `${val}`,
            color:
              val < VITALS_CONFIG.bpm.healthyMin || val > VITALS_CONFIG.bpm.healthyMax
                ? colors.semantic.danger
                : colors.semantic.success,
          });
        }
      } else if (chartMetric === 'glicose' && h.glicose) {
        const val = parseInt(h.glicose, 10);
        if (!isNaN(val) && val > 0) {
          points.push({
            label,
            value: val,
            displayValue: `${val}`,
            color: val < 70 || val > 140 ? colors.semantic.danger : colors.semantic.success,
          });
        }
      } else if (chartMetric === 'pressao' && h.pressao) {
        const [sysRaw] = h.pressao.split('/');
        const sysVal = parseInt((sysRaw || '').trim(), 10);
        if (!isNaN(sysVal) && sysVal > 0) {
          points.push({
            label,
            value: sysVal,
            displayValue: h.pressao,
            color:
              sysVal < VITALS_CONFIG.pressaoSistolica.healthyMin ||
              sysVal > VITALS_CONFIG.pressaoSistolica.healthyMax
                ? colors.semantic.danger
                : colors.semantic.success,
          });
        }
      } else if (chartMetric === 'oxigenacao' && h.oxigenacao) {
        const val = parseInt(h.oxigenacao, 10);
        if (!isNaN(val) && val > 0) {
          points.push({
            label,
            value: val,
            displayValue: `${val}%`,
            color:
              val < VITALS_CONFIG.oxigenacao.healthyMin
                ? colors.semantic.danger
                : colors.semantic.success,
          });
        }
      } else if (chartMetric === 'temperatura' && h.temperatura) {
        const val = parseFloat(h.temperatura);
        if (!isNaN(val) && val > 0) {
          points.push({
            label,
            value: val,
            displayValue: `${val.toFixed(1)}°`,
            color: val > 37.8 || val < 35.0 ? colors.semantic.danger : colors.semantic.success,
          });
        }
      }
    });

    return {
      metrics,
      current,
      data: points.slice(-7),
    };
  }, [historico, chartMetric]);

  return (
    <ScreenShell
      title="Sinais Vitais"
      subtitle="Acompanhamento de enfermagem, alertas clínicos e cuidados diários."
      areaBadge={{ label: 'Enfermagem', color: areaAccent.color, bg: areaAccent.bg }}
      scrollRef={scrollViewRef}
      onBack={() => navigation.goBack()}
    >
      <View style={styles.stack}>
        {editingId && (
          <AppCard variant="alert" tone="warning">
            <View style={styles.editingRow}>
              <Ionicons name="create-outline" size={20} color={colors.semantic.warning} />
              <Text style={styles.editingText}>
                Editando uma medição existente. Ajuste os valores e toque em Salvar Alterações.
              </Text>
              <AppButton title="Cancelar" variant="outline" compact onPress={resetForm} />
            </View>
          </AppCard>
        )}

        <AppCard variant="elevated">
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="pulse-outline" size={20} color={areaAccent.color} />
              <Text style={styles.sectionTitle}>Nova Aferição de Sinais Vitais</Text>
            </View>
          </View>

          <StepperInput
            label="Batimentos Cardíacos (FC)"
            value={bpm}
            onChangeText={(t) => handleIntInput(t, 'bpm')}
            min={VITALS_CONFIG.bpm.min}
            max={VITALS_CONFIG.bpm.max}
            defaultStart={75}
            unit="bpm"
            placeholder="Ex: 72"
            statusFeedback={bpmFeedback}
          />

          <StepperInput
            label="Glicemia Capilar"
            value={glucose}
            onChangeText={(t) => handleIntInput(t, 'glicose')}
            min={VITALS_CONFIG.glicose.min}
            max={VITALS_CONFIG.glicose.max}
            defaultStart={95}
            unit="mg/dL"
            placeholder="Ex: 98"
            statusFeedback={glicoseFeedback}
          />

          {hasGlucose && (
            <ChipSelector
              label="Momento da medição de glicemia *"
              options={[...GLICOSE_TIPOS]}
              selected={glicoseTipo}
              onSelect={(t) => setGlicoseTipo(t)}
              accentColor={areaAccent.color}
              accentBg={areaAccent.bg}
            />
          )}

          <View style={styles.formDivider} />

          <StepperInput
            label="Pressão Sistólica (Máxima)"
            value={pressaoSistolica}
            onChangeText={(t) => handleIntInput(t, 'pressaoSistolica')}
            min={VITALS_CONFIG.pressaoSistolica.min}
            max={VITALS_CONFIG.pressaoSistolica.max}
            defaultStart={120}
            unit="mmHg"
            placeholder="Ex: 120"
            statusFeedback={sysFeedback}
          />

          <StepperInput
            label="Pressão Diastólica (Mínima)"
            value={pressaoDiastolica}
            onChangeText={(t) => handleIntInput(t, 'pressaoDiastolica')}
            min={VITALS_CONFIG.pressaoDiastolica.min}
            max={VITALS_CONFIG.pressaoDiastolica.max}
            defaultStart={80}
            unit="mmHg"
            placeholder="Ex: 80"
            statusFeedback={diaFeedback}
          />

          <StepperInput
            label="Saturação de Oxigênio (SpO₂)"
            value={oxigenacao}
            onChangeText={(t) => handleIntInput(t, 'oxigenacao')}
            min={VITALS_CONFIG.oxigenacao.min}
            max={VITALS_CONFIG.oxigenacao.max}
            defaultStart={98}
            unit="%"
            placeholder="Ex: 98"
            statusFeedback={oxFeedback}
          />

          <StepperInput
            label="Temperatura Corporal"
            value={temperatura}
            onChangeText={handleTempChange}
            min={VITALS_CONFIG.temperatura.min}
            max={VITALS_CONFIG.temperatura.max}
            step={0.1}
            defaultStart={36.5}
            decimal
            maxLength={4}
            unit="°C"
            placeholder="Ex: 36.6"
            statusFeedback={tempFeedback}
          />

          <View style={styles.formDivider} />

          <ChipSelector
            label="Estado geral no momento (opcional)"
            options={BASIC_MOODS}
            selected={humor}
            onSelect={(m) => setHumor(humor === m ? null : m)}
            accentColor={areaAccent.color}
            accentBg={areaAccent.bg}
          />

          <ChipSelector
            label="Praticou atividade física hoje? (opcional)"
            options={[
              { value: 'sim', label: 'Sim' },
              { value: 'nao', label: 'Não' },
            ]}
            selected={exercicio === true ? 'sim' : exercicio === false ? 'nao' : null}
            onSelect={(v) => {
              const boolVal = v === 'sim';
              setExercicio(exercicio === boolVal ? null : boolVal);
            }}
            accentColor={areaAccent.color}
            accentBg={areaAccent.bg}
          />

          <AppButton
            title={editingId ? 'Salvar Alterações' : 'Salvar Sinais Vitais'}
            icon="checkmark-circle-outline"
            variant="primary"
            onPress={handleSave}
          />
        </AppCard>

        <AppCard variant="default">
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.semantic.success} />
              <Text style={styles.sectionTitle}>Checklist Diário de Cuidados</Text>
            </View>
            <StatusBadge
              label={`${itensChecklistHoje.length}/${CHECKLIST_CUIDADOS_ITENS.length} hoje`}
              tone={
                itensChecklistHoje.length === CHECKLIST_CUIDADOS_ITENS.length ? 'success' : 'info'
              }
            />
          </View>
          <Text style={styles.sectionSub}>
            Acompanhamento de rotina de higiene, prevenção de lesões e segurança no domicílio.
          </Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${
                    (itensChecklistHoje.length / CHECKLIST_CUIDADOS_ITENS.length) * 100
                  }%`,
                },
              ]}
            />
          </View>
          <AppButton
            title="Abrir Checklist de Cuidados"
            icon="checkbox-outline"
            variant="secondary"
            onPress={() => setChecklistModalVisible(true)}
          />
        </AppCard>

        <BarChartCard
          title="Evolução dos Sinais Vitais"
          subtitle={chartConfig.current.subtitle}
          unit={chartConfig.current.unit}
          maxScale={chartConfig.current.maxScale}
          data={chartConfig.data}
          emptyMessage={`Sem medições suficientes de ${chartConfig.current.label} para gerar o gráfico.`}
          legend={[
            { label: 'Dentro da faixa', color: colors.semantic.success },
            { label: 'Requer atenção', color: colors.semantic.danger },
          ]}
        >
          <View style={styles.metricTabsRow}>
            {chartConfig.metrics.map((metric) => {
              const active = chartMetric === metric.id;
              return (
                <TouchableOpacity
                  key={metric.id}
                  style={[styles.metricTab, active && styles.metricTabActive]}
                  onPress={() => setChartMetric(metric.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.metricTabText, active && styles.metricTabTextActive]}>
                    {metric.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </BarChartCard>

        <AppCard variant="default">
          <Text style={[styles.sectionTitle, { marginBottom: spacing.md }]}>Últimos Registros</Text>
          {historico.length === 0 ? (
            <EmptyState
              icon="pulse-outline"
              title="Nenhuma medição registrada"
              description="Preencha os indicadores acima para iniciar o acompanhamento dos seus sinais vitais."
            />
          ) : (
            <View style={styles.historyList}>
              {historico
                .slice()
                .reverse()
                .slice(0, 10)
                .map((h) => {
                  const dateObj = new Date(h.data);
                  const isBeingEdited = editingId === h.id;
                  return (
                    <View
                      key={h.id}
                      style={[styles.historyCard, isBeingEdited && styles.historyCardEditing]}
                    >
                      <View style={styles.historyDateBox}>
                        <Text style={styles.historyTime}>
                          {dateObj.toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                        <Text style={styles.historyDate}>
                          {dateObj.toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                          })}
                        </Text>
                      </View>

                      <View style={styles.historyValuesWrap}>
                        {h.pressao ? (
                          <View style={styles.valueLine}>
                            <Ionicons name="fitness-outline" size={16} color={areaAccent.color} />
                            <Text style={styles.valueText}>PA {h.pressao} mmHg</Text>
                          </View>
                        ) : null}
                        {h.bpm ? (
                          <View style={styles.valueLine}>
                            <Ionicons name="heart-outline" size={16} color={areaAccent.color} />
                            <Text style={styles.valueText}>{h.bpm} bpm</Text>
                          </View>
                        ) : null}
                        {h.glicose ? (
                          <View style={styles.valueLine}>
                            <Ionicons name="water-outline" size={16} color={colors.brand.primary} />
                            <Text style={styles.valueText}>
                              {h.glicose} mg/dL {h.glicoseTipo ? `(${h.glicoseTipo})` : ''}
                            </Text>
                          </View>
                        ) : null}
                        {h.oxigenacao ? (
                          <View style={styles.valueLine}>
                            <Ionicons name="pulse-outline" size={16} color={colors.brand.teal} />
                            <Text style={styles.valueText}>{h.oxigenacao}% SpO₂</Text>
                          </View>
                        ) : null}
                        {h.temperatura ? (
                          <View style={styles.valueLine}>
                            <Ionicons
                              name="thermometer-outline"
                              size={16}
                              color={colors.semantic.warning}
                            />
                            <Text style={styles.valueText}>{h.temperatura} °C</Text>
                          </View>
                        ) : null}
                        {(h.humor || h.exercicio !== undefined) && (
                          <Text style={{ fontSize: 13, color: colors.text.secondary, marginTop: 2 }}>
                            {[
                              h.humor ? `Estado: ${h.humor}` : '',
                              h.exercicio !== undefined
                                ? `Exercício: ${h.exercicio ? 'Sim' : 'Não'}`
                                : '',
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </Text>
                        )}
                      </View>

                      <View style={styles.historyActionsCol}>
                        <TouchableOpacity
                          style={styles.iconActionBtn}
                          onPress={() => handleStartEdit(h)}
                          accessibilityLabel="Editar medição"
                        >
                          <Ionicons name="create-outline" size={18} color={colors.brand.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.iconActionBtn}
                          onPress={() => handleDeleteRecord(h.id)}
                          accessibilityLabel="Excluir medição"
                        >
                          <Ionicons name="trash-outline" size={18} color={colors.semantic.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
            </View>
          )}
        </AppCard>
      </View>

      <AppModal
        visible={checklistModalVisible}
        title="Checklist Diário de Cuidados"
        subtitle={`Concluídos hoje: ${itensChecklistHoje.length} de ${CHECKLIST_CUIDADOS_ITENS.length}`}
        onClose={() => setChecklistModalVisible(false)}
        footer={
          <AppButton
            title="Concluir"
            variant="primary"
            onPress={() => setChecklistModalVisible(false)}
          />
        }
      >
        <View>
          {CHECKLIST_CUIDADOS_ITENS.map((item) => {
            const checked = itensChecklistHoje.includes(item.id);
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.checklistItemRow, checked && styles.checklistItemChecked]}
                onPress={() => toggleChecklistItem(item.id)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={checked ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={checked ? colors.semantic.success : colors.text.secondary}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.checklistTitle, checked && styles.checklistTitleChecked]}>
                    {item.titulo}
                  </Text>
                  <Text style={styles.checklistDesc}>{item.desc}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
          {itensChecklistHoje.length === CHECKLIST_CUIDADOS_ITENS.length && (
            <AppCard variant="alert" tone="success" style={{ marginTop: spacing.xs }}>
              <Text style={[styles.checklistTitle, { color: colors.semantic.success }]}>
                Todos os cuidados diários básicos foram concluídos hoje!
              </Text>
            </AppCard>
          )}
        </View>
      </AppModal>
    </ScreenShell>
  );
}
