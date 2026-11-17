import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import {
  AppButton,
  AppCard,
  AppInput,
  AppModal,
  ChipSelector,
  EmptyState,
  PresetRemindersCard,
  ScreenShell,
  SegmentedTabs,
  StatusBadge,
  useFeedback,
} from '../../components/ui';
import { useStore } from '../../store/useStore';
import { Lembrete, LembreteAcao, LembreteRemedio, Medicamento } from '../../types';
import {
  avaliarValidadeMedicamento,
  calcularAdesaoSemanalLembretes,
  calcularAlternanciaDoseNaData,
  formatarMascaraHora,
  formatarMascaraMesAno,
  isLembreteConcluidoNaData,
} from '../../services/clinicaHelpers';
import { exportarProntuarioPdf } from '../../services/prontuarioPdf';
import { getHojeLocalKey } from '../../services/sync';
import {
  NOTIFICATION_CHANNELS,
  NotificationSchedule,
  WEEKDAYS,
  Weekday,
  cancelNotifications,
  initializeNotifications,
  scheduleNotification,
  sendTestNotification,
} from '../../services/notifications';
import { colors, spacing } from '../../theme/tokens';
import { styles } from './styles';

export type { Lembrete, LembreteRemedio, LembreteAcao, Medicamento };

type RemindersScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Lembretes'>;

interface Props {
  navigation: RemindersScreenNavigationProp;
}

const LEGACY_LEMBRETES_KEY = '@lembretes_saude_v4';
const LEGACY_MEDICAMENTOS_KEY = '@medicamentos_saude_v4';

const ARMAZENAMENTO_OPCOES = [
  'Temperatura ambiente',
  'Local seco e arejado',
  'Geladeira (2–8 °C)',
  'Proteger da luz',
];

const FORMA_OPCOES = ['Comprimido', 'Cápsula', 'Gotas', 'Xarope', 'Pomada'];

const MAIN_TABS: {
  key: 'lembretes' | 'farmacia';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'lembretes', label: 'Alarmes', icon: 'alarm-outline' },
  { key: 'farmacia', label: 'Estoque Farmácia', icon: 'medkit-outline' },
];

const CATEGORIA_TABS: {
  key: 'remedio' | 'acao';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'remedio', label: 'Remédio', icon: 'medical-outline' },
  { key: 'acao', label: 'Ação / Consulta', icon: 'calendar-outline' },
];

const TIPO_ACAO_OPTIONS: { value: LembreteAcao['tipoAcao']; label: string }[] = [
  { value: 'consulta', label: 'Ida a consultas' },
  { value: 'exercicio', label: 'Fazer exercícios' },
  { value: 'agua', label: 'Beber água' },
  { value: 'pressao', label: 'Medir pressão' },
  { value: 'fisioterapia', label: 'Fisioterapia / Postura' },
  { value: 'outro', label: 'Outros' },
];

export default function TelaLembretes({ navigation }: Props) {
  const { showAlert, showToast, confirm } = useFeedback();
  const [activeTab, setActiveTab] = useState<'lembretes' | 'farmacia'>('lembretes');

  const lembretes = useStore((state) => state.lembretes || []);
  const addLembrete = useStore((state) => state.addLembrete);
  const updateLembrete = useStore((state) => state.updateLembrete);
  const removeLembrete = useStore((state) => state.removeLembrete);
  const setLembretes = useStore((state) => state.setLembretes);

  const medicamentos = useStore((state) => state.medicamentos || []);
  const addMedicamento = useStore((state) => state.addMedicamento);
  const updateMedicamento = useStore((state) => state.updateMedicamento);
  const removeMedicamento = useStore((state) => state.removeMedicamento);
  const setMedicamentos = useStore((state) => state.setMedicamentos);

  const perfil = useStore((state) => state.perfil);
  const sinaisVitais = useStore((state) => state.sinaisVitais || []);
  const humorHistorico = useStore((state) => state.humorHistorico || []);
  const avaliacoesPsicologia = useStore((state) => state.avaliacoesPsicologia || []);
  const historicoDor = useStore((state) => state.historicoDor || []);
  const vacinas = useStore((state) => state.vacinas || []);

  const [filtro, setFiltro] = useState<'todos' | 'remedio' | 'acao'>('todos');
  const [buscaEstoque, setBuscaEstoque] = useState('');
  const [filtroEstoque, setFiltroEstoque] = useState<'todos' | 'baixo' | 'validade'>('todos');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingLembreteId, setEditingLembreteId] = useState<string | null>(null);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<'remedio' | 'acao'>('remedio');

  const [nomeRemedio, setNomeRemedio] = useState('');
  const [horarioRemedio, setHorarioRemedio] = useState('');
  const [frequenciaRemedio, setFrequenciaRemedio] = useState('');
  const [observacoesRemedio, setObservacoesRemedio] = useState('');

  const [tipoAcao, setTipoAcao] = useState<LembreteAcao['tipoAcao']>('agua');
  const [acaoPersonalizada, setAcaoPersonalizada] = useState('');
  const [horarioAcao, setHorarioAcao] = useState('');
  const [consultaLocal, setConsultaLocal] = useState('');
  const [consultaEspecialidade, setConsultaEspecialidade] = useState('');
  const [consultaPreparo, setConsultaPreparo] = useState('');

  const [medModalVisible, setMedModalVisible] = useState(false);
  const [editingMedId, setEditingMedId] = useState<string | null>(null);
  const [nomeMed, setNomeMed] = useState('');
  const [dosagemMed, setDosagemMed] = useState('');
  const [formaMed, setFormaMed] = useState('');
  const [estoqueMed, setEstoqueMed] = useState('');
  const [prescritorMed, setPrescritorMed] = useState('');
  const [validadeMed, setValidadeMed] = useState('');
  const [armazenamentoMed, setArmazenamentoMed] = useState('');

  const [periodicidade, setPeriodicidade] = useState<'diaria' | 'semanal' | 'dias_especificos'>('diaria');
  const [diasSelecionados, setDiasSelecionados] = useState<Weekday[]>([]);

  const areaAccent = colors.areas.farmacia;
  const hojeKey = getHojeLocalKey();

  useEffect(() => {
    const migrarDadosLegados = async () => {
      try {
        const [legacyLembRaw, legacyMedsRaw] = await Promise.all([
          AsyncStorage.getItem(LEGACY_LEMBRETES_KEY),
          AsyncStorage.getItem(LEGACY_MEDICAMENTOS_KEY),
        ]);

        if (legacyLembRaw) {
          const parsed = JSON.parse(legacyLembRaw);
          const estadoAtual = useStore.getState().lembretes || [];
          if (Array.isArray(parsed) && parsed.length > 0 && estadoAtual.length === 0) {
            const validos = parsed.filter(
              (item: { tipo?: string }) =>
                item && (item.tipo === 'remedio' || item.tipo === 'acao')
            ) as Lembrete[];
            if (validos.length > 0) setLembretes(validos);
          }
          await AsyncStorage.removeItem(LEGACY_LEMBRETES_KEY);
        }

        if (legacyMedsRaw) {
          const parsed = JSON.parse(legacyMedsRaw);
          const medsAtuais = useStore.getState().medicamentos || [];
          if (Array.isArray(parsed) && parsed.length > 0 && medsAtuais.length === 0) {
            const validos = parsed.filter((item: { nome?: string }) => item && item.nome) as Medicamento[];
            if (validos.length > 0) setMedicamentos(validos);
          }
          await AsyncStorage.removeItem(LEGACY_MEDICAMENTOS_KEY);
        }
      } catch {
        // Ignora erro pontual de migração
      }
    };

    void useStore
      .getState()
      .hydrateStore()
      .then(() => migrarDadosLegados());

    initializeNotifications().then((granted) => {
      if (!granted && Platform.OS !== 'web') {
        showToast('Sem permissão de notificações sonoras no aparelho.', 'warning');
      }
    });
  }, []);

  const montarSchedule = (horario: string): NotificationSchedule => {
    const [hourStr, minuteStr] = horario.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    if (periodicidade === 'semanal') {
      return {
        type: 'weekly',
        weekday: diasSelecionados[0] || 1,
        hour,
        minute,
      };
    }

    if (periodicidade === 'dias_especificos') {
      return {
        type: 'specificDays',
        weekdays: diasSelecionados.length > 0 ? diasSelecionados : [1, 2, 3, 4, 5, 6, 7],
        hour,
        minute,
      };
    }

    return { type: 'daily', hour, minute };
  };

  const agendarNotificacaoLembrete = async (
    tipo: 'remedio' | 'acao',
    dados: {
      nomeRemedio?: string;
      frequencia?: string;
      tipoAcao?: string;
      acaoPersonalizada?: string;
      consultaLocal?: string;
      consultaEspecialidade?: string;
      horario: string;
      schedule: NotificationSchedule;
    }
  ): Promise<string[]> => {
    if (Platform.OS === 'web') return [];
    try {
      let titulo = '';
      let corpo = '';

      if (tipo === 'remedio') {
        titulo = `Hora do Remédio: ${dados.nomeRemedio}`;
        corpo = `Frequência: ${dados.frequencia}`;
      } else {
        let textoAcao = '';
        switch (dados.tipoAcao) {
          case 'consulta':
            textoAcao = 'Ida a consultas';
            break;
          case 'exercicio':
            textoAcao = 'Fazer exercícios';
            break;
          case 'agua':
            textoAcao = 'Beber água';
            break;
          case 'pressao':
            textoAcao = 'Medir pressão';
            break;
          case 'fisioterapia':
            textoAcao = dados.acaoPersonalizada || 'Fisioterapia / Postura';
            break;
          case 'outro':
            textoAcao = dados.acaoPersonalizada || 'Ação de Saúde';
            break;
          default:
            textoAcao = 'Ação de Saúde';
        }
        titulo = `Lembrete de Ação: ${textoAcao}`;
        corpo =
          dados.tipoAcao === 'consulta' && (dados.consultaEspecialidade || dados.consultaLocal)
            ? [dados.consultaEspecialidade, dados.consultaLocal].filter(Boolean).join(' · ')
            : 'Está no horário do seu lembrete de saúde.';
      }

      return await scheduleNotification(
        {
          title: titulo,
          body: corpo,
          channelId: NOTIFICATION_CHANNELS.LEMBRETES,
        },
        dados.schedule
      );
    } catch {
      return [];
    }
  };

  const cancelarNotificacaoLembrete = async (
    notificationId?: string,
    notificationIds?: string[]
  ) => {
    if (Platform.OS === 'web') return;
    const ids = [notificationId, ...(notificationIds || [])].filter(Boolean) as string[];
    if (ids.length === 0) return;
    try {
      await cancelNotifications(ids);
    } catch {
      // Ignora erro pontual de cancelamento
    }
  };

  const limparCamposFormLembrete = () => {
    setEditingLembreteId(null);
    setCategoriaSelecionada('remedio');
    setNomeRemedio('');
    setHorarioRemedio('');
    setFrequenciaRemedio('');
    setObservacoesRemedio('');
    setTipoAcao('agua');
    setAcaoPersonalizada('');
    setHorarioAcao('');
    setConsultaLocal('');
    setConsultaEspecialidade('');
    setConsultaPreparo('');
    setPeriodicidade('diaria');
    setDiasSelecionados([]);
  };

  const handleAbrirNovoLembrete = () => {
    limparCamposFormLembrete();
    setModalVisible(true);
  };

  const handleAbrirEditarLembrete = (item: Lembrete) => {
    limparCamposFormLembrete();
    setEditingLembreteId(item.id);
    setCategoriaSelecionada(item.tipo);
    setPeriodicidade(item.periodicidade || 'diaria');
    setDiasSelecionados((item.diasSemana as Weekday[]) || []);

    if (item.tipo === 'remedio') {
      setNomeRemedio(item.nomeRemedio);
      setHorarioRemedio(item.horario);
      setFrequenciaRemedio(item.frequencia);
      setObservacoesRemedio(item.observacoes || '');
    } else {
      setTipoAcao(item.tipoAcao);
      setAcaoPersonalizada(item.acaoPersonalizada || '');
      setHorarioAcao(item.horario);
      setConsultaLocal(item.consultaLocal || '');
      setConsultaEspecialidade(item.consultaEspecialidade || '');
      setConsultaPreparo(item.consultaPreparo || '');
    }
    setModalVisible(true);
  };

  const handleSalvarLembrete = async () => {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

    if (periodicidade !== 'diaria' && diasSelecionados.length === 0) {
      showAlert('Atenção', 'Selecione pelo menos um dia da semana para a repetição.');
      return;
    }

    if (categoriaSelecionada === 'remedio') {
      if (!nomeRemedio.trim()) {
        showAlert('Atenção', 'Digite o nome do remédio.');
        return;
      }
      if (!horarioRemedio.trim() || !timeRegex.test(horarioRemedio.trim())) {
        showAlert('Atenção', 'Insira um horário válido no formato HH:MM (ex: 08:30).');
        return;
      }
      if (!frequenciaRemedio.trim()) {
        showAlert('Atenção', 'Defina a frequência do medicamento.');
        return;
      }

      if (editingLembreteId) {
        const existente = lembretes.find((l) => l.id === editingLembreteId);
        await cancelarNotificacaoLembrete(existente?.notificationId, existente?.notificationIds);
      }

      const schedule = montarSchedule(horarioRemedio.trim());
      const notifIds = await agendarNotificacaoLembrete('remedio', {
        nomeRemedio: nomeRemedio.trim(),
        frequencia: frequenciaRemedio.trim(),
        horario: horarioRemedio.trim(),
        schedule,
      });

      if (editingLembreteId) {
        updateLembrete(editingLembreteId, {
          nomeRemedio: nomeRemedio.trim(),
          horario: horarioRemedio.trim(),
          frequencia: frequenciaRemedio.trim(),
          observacoes: observacoesRemedio.trim() || undefined,
          notificationId: notifIds[0],
          notificationIds: notifIds,
          periodicidade,
          diasSemana: periodicidade !== 'diaria' ? diasSelecionados : undefined,
        });
      } else {
        addLembrete({
          tipo: 'remedio',
          concluido: false,
          nomeRemedio: nomeRemedio.trim(),
          horario: horarioRemedio.trim(),
          frequencia: frequenciaRemedio.trim(),
          observacoes: observacoesRemedio.trim() || undefined,
          notificationId: notifIds[0],
          notificationIds: notifIds,
          periodicidade,
          diasSemana: periodicidade !== 'diaria' ? diasSelecionados : undefined,
        });
      }
    } else {
      if (tipoAcao === 'outro' && !acaoPersonalizada.trim()) {
        showAlert('Atenção', 'Descreva qual ação você deseja lembrar.');
        return;
      }
      if (!horarioAcao.trim() || !timeRegex.test(horarioAcao.trim())) {
        showAlert('Atenção', 'Insira um horário válido no formato HH:MM (ex: 15:00).');
        return;
      }

      if (editingLembreteId) {
        const existente = lembretes.find((l) => l.id === editingLembreteId);
        await cancelarNotificacaoLembrete(existente?.notificationId, existente?.notificationIds);
      }

      const schedule = montarSchedule(horarioAcao.trim());
      const notifIds = await agendarNotificacaoLembrete('acao', {
        tipoAcao,
        acaoPersonalizada: acaoPersonalizada.trim(),
        consultaLocal: tipoAcao === 'consulta' ? consultaLocal.trim() || undefined : undefined,
        consultaEspecialidade:
          tipoAcao === 'consulta' ? consultaEspecialidade.trim() || undefined : undefined,
        horario: horarioAcao.trim(),
        schedule,
      });

      const camposConsulta =
        tipoAcao === 'consulta'
          ? {
              consultaLocal: consultaLocal.trim() || undefined,
              consultaEspecialidade: consultaEspecialidade.trim() || undefined,
              consultaPreparo: consultaPreparo.trim() || undefined,
            }
          : {
              consultaLocal: undefined,
              consultaEspecialidade: undefined,
              consultaPreparo: undefined,
            };

      if (editingLembreteId) {
        updateLembrete(editingLembreteId, {
          tipoAcao,
          acaoPersonalizada:
            tipoAcao === 'outro' || tipoAcao === 'fisioterapia'
              ? acaoPersonalizada.trim() || undefined
              : undefined,
          ...camposConsulta,
          horario: horarioAcao.trim(),
          notificationId: notifIds[0],
          notificationIds: notifIds,
          periodicidade,
          diasSemana: periodicidade !== 'diaria' ? diasSelecionados : undefined,
        });
      } else {
        addLembrete({
          tipo: 'acao',
          concluido: false,
          tipoAcao,
          acaoPersonalizada:
            tipoAcao === 'outro' || tipoAcao === 'fisioterapia'
              ? acaoPersonalizada.trim() || undefined
              : undefined,
          ...camposConsulta,
          horario: horarioAcao.trim(),
          notificationId: notifIds[0],
          notificationIds: notifIds,
          periodicidade,
          diasSemana: periodicidade !== 'diaria' ? diasSelecionados : undefined,
        });
      }
    }

    const estavaEditando = Boolean(editingLembreteId);
    setModalVisible(false);
    limparCamposFormLembrete();
    showToast(
      estavaEditando
        ? 'Lembrete e alarme atualizados com sucesso!'
        : 'Lembrete cadastrado e alarme programado!',
      'success'
    );
  };

  const handleAlternarConcluido = (item: Lembrete) => {
    const resultado = calcularAlternanciaDoseNaData(item, medicamentos, hojeKey);

    updateLembrete(item.id, {
      concluido: resultado.proximoStatus,
      dosesTomadasPorData: resultado.dosesTomadasPorData,
      dosesBaixadasPorData: resultado.dosesBaixadasPorData,
    });

    if (resultado.medicamentoAtualizado) {
      const med = resultado.medicamentoAtualizado;
      if (med.alteracao === 'baixou') {
        updateMedicamento(med.id, { estoque: String(med.novoEstoque) });
        if (med.novoEstoque <= 5) {
          showAlert(
            'Estoque Baixo',
            `Dose de "${med.nome}" registrada (-1 unidade no estoque).\nRestam apenas ${med.novoEstoque} unidade(s) — providencie reposição!`
          );
        } else {
          showToast(
            `Dose de "${med.nome}" confirmada (${med.novoEstoque} un. restantes).`,
            'success'
          );
        }
      } else if (med.alteracao === 'zerado') {
        showAlert(
          'Estoque Zerado',
          `Lembrete concluído, porém "${med.nome}" está com 0 unidades em estoque.`
        );
      }
    }
  };

  const handleExcluirLembrete = (
    id: string,
    notificationId?: string,
    notificationIds?: string[]
  ) => {
    confirm({
      title: 'Excluir Lembrete',
      message: 'Deseja excluir este lembrete? O alarme associado também será cancelado.',
      confirmText: 'Excluir',
      destructive: true,
      onConfirm: async () => {
        await cancelarNotificacaoLembrete(notificationId, notificationIds);
        removeLembrete(id);
        showToast('Lembrete excluído.', 'info');
      },
    });
  };

  const limparCamposMed = () => {
    setEditingMedId(null);
    setNomeMed('');
    setDosagemMed('');
    setFormaMed('');
    setEstoqueMed('');
    setPrescritorMed('');
    setValidadeMed('');
    setArmazenamentoMed('');
  };

  const handleAbrirNovoMed = () => {
    limparCamposMed();
    setMedModalVisible(true);
  };

  const handleAbrirEditarMed = (med: Medicamento) => {
    setEditingMedId(med.id);
    setNomeMed(med.nome);
    setDosagemMed(med.dosagem);
    setFormaMed(med.forma || '');
    setEstoqueMed(med.estoque || '0');
    setPrescritorMed(med.prescritor || '');
    setValidadeMed(med.validade || '');
    setArmazenamentoMed(med.armazenamento || '');
    setMedModalVisible(true);
  };

  const handleSaveMed = () => {
    if (!nomeMed.trim() || !dosagemMed.trim()) {
      showAlert('Atenção', 'Nome e dosagem do medicamento são obrigatórios.');
      return;
    }

    const nomeLower = nomeMed.toLowerCase();
    if (nomeLower.includes('aspirina') || nomeLower.trim() === 'aas') {
      showAlert(
        'Atenção: Interação',
        'Aspirina/AAS pode ter interação medicamentosa grave se combinada com anticoagulantes!'
      );
    }

    const dadosMed = {
      nome: nomeMed.trim(),
      dosagem: dosagemMed.trim(),
      forma: formaMed.trim() || 'Comprimido',
      estoque: estoqueMed.replace(/[^\d]/g, '') || '0',
      prescritor: prescritorMed.trim() || undefined,
      validade: validadeMed.trim() || undefined,
      armazenamento: armazenamentoMed.trim() || undefined,
    };

    if (editingMedId) {
      updateMedicamento(editingMedId, dadosMed);
    } else {
      addMedicamento({
        ...dadosMed,
        descontinuado: false,
        dataInicio: new Date().toISOString(),
      });
    }

    const estavaEditando = Boolean(editingMedId);
    setMedModalVisible(false);
    limparCamposMed();
    showToast(
      estavaEditando ? 'Medicamento atualizado no estoque!' : 'Medicamento adicionado ao estoque!',
      'success'
    );
  };

  const handleToggleDescontinuarMed = (med: Medicamento) => {
    if (med.descontinuado) {
      updateMedicamento(med.id, {
        descontinuado: false,
        dataTermino: undefined,
      });
      showToast(`"${med.nome}" voltou para o estoque ativo.`, 'success');
      return;
    }

    confirm({
      title: 'Descontinuar Medicamento',
      message: `Deseja mover "${med.nome}" para o histórico de medicamentos descontinuados?`,
      confirmText: 'Descontinuar',
      destructive: true,
      onConfirm: () => {
        updateMedicamento(med.id, {
          descontinuado: true,
          dataTermino: new Date().toISOString(),
        });
        showToast(`"${med.nome}" movido para descontinuados.`, 'info');
      },
    });
  };

  const handleDeleteMed = (id: string) => {
    confirm({
      title: 'Excluir do Estoque',
      message: 'Deseja remover este medicamento definitivamente da lista?',
      confirmText: 'Remover',
      destructive: true,
      onConfirm: () => {
        removeMedicamento(id);
        showToast('Medicamento removido.', 'info');
      },
    });
  };

  const handleGeneratePDF = async () => {
    if (medicamentos.length === 0) {
      showAlert('Atenção', 'Você não possui medicamentos em estoque para gerar o relatório.');
      return;
    }

    const rows = medicamentos
      .map((med) => {
        const qtd = parseInt(med.estoque || '0', 10) || 0;
        const statusTxt = med.descontinuado
          ? `Descontinuado${med.dataTermino ? ` (${new Date(med.dataTermino).toLocaleDateString('pt-BR')})` : ''}`
          : qtd <= 5
            ? 'Ativo (Estoque Baixo!)'
            : 'Ativo';
        return `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${med.nome}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${med.dosagem} (${med.forma})</td>
        <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${med.estoque}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${med.prescritor || '—'}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${med.validade || '—'}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${med.armazenamento || '—'}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${statusTxt}</td>
      </tr>`;
      })
      .join('');

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: sans-serif; padding: 20px; color: #1F2937; }
            h1 { color: #0B6E99; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th { background-color: #0B6E99; color: white; padding: 8px; text-align: left; }
          </style>
        </head>
        <body>
          <h1>Relatório de Medicamentos em Estoque</h1>
          <p>Gerado em ${new Date().toLocaleDateString('pt-BR')} pelo aplicativo <strong>Meu App de Saúde (UNC)</strong></p>
          <table>
            <thead>
              <tr>
                <th>Medicamento</th>
                <th>Dosagem / Forma</th>
                <th>Qtd</th>
                <th>Prescritor</th>
                <th>Validade</th>
                <th>Armazenamento</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `;

    try {
      if (Platform.OS === 'web') {
        await Print.printAsync({ html });
        return;
      }
      const { uri } = await Print.printToFileAsync({ html });
      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(uri);
      } else {
        await Print.printAsync({ html });
      }
    } catch {
      showAlert('Erro', 'Não foi possível gerar e exportar o relatório em PDF.');
    }
  };

  const handleGerarProntuarioCompleto = async () => {
    try {
      await exportarProntuarioPdf({
        perfil,
        medicamentos,
        sinaisVitais,
        humorHistorico,
        avaliacoesPsicologia,
        historicoDor,
        vacinas,
      });
    } catch {
      showAlert('Erro', 'Não foi possível gerar o resumo clínico consolidado em PDF.');
    }
  };

  const handleTestNotification = async () => {
    try {
      await sendTestNotification();
      showToast('Notificação de teste disparada.', 'info');
    } catch {
      showAlert('Erro', 'Falha ao disparar teste de notificação.');
    }
  };

  const descreverPeriodicidade = (item: Lembrete): string => {
    if (item.periodicidade === 'semanal') {
      const nomeDia = WEEKDAYS.find((w) => w.value === item.diasSemana?.[0])?.label || 'Semanal';
      return `Toda ${nomeDia}`;
    }
    if (
      item.periodicidade === 'dias_especificos' &&
      item.diasSemana &&
      item.diasSemana.length > 0
    ) {
      return item.diasSemana
        .map((d) => WEEKDAYS.find((w) => w.value === d)?.short)
        .filter(Boolean)
        .join(', ');
    }
    return 'Todos os dias';
  };

  const obterTextoAcao = (item: LembreteAcao) => {
    switch (item.tipoAcao) {
      case 'consulta':
        return 'Ida a consultas';
      case 'exercicio':
        return 'Fazer exercícios';
      case 'agua':
        return 'Beber água';
      case 'pressao':
        return 'Medir pressão';
      case 'fisioterapia':
        return item.acaoPersonalizada || 'Fisioterapia / Postura';
      case 'outro':
        return item.acaoPersonalizada || 'Outro Lembrete';
      default:
        return 'Ação de Saúde';
    }
  };

  const lembretesFiltrados = useMemo(
    () =>
      lembretes.filter((item) => {
        if (filtro === 'todos') return true;
        return item.tipo === filtro;
      }),
    [lembretes, filtro]
  );

  const medicamentosAtivos = useMemo(
    () => medicamentos.filter((m) => !m.descontinuado),
    [medicamentos]
  );

  const medicamentosDescontinuados = useMemo(
    () => medicamentos.filter((m) => Boolean(m.descontinuado)),
    [medicamentos]
  );

  const concluidosHojeCount = useMemo(
    () => lembretes.filter((l) => isLembreteConcluidoNaData(l, hojeKey)).length,
    [lembretes, hojeKey]
  );

  const resumoAdesao7d = useMemo(
    () => calcularAdesaoSemanalLembretes(lembretes),
    [lembretes]
  );

  const medicamentosAtivosFiltrados = useMemo(() => {
    const termo = buscaEstoque.trim().toLowerCase();
    return medicamentosAtivos.filter((med) => {
      if (termo) {
        const alvo = `${med.nome} ${med.dosagem} ${med.prescritor || ''}`.toLowerCase();
        if (!alvo.includes(termo)) return false;
      }
      if (filtroEstoque === 'baixo') {
        const q = parseInt(med.estoque || '0', 10);
        return !isNaN(q) && q <= 5;
      }
      if (filtroEstoque === 'validade') {
        const st = avaliarValidadeMedicamento(med.validade);
        return st === 'vencido' || st === 'proximo';
      }
      return true;
    });
  }, [medicamentosAtivos, buscaEstoque, filtroEstoque]);

  const alertasEstoque = useMemo(() => {
    const baixo = medicamentosAtivos.filter((m) => {
      const q = parseInt(m.estoque || '0', 10);
      return !isNaN(q) && q <= 5;
    }).length;
    const validade = medicamentosAtivos.filter((m) => {
      const st = avaliarValidadeMedicamento(m.validade);
      return st === 'vencido' || st === 'proximo';
    }).length;
    return { baixo, validade };
  }, [medicamentosAtivos]);

  return (
    <ScreenShell
      title="Lembretes & Farmácia"
      subtitle="Alarmes diários de medicação, cuidados e controle de estoque."
      areaBadge={{ label: 'Farmácia & Agenda', color: areaAccent.color, bg: areaAccent.bg }}
      onBack={() => navigation.goBack()}
    >
      <SegmentedTabs tabs={MAIN_TABS} activeKey={activeTab} onChange={setActiveTab} />

      {activeTab === 'lembretes' ? (
        <View style={styles.stack}>
          {lembretes.length > 0 && (
            <AppCard variant="elevated">
              <View style={styles.adherenceHeader}>
                <View style={styles.adherenceTitleRow}>
                  <Ionicons name="checkmark-done-circle-outline" size={20} color={areaAccent.color} />
                  <Text style={styles.sectionTitle}>Adesão de Hoje e 7 Dias</Text>
                </View>
                <StatusBadge
                  label={`${concluidosHojeCount}/${lembretes.length} hoje · ${resumoAdesao7d.percentual}% 7d`}
                  tone={concluidosHojeCount === lembretes.length ? 'success' : 'info'}
                />
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${
                        lembretes.length > 0 ? (concluidosHojeCount / lembretes.length) * 100 : 0
                      }%`,
                    },
                  ]}
                />
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginTop: spacing.md,
                  gap: 4,
                }}
              >
                {resumoAdesao7d.dias.map((dia) => {
                  const ok = dia.total > 0 && dia.concluidos === dia.total;
                  const parcial = dia.concluidos > 0 && dia.concluidos < dia.total;
                  return (
                    <View
                      key={dia.dataChave}
                      style={{
                        flex: 1,
                        alignItems: 'center',
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: ok
                          ? colors.semantic.successBg
                          : parcial
                            ? colors.semantic.warningBg
                            : colors.surface.subtle,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text.primary }}>
                        {dia.diaCurto}
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '600',
                          color: ok
                            ? colors.semantic.success
                            : parcial
                              ? colors.semantic.warning
                              : colors.text.muted,
                        }}
                      >
                        {dia.concluidos}/{dia.total}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </AppCard>
          )}

          <ChipSelector
            options={[
              { value: 'todos', label: 'Todos' },
              { value: 'remedio', label: 'Remédios' },
              { value: 'acao', label: 'Ações & Consultas' },
            ]}
            selected={filtro}
            onSelect={setFiltro}
            accentColor={areaAccent.color}
            accentBg={areaAccent.bg}
          />

          <View style={styles.actionsRow}>
            <View style={styles.actionFlex}>
              <AppButton
                title="Novo Lembrete"
                icon="add-circle-outline"
                variant="primary"
                onPress={handleAbrirNovoLembrete}
              />
            </View>
            {__DEV__ && (
              <AppButton
                title="Testar Notificação (Dev)"
                icon="notifications-outline"
                variant="outline"
                compact
                onPress={handleTestNotification}
              />
            )}
          </View>

          {lembretesFiltrados.length === 0 ? (
            <EmptyState
              icon="alarm-outline"
              title="Nenhum lembrete nesta categoria"
              description="Cadastre lembretes de medicamentos, consultas ou pausas diárias de cuidado."
              actionLabel="Cadastrar Lembrete"
              onAction={handleAbrirNovoLembrete}
            />
          ) : (
            <View style={styles.listStack}>
              {lembretesFiltrados.map((item) => {
                const isRemedio = item.tipo === 'remedio';
                const concluidoHoje = isLembreteConcluidoNaData(item, hojeKey);

                return (
                  <AppCard
                    key={item.id}
                    variant={concluidoHoje ? 'alert' : 'elevated'}
                    tone={concluidoHoje ? 'success' : 'info'}
                  >
                    <View style={styles.cardMainRow}>
                      <View style={styles.cardInfo}>
                        <View style={styles.cardTopRow}>
                          <Text style={[styles.cardTitle, concluidoHoje && styles.cardTitleDone]}>
                            {isRemedio ? item.nomeRemedio : obterTextoAcao(item)}
                          </Text>
                          <StatusBadge
                            label={isRemedio ? 'Remédio' : 'Ação'}
                            tone={isRemedio ? 'info' : 'neutral'}
                          />
                        </View>

                        <View style={styles.metaRow}>
                          <Ionicons name="time-outline" size={16} color={colors.text.secondary} />
                          <Text style={styles.metaText}>{item.horario}</Text>
                          <Text style={styles.metaText}>·</Text>
                          <Text style={styles.metaText}>{descreverPeriodicidade(item)}</Text>
                        </View>

                        {isRemedio && (
                          <View style={styles.metaRow}>
                            <Ionicons name="repeat-outline" size={16} color={colors.text.secondary} />
                            <Text style={styles.metaText}>Frequência: {item.frequencia}</Text>
                          </View>
                        )}

                        {isRemedio && item.observacoes ? (
                          <Text style={styles.notesText}>Obs.: {item.observacoes}</Text>
                        ) : null}

                        {!isRemedio &&
                          item.tipoAcao === 'consulta' &&
                          (item.consultaEspecialidade || item.consultaLocal || item.consultaPreparo) && (
                            <Text style={styles.notesText}>
                              {[
                                item.consultaEspecialidade && `Especialidade: ${item.consultaEspecialidade}`,
                                item.consultaLocal && `Local: ${item.consultaLocal}`,
                                item.consultaPreparo && `Preparo: ${item.consultaPreparo}`,
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </Text>
                          )}

                        {!isRemedio &&
                          item.tipoAcao === 'fisioterapia' &&
                          (item.fisioLocal || item.fisioTerapeuta || item.fisioOrientacoes) && (
                            <Text style={styles.notesText}>
                              {[
                                item.fisioLocal && `Local: ${item.fisioLocal}`,
                                item.fisioTerapeuta && `Profissional: ${item.fisioTerapeuta}`,
                                item.fisioOrientacoes,
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </Text>
                          )}
                      </View>

                      <View style={styles.cardActionsCol}>
                        <TouchableOpacity
                          style={[styles.iconBtn, concluidoHoje && styles.iconBtnDone]}
                          onPress={() => handleAlternarConcluido(item)}
                          accessibilityLabel={
                            concluidoHoje ? 'Desmarcar lembrete' : 'Concluir lembrete'
                          }
                        >
                          <Ionicons
                            name={concluidoHoje ? 'checkmark-circle' : 'ellipse-outline'}
                            size={22}
                            color={concluidoHoje ? colors.semantic.success : colors.text.secondary}
                          />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.iconBtn}
                          onPress={() => handleAbrirEditarLembrete(item)}
                          accessibilityLabel="Editar lembrete"
                        >
                          <Ionicons name="create-outline" size={19} color={colors.brand.primary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.iconBtn}
                          onPress={() =>
                            handleExcluirLembrete(
                              item.id,
                              item.notificationId,
                              item.notificationIds
                            )
                          }
                          accessibilityLabel="Excluir lembrete"
                        >
                          <Ionicons name="trash-outline" size={19} color={colors.semantic.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </AppCard>
                );
              })}
            </View>
          )}

          <PresetRemindersCard
            area="farmacia"
            title="Lembretes de Alimentação e Uso Seguro"
            subtitle="Inclui controle de açúcar/doces após refeições, organizador semanal e segurança medicamentosa."
          />
        </View>
      ) : (
        <View style={styles.stack}>
          {(alertasEstoque.baixo > 0 || alertasEstoque.validade > 0) && (
            <AppCard variant="alert" tone="warning">
              <View style={styles.bannerRow}>
                <Ionicons name="warning" size={22} color={colors.semantic.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Atenção ao Estoque</Text>
                  <Text style={styles.sectionSub}>
                    {[
                      alertasEstoque.baixo > 0
                        ? `${alertasEstoque.baixo} medicamento(s) com estoque baixo (<= 5)`
                        : '',
                      alertasEstoque.validade > 0
                        ? `${alertasEstoque.validade} item(ns) vencido(s) ou próximos do vencimento`
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
              </View>
            </AppCard>
          )}

          <View style={styles.actionsRow}>
            <View style={styles.actionFlex}>
              <AppButton
                title="Novo Medicamento"
                icon="add-circle-outline"
                variant="primary"
                onPress={handleAbrirNovoMed}
              />
            </View>
            <View style={styles.actionFlex}>
              <AppButton
                title="PDF do Estoque"
                icon="document-text-outline"
                variant="outline"
                onPress={handleGeneratePDF}
              />
            </View>
          </View>

          <AppButton
            title="Gerar Prontuário Clínico Completo (PDF)"
            icon="medkit-outline"
            variant="secondary"
            onPress={handleGerarProntuarioCompleto}
          />

          {medicamentosAtivos.length > 0 && (
            <AppCard variant="default">
              <AppInput
                label="Buscar no estoque"
                placeholder="Digite nome do remédio, dosagem ou médico..."
                value={buscaEstoque}
                onChangeText={setBuscaEstoque}
              />
              <ChipSelector
                label="Filtrar situação"
                options={[
                  { value: 'todos', label: 'Todos' },
                  { value: 'baixo', label: 'Estoque baixo' },
                  { value: 'validade', label: 'Vencendo / Vencidos' },
                ]}
                selected={filtroEstoque}
                onSelect={setFiltroEstoque}
                accentColor={areaAccent.color}
                accentBg={areaAccent.bg}
              />
            </AppCard>
          )}

          {medicamentosAtivosFiltrados.length === 0 ? (
            <EmptyState
              icon="medkit-outline"
              title={
                medicamentosAtivos.length === 0
                  ? 'Nenhum medicamento ativo no estoque'
                  : 'Nenhum medicamento encontrado'
              }
              description={
                medicamentosAtivos.length === 0
                  ? 'Adicione medicamentos para acompanhar estoque, validade, prescrição e armazenamento.'
                  : 'Tente limpar a busca ou selecionar outro filtro de situação.'
              }
              actionLabel={
                medicamentosAtivos.length === 0 ? 'Adicionar Medicamento' : 'Limpar Filtros'
              }
              onAction={() => {
                if (medicamentosAtivos.length === 0) {
                  handleAbrirNovoMed();
                } else {
                  setBuscaEstoque('');
                  setFiltroEstoque('todos');
                }
              }}
            />
          ) : (
            <View style={styles.listStack}>
              {medicamentosAtivosFiltrados.map((item) => {
                const estoqueNum = parseInt(item.estoque || '0', 10);
                const isEstoqueBaixo = !isNaN(estoqueNum) && estoqueNum <= 5;
                const statusValidade = avaliarValidadeMedicamento(item.validade);

                return (
                  <AppCard
                    key={item.id}
                    variant={isEstoqueBaixo || statusValidade === 'vencido' ? 'alert' : 'elevated'}
                    tone={statusValidade === 'vencido' ? 'danger' : isEstoqueBaixo ? 'warning' : 'info'}
                  >
                    <View style={styles.cardTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{item.nome}</Text>
                        <Text style={styles.metaText}>
                          {item.dosagem} · {item.forma}
                        </Text>
                      </View>
                      <StatusBadge
                        label={`Qtd: ${item.estoque}`}
                        tone={isEstoqueBaixo ? 'danger' : 'success'}
                      />
                    </View>

                    {(item.prescritor || item.validade || item.armazenamento) && (
                      <View style={styles.medMetaBox}>
                        {item.prescritor ? (
                          <View style={styles.metaRow}>
                            <Ionicons name="person-outline" size={15} color={colors.text.secondary} />
                            <Text style={styles.metaText}>Prescritor: {item.prescritor}</Text>
                          </View>
                        ) : null}
                        {item.validade ? (
                          <View style={styles.metaRow}>
                            <Ionicons
                              name="calendar-outline"
                              size={15}
                              color={
                                statusValidade === 'vencido'
                                  ? colors.semantic.danger
                                  : statusValidade === 'proximo'
                                    ? colors.semantic.warning
                                    : colors.text.secondary
                              }
                            />
                            <Text
                              style={[
                                styles.metaText,
                                statusValidade === 'vencido' && {
                                  color: colors.semantic.danger,
                                  fontWeight: '700',
                                },
                                statusValidade === 'proximo' && {
                                  color: colors.semantic.warning,
                                  fontWeight: '700',
                                },
                              ]}
                            >
                              Validade: {item.validade}
                              {statusValidade === 'vencido'
                                ? ' (Vencido)'
                                : statusValidade === 'proximo'
                                  ? ' (Vence em breve)'
                                  : ''}
                            </Text>
                          </View>
                        ) : null}
                        {item.armazenamento ? (
                          <View style={styles.metaRow}>
                            <Ionicons name="cube-outline" size={15} color={colors.text.secondary} />
                            <Text style={styles.metaText}>Guardar: {item.armazenamento}</Text>
                          </View>
                        ) : null}
                      </View>
                    )}

                    <View style={styles.medButtonsRow}>
                      <AppButton
                        title="Editar"
                        icon="create-outline"
                        variant="outline"
                        compact
                        onPress={() => handleAbrirEditarMed(item)}
                      />
                      <AppButton
                        title="Descontinuar"
                        icon="pause-circle-outline"
                        variant="outline"
                        compact
                        onPress={() => handleToggleDescontinuarMed(item)}
                      />
                      <AppButton
                        title="Excluir"
                        icon="trash-outline"
                        variant="danger"
                        compact
                        onPress={() => handleDeleteMed(item.id)}
                      />
                    </View>
                  </AppCard>
                );
              })}
            </View>
          )}

          {medicamentosDescontinuados.length > 0 && (
            <View style={styles.discontinuedBlock}>
              <Text style={styles.discontinuedHeading}>
                Histórico de Medicamentos Descontinuados
              </Text>
              {medicamentosDescontinuados.map((med) => (
                <AppCard key={med.id} variant="outlined">
                  <View style={styles.cardTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sectionTitle}>
                        {med.nome} ({med.dosagem})
                      </Text>
                      <Text style={styles.metaText}>
                        {med.forma}
                        {med.dataTermino
                          ? ` · Encerrado em ${new Date(med.dataTermino).toLocaleDateString('pt-BR')}`
                          : ''}
                      </Text>
                      {med.prescritor ? (
                        <Text style={styles.metaText}>Prescritor: {med.prescritor}</Text>
                      ) : null}
                    </View>
                    <StatusBadge label="Descontinuado" tone="neutral" />
                  </View>

                  <View style={styles.medButtonsRow}>
                    <AppButton
                      title="Reativar"
                      icon="refresh-outline"
                      variant="secondary"
                      compact
                      onPress={() => handleToggleDescontinuarMed(med)}
                    />
                    <AppButton
                      title="Excluir"
                      icon="trash-outline"
                      variant="danger"
                      compact
                      onPress={() => handleDeleteMed(med.id)}
                    />
                  </View>
                </AppCard>
              ))}
            </View>
          )}
        </View>
      )}

      <AppModal
        visible={modalVisible}
        title={editingLembreteId ? 'Editar Lembrete' : 'Novo Lembrete'}
        onClose={() => {
          setModalVisible(false);
          limparCamposFormLembrete();
        }}
        footer={
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <AppButton
              title="Cancelar"
              variant="outline"
              style={{ flex: 1 }}
              onPress={() => {
                setModalVisible(false);
                limparCamposFormLembrete();
              }}
            />
            <AppButton
              title={editingLembreteId ? 'Atualizar' : 'Salvar'}
              variant="primary"
              style={{ flex: 1 }}
              onPress={handleSalvarLembrete}
            />
          </View>
        }
      >
        <View style={{ gap: spacing.sm }}>
          {!editingLembreteId && (
            <SegmentedTabs
              tabs={CATEGORIA_TABS}
              activeKey={categoriaSelecionada}
              onChange={setCategoriaSelecionada}
            />
          )}

          {categoriaSelecionada === 'remedio' ? (
            <View>
              <AppInput
                label="Nome do Remédio *"
                placeholder="Ex: Losartana, Dipirona"
                value={nomeRemedio}
                onChangeText={setNomeRemedio}
              />
              <AppInput
                label="Horário (HH:MM) *"
                placeholder="Ex: 08:00"
                value={horarioRemedio}
                onChangeText={(txt) => setHorarioRemedio(formatarMascaraHora(txt))}
                keyboardType="numeric"
                maxLength={5}
              />
              <AppInput
                label="Frequência *"
                placeholder="Ex: De 8 em 8 horas, 1x ao dia"
                value={frequenciaRemedio}
                onChangeText={setFrequenciaRemedio}
              />
              <AppInput
                label="Observações (opcional)"
                placeholder="Ex: Tomar após o almoço"
                value={observacoesRemedio}
                onChangeText={setObservacoesRemedio}
                multiline
              />
            </View>
          ) : (
            <View>
              <ChipSelector
                label="Tipo de Ação *"
                options={TIPO_ACAO_OPTIONS}
                selected={tipoAcao}
                onSelect={setTipoAcao}
                accentColor={areaAccent.color}
                accentBg={areaAccent.bg}
              />

              {(tipoAcao === 'outro' || tipoAcao === 'fisioterapia') && (
                <AppInput
                  label={tipoAcao === 'fisioterapia' ? 'Descrição da Sessão / Postura' : 'Descreva a Ação *'}
                  placeholder="Ex: Alongamento lombar, Banho de sol"
                  value={acaoPersonalizada}
                  onChangeText={setAcaoPersonalizada}
                />
              )}

              {tipoAcao === 'consulta' && (
                <View>
                  <AppInput
                    label="Especialidade (opcional)"
                    placeholder="Ex: Cardiologia, Fisioterapia"
                    value={consultaEspecialidade}
                    onChangeText={setConsultaEspecialidade}
                  />
                  <AppInput
                    label="Local da consulta (opcional)"
                    placeholder="Ex: UBS Centro ou Clínica UNC"
                    value={consultaLocal}
                    onChangeText={setConsultaLocal}
                  />
                  <AppInput
                    label="Preparo / Observações (opcional)"
                    placeholder="Ex: Levar exames recentes, jejum 8h"
                    value={consultaPreparo}
                    onChangeText={setConsultaPreparo}
                  />
                </View>
              )}

              <AppInput
                label="Horário (HH:MM) *"
                placeholder="Ex: 14:00"
                value={horarioAcao}
                onChangeText={(txt) => setHorarioAcao(formatarMascaraHora(txt))}
                keyboardType="numeric"
                maxLength={5}
              />
            </View>
          )}

          <ChipSelector
            label="Repetição do Alarme *"
            options={[
              { value: 'diaria', label: 'Diária' },
              { value: 'semanal', label: 'Semanal' },
              { value: 'dias_especificos', label: 'Dias Específicos' },
            ]}
            selected={periodicidade}
            onSelect={setPeriodicidade}
            accentColor={areaAccent.color}
            accentBg={areaAccent.bg}
          />

          {periodicidade !== 'diaria' && (
            <ChipSelector
              label={periodicidade === 'semanal' ? 'Dia da semana *' : 'Dias da semana *'}
              options={WEEKDAYS.map((w) => ({ value: String(w.value), label: w.short }))}
              selected={diasSelecionados.map(String)}
              multiple={periodicidade === 'dias_especificos'}
              onSelect={(valStr) => {
                const val = Number(valStr) as Weekday;
                if (periodicidade === 'semanal') {
                  setDiasSelecionados([val]);
                } else {
                  setDiasSelecionados((prev) =>
                    prev.includes(val) ? prev.filter((d) => d !== val) : [...prev, val].sort()
                  );
                }
              }}
              accentColor={areaAccent.color}
              accentBg={areaAccent.bg}
            />
          )}
        </View>
      </AppModal>

      <AppModal
        visible={medModalVisible}
        title={editingMedId ? 'Editar Medicamento' : 'Novo Medicamento'}
        onClose={() => {
          setMedModalVisible(false);
          limparCamposMed();
        }}
        footer={
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <AppButton
              title="Cancelar"
              variant="outline"
              style={{ flex: 1 }}
              onPress={() => {
                setMedModalVisible(false);
                limparCamposMed();
              }}
            />
            <AppButton
              title={editingMedId ? 'Atualizar' : 'Salvar'}
              variant="primary"
              style={{ flex: 1 }}
              onPress={handleSaveMed}
            />
          </View>
        }
      >
        <View>
          <AppInput
            label="Nome do Medicamento *"
            placeholder="Ex: Losartana, Metformina"
            value={nomeMed}
            onChangeText={setNomeMed}
          />
          <AppInput
            label="Dosagem *"
            placeholder="Ex: 50mg, 5ml"
            value={dosagemMed}
            onChangeText={setDosagemMed}
          />
          <ChipSelector
            label="Forma Farmacêutica"
            options={FORMA_OPCOES}
            selected={formaMed}
            onSelect={setFormaMed}
            accentColor={areaAccent.color}
            accentBg={areaAccent.bg}
          />
          <AppInput
            label="Outra forma (ou confirme acima)"
            placeholder="Ex: Comprimido, Xarope, Gotas"
            value={formaMed}
            onChangeText={setFormaMed}
          />
          <AppInput
            label="Quantidade em Estoque"
            placeholder="Ex: 30"
            value={estoqueMed}
            onChangeText={(text) => setEstoqueMed(text.replace(/[^\d]/g, ''))}
            keyboardType="numeric"
          />
          <AppInput
            label="Médico / Prescritor (opcional)"
            placeholder="Ex: Dr(a). João Oliveira — UBS Centro"
            value={prescritorMed}
            onChangeText={setPrescritorMed}
          />
          <AppInput
            label="Validade (MM/AAAA)"
            placeholder="Ex: 12/2028"
            value={validadeMed}
            onChangeText={(txt) => setValidadeMed(formatarMascaraMesAno(txt))}
            keyboardType="numeric"
            maxLength={7}
          />
          <ChipSelector
            label="Orientação de Armazenamento"
            options={ARMAZENAMENTO_OPCOES}
            selected={armazenamentoMed}
            onSelect={setArmazenamentoMed}
            accentColor={areaAccent.color}
            accentBg={areaAccent.bg}
          />
          <AppInput
            label="Detalhe de Armazenamento (opcional)"
            placeholder="Ex: Manter na geladeira (2–8 °C)"
            value={armazenamentoMed}
            onChangeText={setArmazenamentoMed}
          />
        </View>
      </AppModal>
    </ScreenShell>
  );
}
