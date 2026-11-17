import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useStore } from '../../store/useStore';
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
import {
  calcularEClassificarImc,
  contarTreinosSemanaCorrente,
  filtrarExerciciosPorComorbidades,
} from '../../services/clinicaHelpers';
import { formatNumeroParaUi } from '../../services/mappers';
import { colors, spacing } from '../../theme/tokens';
import { FisioterapiaPainSection } from '../Fisioterapia/FisioterapiaPainSection';
import { styles } from './styles';

export type CorpoMovimentoTab = 'saude' | 'educacao' | 'fisioterapia';

type ProfileScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Perfil' | 'Fisioterapia'
>;
type ProfileScreenRouteProp = RouteProp<RootStackParamList, 'Perfil'>;

interface Props {
  navigation: ProfileScreenNavigationProp;
  route?: ProfileScreenRouteProp;
  initialTabOverride?: CorpoMovimentoTab;
}

type IntensidadeTreino = 'Leve' | 'Moderado' | 'Intenso';

const COMORBIDADES_OPCOES = ['Diabetes', 'Hipertensão', 'Problema Cardíaco', 'Nenhuma'];
const GENDERS = ['Masculino', 'Feminino', 'Outro'];
const ACTIVITIES = ['Ativo (Pratico Exercícios)', 'De Vez em Quando', 'Não Pratico'];

const INTENSIDADES: { tipo: IntensidadeTreino; label: string; met: number }[] = [
  { tipo: 'Leve', label: 'Leve', met: 3.5 },
  { tipo: 'Moderado', label: 'Moderado', met: 5.5 },
  { tipo: 'Intenso', label: 'Intenso', met: 8.0 },
];

const CORPO_TABS: {
  key: CorpoMovimentoTab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'saude', label: 'Perfil & Saúde', icon: 'body-outline' },
  { key: 'educacao', label: 'Educação Física', icon: 'fitness-outline' },
  { key: 'fisioterapia', label: 'Fisioterapia & Dor', icon: 'medkit-outline' },
];

const getImcBadgeTone = (valorImc: number): 'info' | 'success' | 'warning' | 'danger' => {
  if (valorImc < 18.5) return 'info';
  if (valorImc < 25) return 'success';
  if (valorImc < 30) return 'warning';
  return 'danger';
};

const getImcPointerPercent = (valorImc: number): number => {
  // Mapeia IMC entre 14 e 40 na barra contínua de 0% a 100%
  const pct = ((valorImc - 14) / (40 - 14)) * 100;
  return Math.max(4, Math.min(96, pct));
};

export default function ProfileScreen({ navigation, route, initialTabOverride }: Props) {
  const { showAlert, showToast } = useFeedback();
  const resolvedInitialTab = initialTabOverride ?? route?.params?.initialTab ?? 'saude';
  const [activeTab, setActiveTab] = useState<CorpoMovimentoTab>(resolvedInitialTab);

  useEffect(() => {
    if (initialTabOverride) {
      setActiveTab(initialTabOverride);
    } else if (route?.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [initialTabOverride, route?.params?.initialTab]);

  const { perfil, updatePerfil } = useStore();
  const frequenciaAtividade = perfil?.frequenciaAtividade || null;
  const treinos = useStore((state) => state.treinos || []);
  const addTreino = useStore((state) => state.addTreino);
  const historicoImc = useStore((state) => state.historicoImc || []);
  const addRegistroPesoImc = useStore((state) => state.addRegistroPesoImc);

  const [chartMode, setChartMode] = useState<'peso' | 'imc'>('peso');
  const [age, setAge] = useState(formatNumeroParaUi(perfil?.idade));
  const [weight, setWeight] = useState(formatNumeroParaUi(perfil?.peso));
  const [height, setHeight] = useState(formatNumeroParaUi(perfil?.altura));
  const [gender, setGender] = useState<string | null>(perfil?.sexo || null);
  const [comorbidades, setComorbidades] = useState<string[]>(perfil?.comorbidades || []);
  const [alergias, setAlergias] = useState(perfil?.alergias || '');
  const [imc, setImc] = useState<number | null>(null);
  const [imcClassification, setImcClassification] = useState('');
  const hasEditedPerfil = useRef(false);

  const [desc, setDesc] = useState('');
  const [duracaoMin, setDuracaoMin] = useState('');
  const [intensidade, setIntensidade] = useState<IntensidadeTreino>('Moderado');
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (perfil && !hasEditedPerfil.current) {
      const idadeStr = formatNumeroParaUi(perfil.idade);
      const pesoStr = formatNumeroParaUi(perfil.peso);
      const alturaStr = formatNumeroParaUi(perfil.altura);
      if (idadeStr !== '') setAge(idadeStr);
      if (pesoStr !== '') setWeight(pesoStr);
      if (alturaStr !== '') setHeight(alturaStr);
      if (perfil.sexo !== undefined) setGender(perfil.sexo);
      if (perfil.comorbidades !== undefined) setComorbidades(perfil.comorbidades);
      if (perfil.alergias !== undefined) setAlergias(perfil.alergias);
    }
  }, [perfil]);

  const resultadoBiblioteca = useMemo(
    () => filtrarExerciciosPorComorbidades(comorbidades),
    [comorbidades]
  );

  useEffect(() => {
    const resultado = calcularEClassificarImc(weight, height);
    if (resultado) {
      setImc(resultado.imcArredondado);
      setImcClassification(resultado.classificacao);
    } else {
      setImc(null);
      setImcClassification('');
    }
  }, [weight, height]);

  const toggleComorbidade = (item: string) => {
    hasEditedPerfil.current = true;
    let next: string[];
    if (item === 'Nenhuma') {
      next = comorbidades.includes('Nenhuma') ? [] : ['Nenhuma'];
    } else {
      const semNenhuma = comorbidades.filter((c) => c !== 'Nenhuma');
      next = semNenhuma.includes(item)
        ? semNenhuma.filter((c) => c !== item)
        : [...semNenhuma, item];
    }
    setComorbidades(next);
    updatePerfil({ comorbidades: next });
  };

  const handleSaveProfile = () => {
    const temAlgumDado =
      Boolean(age.trim()) ||
      Boolean(weight.trim()) ||
      Boolean(height.trim()) ||
      Boolean(gender) ||
      comorbidades.length > 0 ||
      Boolean(alergias.trim());

    if (!temAlgumDado) {
      showAlert('Atenção', 'Preencha ao menos um dado corporal, comorbidade ou alergia para salvar.');
      return;
    }

    hasEditedPerfil.current = true;
    const pesoAtualNum = parseFloat(weight.replace(',', '.'));
    updatePerfil({
      idade: age.trim(),
      peso: weight.trim(),
      altura: height.trim(),
      sexo: gender || undefined,
      imc: imc ?? undefined,
      comorbidades,
      alergias: alergias.trim(),
    });

    if (!isNaN(pesoAtualNum) && pesoAtualNum > 0) {
      addRegistroPesoImc({
        peso: Number(pesoAtualNum.toFixed(1)),
        imc: imc !== null ? Number(imc.toFixed(1)) : undefined,
      });
    }

    const dadosCorporaisFaltantes = !age.trim() || !weight.trim() || !height.trim() || !gender;
    if (dadosCorporaisFaltantes) {
      showAlert(
        'Dados salvos',
        'Dados de saúde salvos! Preencha Idade, Peso, Altura e Sexo quando quiser calcular seu IMC completo.'
      );
    } else {
      showToast('Perfil corporal e dados de saúde salvos com sucesso!', 'success');
    }
  };

  const pesoNumerico = parseFloat((weight || formatNumeroParaUi(perfil?.peso)).replace(',', '.'));
  const hasValidPeso = !isNaN(pesoNumerico) && pesoNumerico > 0;
  const metaAguaMl = hasValidPeso ? Math.round(pesoNumerico * 35) : null;
  const metaAguaLitros = metaAguaMl !== null ? (metaAguaMl / 1000).toFixed(2).replace('.', ',') : null;
  const copos250ml = metaAguaMl !== null ? Math.ceil(metaAguaMl / 250) : null;

  const duracaoNum = parseInt(duracaoMin.replace(/[^\d]/g, ''), 10);
  const hasValidDuracao = !isNaN(duracaoNum) && duracaoNum > 0;
  const pesoParaTreino = hasValidPeso ? pesoNumerico : 70;
  const metSelecionado = INTENSIDADES.find((i) => i.tipo === intensidade)?.met ?? 5.5;
  const caloriasEstimadas = hasValidDuracao
    ? Math.round(metSelecionado * pesoParaTreino * (duracaoNum / 60))
    : null;

  const handleRegistrarTreino = () => {
    if (!desc.trim()) {
      showAlert('Atenção', 'Por favor, descreva o treino que você realizou.');
      return;
    }
    if (!hasValidDuracao) {
      showAlert('Atenção', 'Informe a duração do treino em minutos (ex.: 30) para estimar calorias.');
      return;
    }

    const kcal = caloriasEstimadas ?? 0;
    addTreino({
      descricao: desc.trim(),
      duracaoMinutos: duracaoNum,
      intensidade,
      caloriasEstimadas: kcal,
    });
    showToast(`Treino salvo: ${desc.trim()} (~${kcal} kcal).`, 'success');
    setDesc('');
    setDuracaoMin('');
  };

  const treinosNaSemana = useMemo(() => contarTreinosSemanaCorrente(treinos), [treinos]);
  const alertaAlergiaTexto = alergias.trim() || (perfil?.alergias || '').trim();

  const evolutionChartData: ChartPoint[] = useMemo(() => {
    const baseRecords = [...historicoImc];
    if (baseRecords.length === 0 && perfil?.peso) {
      const pNum = parseFloat(formatNumeroParaUi(perfil.peso).replace(',', '.'));
      if (!isNaN(pNum) && pNum > 0) {
        baseRecords.push({
          id: 'baseline-atual',
          peso: Number(pNum.toFixed(1)),
          imc: perfil.imc !== undefined ? Number(perfil.imc.toFixed(1)) : undefined,
          data: new Date().toISOString(),
        });
      }
    }

    const recent = baseRecords.slice(-7);
    const points: ChartPoint[] = [];

    recent.forEach((rec) => {
      const label =
        rec.id === 'baseline-atual'
          ? 'Atual'
          : new Date(rec.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

      if (chartMode === 'peso' && rec.peso > 0) {
        points.push({
          label,
          value: rec.peso,
          displayValue: `${rec.peso.toFixed(1)}kg`,
          color: colors.brand.teal,
        });
      } else if (chartMode === 'imc' && rec.imc !== undefined && rec.imc > 0) {
        let color: string = colors.semantic.success;
        if (rec.imc < 18.5) color = colors.semantic.info;
        else if (rec.imc >= 25 && rec.imc < 30) color = colors.semantic.warning;
        else if (rec.imc >= 30) color = colors.semantic.danger;

        points.push({
          label,
          value: rec.imc,
          displayValue: rec.imc.toFixed(1),
          color,
        });
      }
    });

    return points;
  }, [historicoImc, perfil?.peso, perfil?.imc, chartMode]);

  const areaAccent = colors.areas.corpoMovimento;
  const coposVisuaisCount = copos250ml ? Math.min(copos250ml, 10) : 0;

  return (
    <ScreenShell
      title="Corpo & Movimento"
      subtitle="Perfil corporal, hidratação, educação física e fisioterapia."
      areaBadge={{
        label: 'Corpo & Movimento',
        color: areaAccent.color,
        bg: areaAccent.bg,
      }}
      onBack={() => (navigation.canGoBack() ? navigation.goBack() : navigation.replace('Inicial'))}
    >
      {alertaAlergiaTexto.length > 0 && (
        <AppCard variant="alert" tone="danger">
          <View style={styles.allergyRow}>
            <Ionicons name="warning" size={22} color={colors.semantic.danger} />
            <View style={{ flex: 1 }}>
              <Text style={styles.allergyTitle}>Alerta Clínico — Alergias Registradas</Text>
              <Text style={styles.allergyText}>{alertaAlergiaTexto}</Text>
            </View>
          </View>
        </AppCard>
      )}

      <SegmentedTabs tabs={CORPO_TABS} activeKey={activeTab} onChange={setActiveTab} />

      {activeTab === 'saude' && (
        <View style={styles.tabSection}>
          <AppCard variant="elevated">
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="person-outline" size={20} color={areaAccent.color} />
                <Text style={styles.sectionTitle}>Perfil Corporal e Clínico</Text>
              </View>
            </View>

            <AppInput
              label="Idade"
              placeholder="Sua idade em anos"
              value={age}
              onChangeText={(text) => {
                hasEditedPerfil.current = true;
                setAge(text);
              }}
              keyboardType="numeric"
            />

            <View style={styles.twoCols}>
              <View style={styles.colItem}>
                <AppInput
                  label="Peso"
                  unitSuffix="kg"
                  placeholder="Ex: 70.5"
                  value={weight}
                  onChangeText={(text) => {
                    hasEditedPerfil.current = true;
                    setWeight(text);
                  }}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.colItem}>
                <AppInput
                  label="Altura"
                  unitSuffix="cm"
                  placeholder="Ex: 175"
                  value={height}
                  onChangeText={(text) => {
                    hasEditedPerfil.current = true;
                    setHeight(text);
                  }}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <ChipSelector
              label="Sexo"
              options={GENDERS}
              selected={gender}
              onSelect={(g) => {
                hasEditedPerfil.current = true;
                setGender(g);
              }}
            />

            {imc !== null && (
              <View style={styles.imcResultBox}>
                <View style={styles.imcTopRow}>
                  <Text style={styles.imcNumberText}>IMC: {imc.toFixed(1)}</Text>
                  <StatusBadge label={imcClassification} tone={getImcBadgeTone(imc)} />
                </View>

                <View style={styles.imcScaleWrapper}>
                  <View style={styles.imcBarTrack}>
                    <View style={[styles.imcSegment, { backgroundColor: colors.semantic.info }]} />
                    <View style={[styles.imcSegment, { backgroundColor: colors.semantic.success }]} />
                    <View style={[styles.imcSegment, { backgroundColor: colors.semantic.warning }]} />
                    <View style={[styles.imcSegment, { backgroundColor: colors.semantic.danger }]} />
                  </View>
                  <View
                    style={[styles.imcPointer, { left: `${getImcPointerPercent(imc)}%` }]}
                  />
                  <View style={styles.imcScaleLabels}>
                    <Text style={styles.imcScaleLabel}>&lt; 18,5</Text>
                    <Text style={styles.imcScaleLabel}>18,5 – 24,9</Text>
                    <Text style={styles.imcScaleLabel}>25 – 29,9</Text>
                    <Text style={styles.imcScaleLabel}>≥ 30</Text>
                  </View>
                </View>
              </View>
            )}

            <ChipSelector
              label="Comorbidades / Condições Pré-existentes"
              options={COMORBIDADES_OPCOES}
              selected={comorbidades}
              multiple
              onSelect={toggleComorbidade}
            />

            <AppInput
              label="Alergias (medicamentos, alimentos ou outras)"
              placeholder="Ex: Dipirona, Penicilina, Frutos do mar, Látex"
              value={alergias}
              onChangeText={(text) => {
                hasEditedPerfil.current = true;
                setAlergias(text);
              }}
              multiline
            />
            {alergias.trim().length > 0 && (
              <View style={styles.allergyHintRow}>
                <Ionicons name="shield-checkmark-outline" size={16} color={colors.semantic.danger} />
                <Text style={styles.allergyHintText}>
                  Alergias ficam destacadas no topo do perfil e no prontuário PDF.
                </Text>
              </View>
            )}

            <AppButton
              title="Salvar Dados Corporais e de Saúde"
              icon="save-outline"
              variant="primary"
              onPress={handleSaveProfile}
            />
          </AppCard>

          <AppCard variant="alert" tone="info">
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="water-outline" size={22} color={colors.brand.primary} />
                <Text style={styles.sectionTitle}>Meta Diária de Água</Text>
              </View>
              {copos250ml ? <StatusBadge label={`${copos250ml} copos (250 ml)`} tone="info" /> : null}
            </View>

            {metaAguaMl !== null ? (
              <View>
                <Text style={styles.waterMainValue}>
                  {metaAguaMl} ml ({metaAguaLitros} L)
                </Text>
                <Text style={styles.waterSubtext}>
                  Cálculo diário recomendado: 35 ml × {pesoNumerico} kg.
                </Text>

                <View style={styles.waterCupsRow}>
                  {Array.from({ length: coposVisuaisCount }).map((_, idx) => (
                    <View key={idx} style={styles.waterCupChip}>
                      <Ionicons name="water" size={16} color={colors.brand.primary} />
                    </View>
                  ))}
                  {copos250ml && copos250ml > coposVisuaisCount ? (
                    <Text style={styles.waterExtraLabel}>+{copos250ml - coposVisuaisCount} copos</Text>
                  ) : null}
                </View>

                {frequenciaAtividade === 'Ativo (Pratico Exercícios)' && (
                  <View style={styles.waterTipBox}>
                    <Ionicons name="information-circle-outline" size={18} color={colors.semantic.info} />
                    <Text style={styles.waterTipText}>
                      Por praticar exercícios regularmente, reponha líquidos extras durante e após os treinos.
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={styles.waterSubtext}>
                Informe seu peso corporal (kg) acima para calcular sua meta diária recomendada em ml e copos.
              </Text>
            )}
          </AppCard>

          <BarChartCard
            title="Evolução de Peso & IMC"
            subtitle={
              chartMode === 'peso'
                ? 'Histórico do seu peso corporal salvo ao atualizar o perfil.'
                : 'Histórico do Índice de Massa Corporal (IMC).'
            }
            data={evolutionChartData}
            emptyMessage={
              chartMode === 'imc'
                ? 'Salve Peso e Altura no perfil para acompanhar a evolução do IMC.'
                : 'Salve seu peso corporal no perfil para acompanhar a evolução ao longo do tempo.'
            }
            legend={
              chartMode === 'imc'
                ? [
                    { label: 'Abaixo (<18,5)', color: colors.semantic.info },
                    { label: 'Normal', color: colors.semantic.success },
                    { label: 'Sobrepeso', color: colors.semantic.warning },
                    { label: 'Obesidade', color: colors.semantic.danger },
                  ]
                : undefined
            }
          >
            <View style={styles.chartToggleRow}>
              <TouchableOpacity
                style={[styles.chartToggleBtn, chartMode === 'peso' && styles.chartToggleBtnActive]}
                onPress={() => setChartMode('peso')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="scale-outline"
                  size={16}
                  color={chartMode === 'peso' ? colors.text.inverse : colors.text.secondary}
                />
                <Text style={[styles.chartToggleText, chartMode === 'peso' && styles.chartToggleTextActive]}>
                  Peso (kg)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chartToggleBtn, chartMode === 'imc' && styles.chartToggleBtnActive]}
                onPress={() => setChartMode('imc')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="analytics-outline"
                  size={16}
                  color={chartMode === 'imc' ? colors.text.inverse : colors.text.secondary}
                />
                <Text style={[styles.chartToggleText, chartMode === 'imc' && styles.chartToggleTextActive]}>
                  IMC
                </Text>
              </TouchableOpacity>
            </View>
          </BarChartCard>
        </View>
      )}

      {activeTab === 'educacao' && (
        <View style={styles.tabSection}>
          <AppCard variant="elevated">
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="trophy-outline" size={20} color={colors.semantic.success} />
                <Text style={styles.sectionTitle}>Meta Semanal de Treinos</Text>
              </View>
              <StatusBadge
                label={treinosNaSemana >= 5 ? 'Meta atingida' : `${treinosNaSemana}/5 semana`}
                tone={treinosNaSemana >= 5 ? 'success' : 'info'}
              />
            </View>
            <Text style={styles.goalCountText}>
              {treinosNaSemana} de 5 treinos realizados nesta semana
            </Text>
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${Math.min(100, (treinosNaSemana / 5) * 100)}%` }]}
              />
            </View>
          </AppCard>

          <AppCard variant="default">
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="walk-outline" size={20} color={areaAccent.color} />
                <Text style={styles.sectionTitle}>Nível de Atividade Semanal</Text>
              </View>
            </View>
            <ChipSelector
              options={ACTIVITIES}
              selected={frequenciaAtividade}
              onSelect={(activity) => updatePerfil({ frequenciaAtividade: activity })}
              accentColor={areaAccent.color}
              accentBg={areaAccent.bg}
            />
          </AppCard>

          <AppCard variant="elevated">
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="barbell-outline" size={20} color={areaAccent.color} />
                <Text style={styles.sectionTitle}>Registrar Treino</Text>
              </View>
            </View>

            <AppInput
              label="Atividade realizada"
              placeholder="Ex: Caminhada no parque, Musculação"
              value={desc}
              onChangeText={setDesc}
            />

            <AppInput
              label="Duração"
              unitSuffix="min"
              placeholder="Ex: 45"
              value={duracaoMin}
              onChangeText={(text) => setDuracaoMin(text.replace(/[^\d]/g, ''))}
              keyboardType="numeric"
              maxLength={4}
            />

            <ChipSelector
              label="Intensidade"
              options={INTENSIDADES.map((i) => ({ value: i.tipo, label: i.label }))}
              selected={intensidade}
              onSelect={setIntensidade}
              accentColor={areaAccent.color}
              accentBg={areaAccent.bg}
            />

            {caloriasEstimadas !== null && (
              <View style={styles.calorieBox}>
                <Ionicons name="flame-outline" size={22} color={colors.semantic.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.calorieTitle}>Gasto calórico estimado: ~{caloriasEstimadas} kcal</Text>
                  <Text style={styles.calorieSub}>
                    Baseado em {duracaoNum} min de intensidade {intensidade.toLowerCase()} ({pesoParaTreino} kg
                    {!hasValidPeso ? ' padrão' : ''}).
                  </Text>
                </View>
              </View>
            )}

            <AppButton
              title="Salvar Treino"
              icon="add-circle-outline"
              variant="primary"
              onPress={handleRegistrarTreino}
            />
          </AppCard>

          <AppButton
            title="Abrir Biblioteca de Exercícios Adaptados"
            icon="book-outline"
            variant="secondary"
            onPress={() => setModalVisible(true)}
          />

          <AppCard variant="default">
            <Text style={[styles.sectionTitle, { marginBottom: spacing.md }]}>Últimos Treinos</Text>
            {treinos.length === 0 ? (
              <EmptyState
                icon="fitness-outline"
                title="Nenhum treino registrado"
                description="Registre caminhadas, alongamentos ou atividades acima para acompanhar sua meta semanal."
              />
            ) : (
              <View style={styles.historyStack}>
                {treinos
                  .slice()
                  .reverse()
                  .slice(0, 10)
                  .map((t) => (
                    <View key={t.id} style={styles.workoutCard}>
                      <View style={styles.workoutHeader}>
                        <Text style={styles.workoutTitle}>
                          {new Date(t.data).toLocaleDateString('pt-BR')} — {t.descricao}
                        </Text>
                        {t.caloriasEstimadas !== undefined && t.caloriasEstimadas > 0 && (
                          <StatusBadge label={`~${t.caloriasEstimadas} kcal`} tone="warning" />
                        )}
                      </View>
                      {(t.duracaoMinutos || t.intensidade) && (
                        <Text style={styles.workoutMeta}>
                          {[
                            t.duracaoMinutos ? `${t.duracaoMinutos} min` : '',
                            t.intensidade ? `Intensidade: ${t.intensidade}` : '',
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                      )}
                    </View>
                  ))}
              </View>
            )}
          </AppCard>
        </View>
      )}

      {activeTab === 'fisioterapia' && <FisioterapiaPainSection />}

      <AppModal
        visible={modalVisible}
        title="Biblioteca de Exercícios"
        subtitle={
          resultadoBiblioteca.comorbidadesAtivas.length > 0
            ? `Adaptada para: ${resultadoBiblioteca.comorbidadesAtivas.join(', ')}`
            : 'Sugestões seguras para mobilidade e condicionamento.'
        }
        onClose={() => setModalVisible(false)}
        footer={<AppButton title="Fechar" variant="outline" onPress={() => setModalVisible(false)} />}
      >
        <View style={{ gap: spacing.md }}>
          {resultadoBiblioteca.avisoLiberacaoMedica && (
            <AppCard variant="alert" tone="warning">
              <Text style={styles.modalWarningTitle}>Liberação e Segurança</Text>
              <Text style={styles.modalWarningText}>{resultadoBiblioteca.avisoLiberacaoMedica}</Text>
            </AppCard>
          )}
          {resultadoBiblioteca.exercicios.map((item) => (
            <AppCard key={item.id} variant="outlined">
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseTitle}>{item.nome}</Text>
                <StatusBadge
                  label={item.intensidade}
                  tone={item.intensidade === 'Leve' ? 'success' : 'info'}
                />
              </View>
              <Text style={styles.exerciseDesc}>{item.descricao}</Text>
              {item.cuidados ? (
                <Text style={styles.exerciseCare}>Cuidado: {item.cuidados}</Text>
              ) : null}
            </AppCard>
          ))}
        </View>
      </AppModal>
    </ScreenShell>
  );
}
