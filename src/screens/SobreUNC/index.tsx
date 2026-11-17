import React, { useMemo, useState } from 'react';
import { Linking, Platform, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  AppButton,
  AppCard,
  AppModal,
  ScreenShell,
  SegmentedTabs,
  StatusBadge,
  useFeedback,
} from '../../components/ui';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { exportarProntuarioPdf } from '../../services/prontuarioPdf';
import { useStore } from '../../store/useStore';
import { colors, spacing } from '../../theme/tokens';
import {
  CAMPI_UNC,
  CLINICA_ESCOLA_GERAL,
  SERVICOS_CURSOS_UNC,
  CampusUNC,
  ServicoCursoInfo,
  UNC_SITE_URL,
} from './uncData';
import { styles } from './styles';

type SobreUNCNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SobreUNC'>;

interface Props {
  navigation: SobreUNCNavigationProp;
}

interface UserCoords {
  lat: number;
  lng: number;
}

type ModalTab = 'servicos' | 'agendamento' | 'gps';

const MODAL_TABS: { key: ModalTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'servicos', label: 'Serviços', icon: 'list-outline' },
  { key: 'agendamento', label: 'Agendar', icon: 'call-outline' },
  { key: 'gps', label: 'GPS & Campi', icon: 'location-outline' },
];

const CHECKLIST_CONSULTA_UNC = [
  { id: 'doc', titulo: 'RG e CPF ou CNH', detalhe: 'Documento oficial com foto.' },
  { id: 'sus', titulo: 'Cartão Nacional do SUS e comprovante de residência', detalhe: 'Necessários para triagens gratuitas e encaminhamentos.' },
  { id: 'receitas', titulo: 'Receitas e caixas dos remédios em uso', detalhe: 'Ajuda a evitar interações e confirmar dosagens.' },
  { id: 'exames', titulo: 'Exames recentes e encaminhamento médico/UBS', detalhe: 'Quando houver solicitação prévia.' },
  { id: 'prontuario', titulo: 'Resumo clínico do aplicativo (PDF)', detalhe: 'Contém suas alergias, vitais, dor e medicações.' },
];

function calcularDistanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function TelaSobreUNC({ navigation }: Props) {
  const { showAlert } = useFeedback();
  const perfil = useStore((s) => s.perfil);
  const medicamentos = useStore((s) => s.medicamentos || []);
  const sinaisVitais = useStore((s) => s.sinaisVitais || []);
  const humorHistorico = useStore((s) => s.humorHistorico || []);
  const avaliacoesPsicologia = useStore((s) => s.avaliacoesPsicologia || []);
  const historicoDor = useStore((s) => s.historicoDor || []);
  const vacinas = useStore((s) => s.vacinas || []);

  const [itensConsulta, setItensConsulta] = useState<string[]>([]);
  const [selectedInfo, setSelectedInfo] = useState<ServicoCursoInfo | null>(null);
  const [modalTab, setModalTab] = useState<ModalTab>('servicos');
  const [selectedCampusMap, setSelectedCampusMap] = useState<CampusUNC | null>(null);

  const [userCoords, setUserCoords] = useState<UserCoords | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const openInfoWindow = (item: ServicoCursoInfo, initialTab: ModalTab = 'servicos') => {
    setSelectedInfo(item);
    setModalTab(initialTab);
  };

  const openInSeparateWindow = async (url: string) => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const popup = window.open(
          url,
          'UNCJanelaOficial',
          'width=1020,height=740,menubar=no,toolbar=no,location=yes,resizable=yes,scrollbars=yes'
        );
        if (popup) {
          popup.focus();
          return;
        }
      }
      await WebBrowser.openBrowserAsync(url);
    } catch {
      showAlert('Portal da UNC', `Acesse: ${url}`);
    }
  };

  const handleGetGpsLocation = async () => {
    setGpsLoading(true);
    setGpsError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsError(
          'Permissão de localização GPS negada. Você ainda pode ver todos os endereços e abrir as rotas.'
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setUserCoords({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    } catch {
      setGpsError(
        'Não foi possível obter o GPS agora. Verifique se a localização está ativada no dispositivo.'
      );
    } finally {
      setGpsLoading(false);
    }
  };

  const campiOrdenados = useMemo(() => {
    const withDist = CAMPI_UNC.map((campus) => ({
      ...campus,
      distanciaKm: userCoords
        ? calcularDistanciaKm(userCoords.lat, userCoords.lng, campus.lat, campus.lng)
        : null,
    }));

    if (userCoords) {
      withDist.sort((a, b) => (a.distanciaKm ?? 99999) - (b.distanciaKm ?? 99999));
    }
    return withDist;
  }, [userCoords]);

  const abrirRotaGps = async (campus: CampusUNC) => {
    const label = encodeURIComponent(`UNC - ${campus.nome}`);
    const webDirectionsUrl = userCoords
      ? `https://www.google.com/maps/dir/?api=1&origin=${userCoords.lat},${userCoords.lng}&destination=${campus.lat},${campus.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${campus.lat},${campus.lng}`;

    try {
      if (Platform.OS === 'android') {
        const geoUrl = `geo:${campus.lat},${campus.lng}?q=${campus.lat},${campus.lng}(${label})`;
        const canGeo = await Linking.canOpenURL(geoUrl);
        if (canGeo) {
          await Linking.openURL(geoUrl);
          return;
        }
      } else if (Platform.OS === 'ios') {
        const appleUrl = `http://maps.apple.com/?daddr=${campus.lat},${campus.lng}&q=${label}`;
        const canApple = await Linking.canOpenURL(appleUrl);
        if (canApple) {
          await Linking.openURL(appleUrl);
          return;
        }
      }

      await openInSeparateWindow(webDirectionsUrl);
    } catch {
      showAlert('Localização GPS', `Coordenadas: ${campus.lat}, ${campus.lng}\n${campus.endereco}`);
    }
  };

  const ligarTelefone = async (telefoneTexto: string) => {
    const firstPhone = telefoneTexto.split('/')[0].replace(/[^\d]/g, '');
    if (!firstPhone) return;
    try {
      await Linking.openURL(`tel:${firstPhone}`);
    } catch {
      showAlert('Telefone UNC', telefoneTexto);
    }
  };

  const campiDoItemSelecionado = useMemo(() => {
    if (!selectedInfo) return [];
    return campiOrdenados.filter((c) => selectedInfo.campiIds.includes(c.id));
  }, [selectedInfo, campiOrdenados]);

  return (
    <ScreenShell
      title="Clínicas-Escola UNC"
      subtitle="Serviços gratuitos e acessíveis à comunidade"
      areaBadge={{ label: 'Extensão Universitária · UNC', color: colors.brand.primary, bg: colors.brand.primarySoft }}
      maxWidth="grid"
      onBack={() => navigation.goBack()}
    >
      <View style={styles.heroCard}>
        <View style={styles.heroBadgeRow}>
          <MaterialCommunityIcons name="hand-heart-outline" size={22} color="#93C5FD" />
          <Text style={styles.heroEyebrow}>CLÍNICAS-ESCOLA & ATENDIMENTOS · UNC</Text>
        </View>
        <Text style={styles.heroTitle}>
          Serviços de saúde integrados para cuidar da comunidade.
        </Text>
        <Text style={styles.heroDescription}>
          Confira atendimentos de Medicina, Fisioterapia, Odontologia, Psicologia e Enfermagem realizados com supervisão docente, incluindo contatos e rotas GPS.
        </Text>
        <View style={styles.heroActionsRow}>
          <AppButton
            title="Como Agendar"
            icon="medkit-outline"
            variant="secondary"
            compact
            onPress={() => openInfoWindow(CLINICA_ESCOLA_GERAL, 'agendamento')}
          />
          <AppButton
            title="Portal Oficial UNC"
            icon="open-outline"
            variant="outline"
            compact
            onPress={() => openInSeparateWindow(UNC_SITE_URL)}
            style={{ backgroundColor: colors.surface.card }}
          />
        </View>
      </View>

      <Text style={styles.sectionHeading}>Serviços por Área à Comunidade</Text>
      <Text style={styles.sectionHint}>
        Toque em uma área para ver os serviços oferecidos, contatos e campus disponíveis.
      </Text>

      <TouchableOpacity
        onPress={() => openInfoWindow(CLINICA_ESCOLA_GERAL, 'servicos')}
        activeOpacity={0.85}
      >
        <AppCard variant="elevated">
          <View style={styles.clinicHeaderRow}>
            <StatusBadge label="Espaço Mais Saúde & Triagem" tone="success" icon="medkit" />
            <Ionicons name="arrow-forward" size={18} color={colors.brand.primary} />
          </View>
          <Text style={styles.clinicTitle}>{CLINICA_ESCOLA_GERAL.titulo}</Text>
          <Text style={styles.clinicSub}>{CLINICA_ESCOLA_GERAL.subtituloCard}</Text>
          <View style={styles.clinicFooterRow}>
            <View style={styles.phoneRow}>
              <Ionicons name="call-outline" size={16} color={colors.semantic.success} />
              <Text style={styles.phoneText}>Espaço Mais Saúde: (47) 3641-5519</Text>
            </View>
            <Text style={styles.seeMoreText}>Ver serviços</Text>
          </View>
        </AppCard>
      </TouchableOpacity>

      <View style={styles.grid}>
        {SERVICOS_CURSOS_UNC.map((servico) => (
          <TouchableOpacity
            key={servico.id}
            style={styles.courseCardWrap}
            onPress={() => openInfoWindow(servico, 'servicos')}
            activeOpacity={0.85}
          >
            <AppCard variant="default" style={{ height: '100%', justifyContent: 'space-between' }}>
              <View>
                <View style={[styles.courseIconBox, { backgroundColor: servico.corBadge }]}>
                  <Ionicons
                    name={servico.icone as keyof typeof Ionicons.glyphMap}
                    size={22}
                    color={servico.corIcone}
                  />
                </View>
                <Text style={styles.courseTitle}>{servico.titulo}</Text>
                <Text style={styles.courseSub}>{servico.subtituloCard}</Text>
              </View>
              <View style={styles.courseLinkRow}>
                <Text style={styles.courseLinkText}>Ver detalhes</Text>
                <Ionicons name="open-outline" size={15} color={colors.brand.primary} />
              </View>
            </AppCard>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionHeading}>Localização por GPS — Campi UNC</Text>
      <Text style={styles.sectionHint}>
        Ative sua localização para ordenar automaticamente pelo campus mais próximo.
      </Text>

      <AppCard variant="elevated" style={styles.gpsCardWrap}>
        <AppButton
          title={gpsLoading ? 'Localizando via GPS...' : 'Encontrar campus mais próximo (GPS)'}
          icon="locate-outline"
          variant="primary"
          loading={gpsLoading}
          onPress={handleGetGpsLocation}
        />

        {userCoords && (
          <View style={styles.gpsStatusRow}>
            <Ionicons name="location" size={16} color={colors.semantic.success} />
            <Text style={styles.gpsStatusText}>
              GPS ativo ({userCoords.lat.toFixed(4)}, {userCoords.lng.toFixed(4)}) — ordenado do mais próximo ao mais distante.
            </Text>
          </View>
        )}

        {gpsError && (
          <View style={styles.gpsStatusRow}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.semantic.danger} />
            <Text style={[styles.gpsStatusText, { color: colors.semantic.danger }]}>{gpsError}</Text>
          </View>
        )}

        <View style={styles.campiStack}>
          {campiOrdenados.map((campus, index) => {
            const isNearest = Boolean(userCoords && index === 0);
            return (
              <AppCard
                key={campus.id}
                variant={isNearest ? 'alert' : 'outlined'}
                tone={isNearest ? 'success' : 'info'}
              >
                <View style={styles.campusTopLine}>
                  <Text style={styles.campusName}>{campus.nome}</Text>
                  <StatusBadge
                    label={
                      campus.distanciaKm !== null
                        ? `${isNearest ? 'Mais próximo · ' : ''}${campus.distanciaKm.toFixed(1)} km`
                        : campus.cidade
                    }
                    tone={isNearest ? 'success' : 'neutral'}
                  />
                </View>

                <Text style={styles.campusAddress}>
                  {campus.endereco} · CEP {campus.cep}
                </Text>
                {campus.destaque ? (
                  <Text style={styles.campusHighlight}>{campus.destaque}</Text>
                ) : null}

                <View style={styles.campusActionsRow}>
                  <AppButton
                    title="Ver Mapa"
                    icon="map-outline"
                    variant="primary"
                    compact
                    onPress={() => setSelectedCampusMap(campus)}
                  />
                  <AppButton
                    title="Rota GPS"
                    icon="navigate-outline"
                    variant="outline"
                    compact
                    onPress={() => abrirRotaGps(campus)}
                  />
                  <AppButton
                    title={campus.telefone}
                    icon="call-outline"
                    variant="secondary"
                    compact
                    onPress={() => ligarTelefone(campus.telefone)}
                  />
                </View>
              </AppCard>
            );
          })}
        </View>
      </AppCard>

      <View style={styles.impactStack}>
        <AppCard variant="elevated">
          <View style={styles.clinicHeaderRow}>
            <Text style={styles.clinicTitle}>O que levar na consulta (SUS / UNC)</Text>
            <StatusBadge
              label={`${itensConsulta.length}/${CHECKLIST_CONSULTA_UNC.length}`}
              tone={itensConsulta.length === CHECKLIST_CONSULTA_UNC.length ? 'success' : 'info'}
            />
          </View>
          <Text style={styles.clinicSub}>
            Conferir esta lista antes de sair evita viagens perdidas na triagem e agiliza seu atendimento.
          </Text>
          <View style={{ gap: spacing.xs, marginBottom: spacing.md }}>
            {CHECKLIST_CONSULTA_UNC.map((item) => {
              const marcado = itensConsulta.includes(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() =>
                    setItensConsulta((prev) =>
                      prev.includes(item.id)
                        ? prev.filter((x) => x !== item.id)
                        : [...prev, item.id]
                    )
                  }
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: spacing.sm,
                    padding: spacing.sm,
                    borderRadius: 10,
                    backgroundColor: marcado ? colors.semantic.successBg : colors.surface.subtle,
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={marcado ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={marcado ? colors.semantic.success : colors.text.secondary}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.bodyText,
                        { fontWeight: '700', color: colors.text.primary },
                      ]}
                    >
                      {item.titulo}
                    </Text>
                    <Text style={styles.gpsStatusText}>{item.detalhe}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          <AppButton
            title="Gerar Prontuário PDF do App para Consulta"
            icon="document-text-outline"
            variant="secondary"
            onPress={async () => {
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
                showAlert('Erro', 'Não foi possível gerar o PDF do prontuário.');
              }
            }}
          />
        </AppCard>

        <AppCard variant="alert" tone="success">
          <View style={styles.impactRow}>
            <Ionicons name="heart-half-outline" size={24} color={colors.semantic.success} />
            <View style={{ flex: 1 }}>
              <Text style={styles.impactEyebrow}>ATENDIMENTO SUPERVISADO</Text>
              <Text style={styles.impactTitle}>UNC próxima da população</Text>
              <Text style={styles.bodyText}>
                Os atendimentos nas clínicas-escola são conduzidos sob supervisão docente, levando saúde preventiva, reabilitação e acolhimento à comunidade regional.
              </Text>
            </View>
          </View>
        </AppCard>

        <AppCard variant="default">
          <View style={styles.impactRow}>
            <Ionicons name="phone-portrait-outline" size={24} color={colors.brand.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.impactTitle}>Sobre este Aplicativo</Text>
              <Text style={styles.bodyText}>
                Desenvolvido como projeto de curricularização da extensão no curso de Engenharia de Software da UNC, conectando autocuidado diário e serviços de saúde universitários.
              </Text>
            </View>
          </View>
        </AppCard>
      </View>

      <AppModal
        visible={selectedInfo !== null}
        title={selectedInfo?.titulo || 'Detalhes'}
        onClose={() => setSelectedInfo(null)}
        footer={
          <View style={{ gap: spacing.sm }}>
            <AppButton
              title="Abrir Portal UNC"
              icon="open-outline"
              variant="primary"
              onPress={() => openInSeparateWindow(selectedInfo?.urlOficial || UNC_SITE_URL)}
            />
            <AppButton title="Fechar" variant="outline" onPress={() => setSelectedInfo(null)} />
          </View>
        }
      >
        <SegmentedTabs tabs={MODAL_TABS} activeKey={modalTab} onChange={setModalTab} />

        {modalTab === 'servicos' && selectedInfo && (
          <View>
            <View style={styles.metaBlockRow}>
              <AppCard variant="outlined">
                <Text style={styles.metaLabel}>PÚBLICO ATENDIDO</Text>
                <Text style={styles.bodyText}>{selectedInfo.publicoAlvo}</Text>
              </AppCard>
              <AppCard variant="outlined">
                <Text style={styles.metaLabel}>UNIDADES COM ATENDIMENTO</Text>
                <Text style={styles.bodyText}>{selectedInfo.campiResumo}</Text>
              </AppCard>
            </View>

            <Text style={styles.modalSectionTitle}>Como funciona o atendimento</Text>
            <Text style={styles.bodyText}>{selectedInfo.descricaoAtendimento}</Text>

            <Text style={styles.modalSectionTitle}>Serviços prestados à comunidade</Text>
            {selectedInfo.servicosComunidade.map((item, idx) => (
              <View key={idx} style={styles.bulletRow}>
                <Ionicons name="checkmark-circle" size={18} color={colors.semantic.success} />
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {modalTab === 'agendamento' && selectedInfo && (
          <View style={{ marginTop: spacing.md, gap: spacing.md }}>
            <AppCard variant="alert" tone="success">
              <Text style={styles.clinicTitle}>{selectedInfo.clinicaEscola.titulo}</Text>
              <Text style={styles.bodyText}>{selectedInfo.clinicaEscola.descricao}</Text>
              <Text style={styles.modalSectionTitle}>Como solicitar atendimento</Text>
              <Text style={styles.bodyText}>{selectedInfo.clinicaEscola.comoAgendar}</Text>

              <View style={styles.contactLine}>
                <Ionicons name="call-outline" size={18} color={colors.brand.primary} />
                <Text style={styles.contactValue}>{selectedInfo.clinicaEscola.contato}</Text>
              </View>
              {selectedInfo.clinicaEscola.email && (
                <View style={styles.contactLine}>
                  <Ionicons name="mail-outline" size={18} color={colors.brand.primary} />
                  <Text style={styles.bodyText}>{selectedInfo.clinicaEscola.email}</Text>
                </View>
              )}
            </AppCard>

            <AppButton
              title="Ligar para Agendamento"
              icon="call"
              variant="secondary"
              onPress={() => ligarTelefone(selectedInfo.clinicaEscola.contato)}
            />
          </View>
        )}

        {modalTab === 'gps' && (
          <View style={{ marginTop: spacing.md, gap: spacing.md }}>
            {!userCoords && (
              <AppButton
                title={gpsLoading ? 'Localizando...' : 'Calcular distância com meu GPS'}
                icon="locate-outline"
                variant="primary"
                loading={gpsLoading}
                onPress={handleGetGpsLocation}
              />
            )}

            {campiDoItemSelecionado.map((campus) => (
              <AppCard key={campus.id} variant="outlined">
                <View style={styles.campusTopLine}>
                  <Text style={styles.campusName}>{campus.nome}</Text>
                  {campus.distanciaKm !== null && (
                    <StatusBadge label={`${campus.distanciaKm.toFixed(1)} km`} tone="info" />
                  )}
                </View>
                <Text style={styles.campusAddress}>
                  {campus.endereco} · CEP {campus.cep}
                </Text>

                {Platform.OS === 'web' && (
                  <View style={styles.mapFrameContainer}>
                    {React.createElement('iframe', {
                      src: `https://maps.google.com/maps?q=${campus.lat},${campus.lng}&z=16&output=embed`,
                      style: { width: '100%', height: '100%', border: 0 },
                      loading: 'lazy',
                      title: `Mapa ${campus.nome}`,
                    })}
                  </View>
                )}

                <View style={styles.campusActionsRow}>
                  <AppButton
                    title="Traçar Rota GPS"
                    icon="navigate-outline"
                    variant="primary"
                    compact
                    onPress={() => abrirRotaGps(campus)}
                  />
                  <AppButton
                    title={campus.telefone}
                    icon="call-outline"
                    variant="outline"
                    compact
                    onPress={() => ligarTelefone(campus.telefone)}
                  />
                </View>
              </AppCard>
            ))}
          </View>
        )}
      </AppModal>

      <AppModal
        visible={selectedCampusMap !== null}
        title={selectedCampusMap?.nome || 'Mapa da Unidade'}
        onClose={() => setSelectedCampusMap(null)}
        footer={
          <View style={{ gap: spacing.sm }}>
            {selectedCampusMap && (
              <AppButton
                title="Iniciar Rota no GPS"
                icon="navigate-outline"
                variant="primary"
                onPress={() => abrirRotaGps(selectedCampusMap)}
              />
            )}
            <AppButton title="Fechar Mapa" variant="outline" onPress={() => setSelectedCampusMap(null)} />
          </View>
        }
      >
        {selectedCampusMap && (
          <View style={{ gap: spacing.sm }}>
            <Text style={styles.metaLabel}>ENDEREÇO OFICIAL</Text>
            <Text style={styles.bodyText}>
              {selectedCampusMap.endereco} — CEP {selectedCampusMap.cep}
            </Text>

            <Text style={styles.metaLabel}>COORDENADAS GPS</Text>
            <Text style={styles.bodyText}>
              Latitude: {selectedCampusMap.lat} · Longitude: {selectedCampusMap.lng}
              {userCoords
                ? `\nDistância estimada: ${calcularDistanciaKm(
                    userCoords.lat,
                    userCoords.lng,
                    selectedCampusMap.lat,
                    selectedCampusMap.lng
                  ).toFixed(1)} km`
                : ''}
            </Text>

            {Platform.OS === 'web' && (
              <View style={[styles.mapFrameContainer, { height: 260 }]}>
                {React.createElement('iframe', {
                  src: `https://maps.google.com/maps?q=${selectedCampusMap.lat},${selectedCampusMap.lng}&z=16&output=embed`,
                  style: { width: '100%', height: '100%', border: 0 },
                  loading: 'lazy',
                  title: `Mapa GPS ${selectedCampusMap.nome}`,
                })}
              </View>
            )}

            {selectedCampusMap.destaque ? (
              <AppCard variant="alert" tone="success">
                <Text style={styles.metaLabel}>SERVIÇOS NESTA UNIDADE</Text>
                <Text style={styles.bodyText}>{selectedCampusMap.destaque}</Text>
              </AppCard>
            ) : null}
          </View>
        )}
      </AppModal>
    </ScreenShell>
  );
}
