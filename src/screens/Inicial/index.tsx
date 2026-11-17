import React, { useMemo } from 'react';
import { Image, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { AppCard, ScreenShell, StatusBadge } from '../../components/ui';
import {
  avaliarValidadeMedicamento,
  contarTreinosSemanaCorrente,
  isLembreteConcluidoNaData,
} from '../../services/clinicaHelpers';
import { getHojeLocalKey, GUEST_CONTEXT_KEY } from '../../services/sync';
import { useStore } from '../../store/useStore';
import { colors } from '../../theme/tokens';
import { styles } from './styles';

type TelaInicialNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Inicial'>;

interface Props {
  navigation: TelaInicialNavigationProp;
}

const MOOD_NAME_MAP: Record<string, string> = {
  feliz: 'Feliz',
  triste: 'Triste',
  nervoso: 'Nervoso',
  ansioso: 'Ansioso',
};

export default function TelaInicial({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const isTwoCols = width >= 620;

  const perfil = useStore((s) => s.perfil);
  const activeContextKey = useStore((s) => s.activeContextKey);
  const lembretes = useStore((s) => s.lembretes || []);
  const medicamentos = useStore((s) => s.medicamentos || []);
  const sinaisVitais = useStore((s) => s.sinaisVitais || []);
  const humorHistorico = useStore((s) => s.humorHistorico || []);
  const treinos = useStore((s) => s.treinos || []);

  const userName = perfil?.nome?.trim() || 'Paciente';
  const hojeKey = getHojeLocalKey();
  const dataFormatada = useMemo(() => {
    const raw = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, []);

  const lembretesPendentesHoje = useMemo(
    () =>
      lembretes
        .filter((l) => !isLembreteConcluidoNaData(l, hojeKey))
        .sort((a, b) => a.horario.localeCompare(b.horario)),
    [lembretes, hojeKey]
  );
  const proximoLembrete = lembretesPendentesHoje[0] || null;
  const concluidosHoje = lembretes.filter((l) => isLembreteConcluidoNaData(l, hojeKey)).length;

  const ultimoSinal = useMemo(() => {
    if (sinaisVitais.length === 0) return null;
    return sinaisVitais
      .slice()
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())[0];
  }, [sinaisVitais]);

  const ultimoHumor = useMemo(() => {
    if (humorHistorico.length === 0) return null;
    return humorHistorico
      .slice()
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())[0];
  }, [humorHistorico]);

  const treinosSemana = useMemo(() => contarTreinosSemanaCorrente(treinos), [treinos]);

  const alertasFarmacia = useMemo(() => {
    const ativos = medicamentos.filter((m) => !m.descontinuado);
    const estoqueBaixo = ativos.filter((m) => {
      const q = parseInt(m.estoque || '0', 10);
      return !isNaN(q) && q <= 5;
    });
    const vencendoOuVencido = ativos.filter((m) => {
      const st = avaliarValidadeMedicamento(m.validade);
      return st === 'vencido' || st === 'proximo';
    });
    return {
      estoqueBaixo: estoqueBaixo.length,
      validadeAlerta: vencendoOuVencido.length,
    };
  }, [medicamentos]);

  const resumoUltimoSinal = ultimoSinal
    ? ultimoSinal.pressao?.trim()
      ? `${ultimoSinal.pressao} mmHg`
      : ultimoSinal.glicose?.trim()
        ? `${ultimoSinal.glicose} mg/dL`
        : ultimoSinal.bpm?.trim()
          ? `${ultimoSinal.bpm} bpm`
          : 'Registrado'
    : 'Sem registros';

  const nomeProximoLembrete = proximoLembrete
    ? proximoLembrete.tipo === 'remedio'
      ? proximoLembrete.nomeRemedio
      : proximoLembrete.acaoPersonalizada || 'Lembrete de saúde'
    : lembretes.length > 0
      ? 'Tudo concluído hoje'
      : 'Nenhum alarme';

  const moduleCards: {
    key: string;
    title: string;
    course: string;
    description: string;
    statusText: string;
    icon: keyof typeof Ionicons.glyphMap;
    area: { color: string; bg: string };
    onPress: () => void;
  }[] = [
    {
      key: 'psicologia',
      title: 'Saúde Mental',
      course: 'Psicologia',
      description: 'Diário emocional, respiração guiada e triagens PHQ-9 / GAD-7.',
      statusText: ultimoHumor
        ? `Último humor: ${MOOD_NAME_MAP[ultimoHumor.moodId] || ultimoHumor.moodId}`
        : 'Registrar bem-estar hoje',
      icon: 'happy-outline',
      area: colors.areas.psicologia,
      onPress: () => navigation.navigate('Humor'),
    },
    {
      key: 'enfermagem',
      title: 'Sinais Vitais',
      course: 'Enfermagem',
      description: 'Pressão arterial, frequência cardíaca, glicemia, SpO₂ e febre.',
      statusText: ultimoSinal ? `Último: ${resumoUltimoSinal}` : 'Aferir sinais vitais',
      icon: 'pulse-outline',
      area: colors.areas.enfermagem,
      onPress: () => navigation.navigate('SinaisVitais'),
    },
    {
      key: 'farmacia',
      title: 'Lembretes & Farmácia',
      course: 'Farmácia',
      description: 'Alarmes diários, estoque de remédios e prontuário em PDF.',
      statusText:
        lembretes.length > 0
          ? `${concluidosHoje}/${lembretes.length} concluídos hoje`
          : 'Gerenciar alarmes e estoque',
      icon: 'medical-outline',
      area: colors.areas.farmacia,
      onPress: () => navigation.navigate('Lembretes'),
    },
    {
      key: 'corpo',
      title: 'Corpo & Movimento',
      course: 'Ed. Física & Fisioterapia',
      description: 'IMC, água diária, treinos, escala EVA de dor e postura.',
      statusText: `Treinos na semana: ${treinosSemana}/5`,
      icon: 'walk-outline',
      area: colors.areas.corpoMovimento,
      onPress: () => navigation.navigate('Perfil'),
    },
  ];

  const temAlergia = Boolean(perfil?.alergias?.trim());
  const temAlertaMed = alertasFarmacia.estoqueBaixo > 0 || alertasFarmacia.validadeAlerta > 0;

  return (
    <ScreenShell
      title={`Olá, ${userName}`}
      subtitle={dataFormatada}
      areaBadge={
        activeContextKey === GUEST_CONTEXT_KEY
          ? { label: 'Acesso Rápido Local', color: colors.text.secondary, bg: colors.surface.subtle }
          : undefined
      }
      maxWidth="grid"
      rightAction={
        <TouchableOpacity
          style={styles.settingsAvatarBtn}
          onPress={() => navigation.navigate('Configuracoes')}
          accessibilityLabel="Configurações do perfil"
          activeOpacity={0.8}
        >
          {perfil?.fotoUri ? (
            <Image source={{ uri: perfil.fotoUri }} style={styles.avatarImg} />
          ) : (
            <Ionicons name="settings-outline" size={22} color={colors.text.primary} />
          )}
        </TouchableOpacity>
      }
    >
      {(temAlergia || temAlertaMed) && (
        <View style={styles.alertsStack}>
          {temAlergia && (
            <TouchableOpacity onPress={() => navigation.navigate('Perfil')} activeOpacity={0.85}>
              <AppCard variant="alert" tone="danger">
                <View style={styles.alertRow}>
                  <Ionicons name="warning" size={20} color={colors.semantic.danger} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.alertTitle}>Alerta de Alergias</Text>
                    <Text style={styles.alertSub}>{perfil?.alergias}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.semantic.danger} />
                </View>
              </AppCard>
            </TouchableOpacity>
          )}
          {temAlertaMed && (
            <TouchableOpacity onPress={() => navigation.navigate('Lembretes')} activeOpacity={0.85}>
              <AppCard variant="alert" tone="warning">
                <View style={styles.alertRow}>
                  <Ionicons name="alert-circle" size={20} color={colors.semantic.warning} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.alertTitle}>Atenção na Farmácia</Text>
                    <Text style={styles.alertSub}>
                      {[
                        alertasFarmacia.estoqueBaixo > 0
                          ? `${alertasFarmacia.estoqueBaixo} item(ns) com estoque baixo`
                          : '',
                        alertasFarmacia.validadeAlerta > 0
                          ? `${alertasFarmacia.validadeAlerta} com validade próxima ou vencida`
                          : '',
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.semantic.warning} />
                </View>
              </AppCard>
            </TouchableOpacity>
          )}
        </View>
      )}

      <Text style={styles.sectionLabel}>Resumo de Hoje</Text>
      <View style={styles.summaryGrid}>
        <TouchableOpacity
          style={styles.summaryTile}
          onPress={() => navigation.navigate('Lembretes')}
          activeOpacity={0.85}
        >
          <View style={styles.summaryTileTop}>
            <Text style={styles.summaryLabel}>Próximo alarme</Text>
            <Ionicons name="alarm-outline" size={16} color={colors.areas.farmacia.color} />
          </View>
          <Text style={styles.summaryValue} numberOfLines={1}>
            {proximoLembrete ? proximoLembrete.horario : nomeProximoLembrete}
          </Text>
          <Text style={styles.summaryMeta} numberOfLines={1}>
            {proximoLembrete ? nomeProximoLembrete : `${concluidosHoje} concluídos hoje`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.summaryTile}
          onPress={() => navigation.navigate('SinaisVitais')}
          activeOpacity={0.85}
        >
          <View style={styles.summaryTileTop}>
            <Text style={styles.summaryLabel}>Último sinal</Text>
            <Ionicons name="heart-outline" size={16} color={colors.areas.enfermagem.color} />
          </View>
          <Text style={styles.summaryValue} numberOfLines={1}>
            {resumoUltimoSinal}
          </Text>
          <Text style={styles.summaryMeta} numberOfLines={1}>
            {ultimoSinal
              ? new Date(ultimoSinal.data).toLocaleDateString('pt-BR')
              : 'Toque para aferir'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.summaryTile}
          onPress={() => navigation.navigate('Humor')}
          activeOpacity={0.85}
        >
          <View style={styles.summaryTileTop}>
            <Text style={styles.summaryLabel}>Saúde emocional</Text>
            <Ionicons name="happy-outline" size={16} color={colors.areas.psicologia.color} />
          </View>
          <Text style={styles.summaryValue} numberOfLines={1}>
            {ultimoHumor ? MOOD_NAME_MAP[ultimoHumor.moodId] || ultimoHumor.moodId : 'Pendente'}
          </Text>
          <Text style={styles.summaryMeta} numberOfLines={1}>
            {ultimoHumor ? 'Ver linha do tempo' : 'Registrar humor'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.summaryTile}
          onPress={() => navigation.navigate('Fisioterapia')}
          activeOpacity={0.85}
        >
          <View style={styles.summaryTileTop}>
            <Text style={styles.summaryLabel}>Atividade & Dor</Text>
            <Ionicons name="fitness-outline" size={16} color={colors.areas.corpoMovimento.color} />
          </View>
          <Text style={styles.summaryValue} numberOfLines={1}>
            {treinosSemana}/5 treinos
          </Text>
          <Text style={styles.summaryMeta} numberOfLines={1}>
            Abrir Fisioterapia & Dor
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>Áreas de Cuidado</Text>
      <View style={styles.modulesGrid}>
        {moduleCards.map((card) => (
          <TouchableOpacity
            key={card.key}
            style={[
              styles.moduleCard,
              isTwoCols ? { width: '48.8%' } : { width: '100%' },
            ]}
            onPress={card.onPress}
            activeOpacity={0.85}
          >
            <View>
              <View style={styles.moduleTopRow}>
                <View style={[styles.moduleIconCircle, { backgroundColor: card.area.bg }]}>
                  <Ionicons name={card.icon} size={26} color={card.area.color} />
                </View>
                <StatusBadge label={card.course} tone="info" />
              </View>
              <Text style={styles.moduleTitle}>{card.title}</Text>
              <Text style={styles.moduleSubtitle}>{card.description}</Text>
            </View>
            <View style={styles.moduleFooter}>
              <Text style={[styles.moduleStatusText, { color: card.area.color }]}>
                {card.statusText}
              </Text>
              <Ionicons name="arrow-forward" size={18} color={card.area.color} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.uncBanner}
        onPress={() => navigation.navigate('SobreUNC')}
        activeOpacity={0.88}
      >
        <View style={styles.uncIconWrap}>
          <Ionicons name="school-outline" size={24} color={colors.text.inverse} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.uncEyebrow}>CLÍNICAS-ESCOLA & CONTATOS</Text>
          <Text style={styles.uncTitle}>Conheça os Serviços da UNC</Text>
          <Text style={styles.uncSub}>
            Atendimentos gratuitos ou comunitários com telefones e mapa GPS.
          </Text>
        </View>
        <View style={styles.uncArrow}>
          <Ionicons name="arrow-forward" size={18} color={colors.text.inverse} />
        </View>
      </TouchableOpacity>
    </ScreenShell>
  );
}
