import { supabase } from './supabase';
import {
  AvaliacaoPsicologica,
  ChecklistCuidadoDiario,
  HumorRegistro,
  Lembrete,
  LembreteInput,
  LembretePatch,
  Medicamento,
  PerfilUsuario,
  PesoImcRegistro,
  RegistroDor,
  SinalVital,
  Treino,
  VacinaRegistro,
} from '../types';
import {
  avaliacaoPsicologiaDoDb,
  avaliacaoPsicologiaParaDb,
  checklistDoDb,
  checklistParaDb,
  humorDoDb,
  humorParaDb,
  lembreteDoDb,
  lembreteParaDb,
  medicamentoDoDb,
  medicamentoParaDb,
  perfilDoDb,
  perfilParaDb,
  pesoImcDoDb,
  pesoImcParaDb,
  registroDorDoDb,
  registroDorParaDb,
  sinalVitalDoDb,
  sinalVitalParaDb,
  treinoDoDb,
  treinoParaDb,
  vacinaDoDb,
  vacinaParaDb,
} from './mappers';

const handleError = (error: unknown, operation: string) => {
  console.error(`Erro na operação ${operation} (Supabase): `, error);
  throw error;
};

// ==========================================
// USUÁRIO / PERFIL (tabela: perfis)
// ==========================================
export const salvarPerfil = async (userId: string, perfil: Partial<PerfilUsuario>) => {
  const payload = perfilParaDb(userId, perfil);
  const { error } = await supabase.from('perfis').upsert(payload);
  if (error) handleError(error, 'salvarPerfil');
};

export const buscarPerfil = async (userId: string): Promise<PerfilUsuario | null> => {
  const { data, error } = await supabase
    .from('perfis')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) handleError(error, 'buscarPerfil');
  return perfilDoDb((data as Record<string, unknown> | null) ?? null);
};

export const escutarPerfil = (userId: string, callback: (perfil: PerfilUsuario | null) => void) => {
  buscarPerfil(userId).then(callback).catch(() => callback(null));

  const channel = supabase
    .channel(`perfis:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'perfis', filter: `id=eq.${userId}` },
      (payload) => {
        callback(perfilDoDb((payload.new as Record<string, unknown> | null) ?? null));
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

// ==========================================
// LEMBRETES (tabela: lembretes)
// ==========================================
export const upsertLembrete = async (userId: string, lembrete: Lembrete): Promise<string | undefined> => {
  const payload = lembreteParaDb(userId, lembrete);
  const { data, error } = await supabase
    .from('lembretes')
    .upsert(payload)
    .select('id')
    .single();

  if (error) handleError(error, 'upsertLembrete');
  return data?.id as string | undefined;
};

export const adicionarLembrete = async (userId: string, lembrete: LembreteInput) => {
  return upsertLembrete(userId, { ...lembrete, id: '' } as Lembrete);
};

export const atualizarLembrete = async (
  userId: string,
  lembreteId: string,
  dados: Lembrete | LembretePatch
) => {
  if ('tipo' in dados && 'horario' in dados) {
    await upsertLembrete(userId, { ...dados, id: lembreteId } as Lembrete);
    return;
  }

  const patch: Record<string, unknown> = {};
  if (dados.concluido !== undefined) patch.concluido = dados.concluido;
  if (dados.horario !== undefined) patch.horario = dados.horario;
  if (dados.notificationId !== undefined) patch.notificationId = dados.notificationId;
  if (dados.notificationIds !== undefined) patch.notification_ids = dados.notificationIds;
  if (dados.periodicidade !== undefined) patch.periodicidade = dados.periodicidade;
  if (dados.diasSemana !== undefined) patch.dias_semana = dados.diasSemana;
  if (dados.dosesTomadasPorData !== undefined) {
    patch.doses_tomadas_por_data = dados.dosesTomadasPorData;
  }
  if ('nomeRemedio' in dados && dados.nomeRemedio !== undefined) patch.nomeRemedio = dados.nomeRemedio;
  if ('frequencia' in dados && dados.frequencia !== undefined) patch.frequencia = dados.frequencia;
  if ('observacoes' in dados && dados.observacoes !== undefined) patch.observacoes = dados.observacoes;
  if ('tipoAcao' in dados && dados.tipoAcao !== undefined) patch.tipoAcao = dados.tipoAcao;
  if ('acaoPersonalizada' in dados && dados.acaoPersonalizada !== undefined) {
    patch.acaoPersonalizada = dados.acaoPersonalizada;
  }

  const { error } = await supabase
    .from('lembretes')
    .update(patch)
    .eq('id', lembreteId)
    .eq('user_id', userId);

  if (error) handleError(error, 'atualizarLembrete');
};

export const removerLembrete = async (userId: string, lembreteId: string) => {
  const { error } = await supabase
    .from('lembretes')
    .delete()
    .eq('id', lembreteId)
    .eq('user_id', userId);

  if (error) handleError(error, 'removerLembrete');
};

export const listarLembretes = async (userId: string): Promise<Lembrete[]> => {
  const { data, error } = await supabase
    .from('lembretes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) handleError(error, 'listarLembretes');
  return ((data || []) as Record<string, unknown>[]).map(lembreteDoDb);
};

export const escutarLembretes = (userId: string, callback: (lembretes: Lembrete[]) => void) => {
  listarLembretes(userId).then(callback).catch(() => callback([]));

  const channel = supabase
    .channel(`lembretes:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'lembretes', filter: `user_id=eq.${userId}` },
      async () => {
        const atualizados = await listarLembretes(userId);
        callback(atualizados);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

// ==========================================
// MEDICAMENTOS (tabela: medicamentos)
// ==========================================
export const upsertMedicamento = async (
  userId: string,
  med: Medicamento
): Promise<string | undefined> => {
  const payload = medicamentoParaDb(userId, med);
  const { data, error } = await supabase
    .from('medicamentos')
    .upsert(payload)
    .select('id')
    .single();

  if (error) handleError(error, 'upsertMedicamento');
  return data?.id as string | undefined;
};

export const adicionarMedicamento = async (userId: string, med: Omit<Medicamento, 'id'>) => {
  return upsertMedicamento(userId, { ...med, id: '' });
};

export const atualizarMedicamento = async (
  userId: string,
  medId: string,
  med: Medicamento
) => {
  await upsertMedicamento(userId, { ...med, id: medId });
};

export const removerMedicamento = async (userId: string, medId: string) => {
  const { error } = await supabase
    .from('medicamentos')
    .delete()
    .eq('id', medId)
    .eq('user_id', userId);

  if (error) handleError(error, 'removerMedicamento');
};

export const listarMedicamentos = async (userId: string): Promise<Medicamento[]> => {
  const { data, error } = await supabase
    .from('medicamentos')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) handleError(error, 'listarMedicamentos');
  return ((data || []) as Record<string, unknown>[]).map(medicamentoDoDb);
};

export const escutarMedicamentos = (
  userId: string,
  callback: (medicamentos: Medicamento[]) => void
) => {
  listarMedicamentos(userId).then(callback).catch(() => callback([]));

  const channel = supabase
    .channel(`medicamentos:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'medicamentos', filter: `user_id=eq.${userId}` },
      async () => {
        const atualizados = await listarMedicamentos(userId);
        callback(atualizados);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

// ==========================================
// SINAIS VITAIS (tabela: sinais_vitais)
// ==========================================
export const upsertSinalVital = async (
  userId: string,
  sinal: SinalVital
): Promise<string | undefined> => {
  const payload = sinalVitalParaDb(userId, sinal);
  const { data, error } = await supabase
    .from('sinais_vitais')
    .upsert(payload)
    .select('id')
    .single();

  if (error) handleError(error, 'upsertSinalVital');
  return data?.id as string | undefined;
};

export const adicionarSinalVital = async (userId: string, sinal: Omit<SinalVital, 'id'>) => {
  return upsertSinalVital(userId, { ...sinal, id: '' });
};

export const atualizarSinalVital = async (
  userId: string,
  sinalId: string,
  sinal: SinalVital
) => {
  await upsertSinalVital(userId, { ...sinal, id: sinalId });
};

export const removerSinalVital = async (userId: string, sinalId: string) => {
  const { error } = await supabase
    .from('sinais_vitais')
    .delete()
    .eq('id', sinalId)
    .eq('user_id', userId);

  if (error) handleError(error, 'removerSinalVital');
};

export const listarSinaisVitais = async (userId: string): Promise<SinalVital[]> => {
  const { data, error } = await supabase
    .from('sinais_vitais')
    .select('*')
    .eq('user_id', userId)
    .order('data', { ascending: true });

  if (error) handleError(error, 'listarSinaisVitais');
  return ((data || []) as Record<string, unknown>[]).map(sinalVitalDoDb);
};

export const escutarSinaisVitais = (userId: string, callback: (sinais: SinalVital[]) => void) => {
  listarSinaisVitais(userId).then(callback).catch(() => callback([]));

  const channel = supabase
    .channel(`sinais_vitais:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'sinais_vitais', filter: `user_id=eq.${userId}` },
      async () => {
        const atualizados = await listarSinaisVitais(userId);
        callback(atualizados);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

// ==========================================
// HUMOR (tabela: humor_historico)
// ==========================================
export const upsertHumor = async (
  userId: string,
  humor: HumorRegistro
): Promise<string | undefined> => {
  const payload = humorParaDb(userId, humor);
  const { data, error } = await supabase
    .from('humor_historico')
    .upsert(payload)
    .select('id')
    .single();

  if (error) handleError(error, 'upsertHumor');
  return data?.id as string | undefined;
};

export const adicionarHumor = async (userId: string, humor: Omit<HumorRegistro, 'id'>) => {
  return upsertHumor(userId, { ...humor, id: '' });
};

export const removerHumor = async (userId: string, humorId: string) => {
  const { error } = await supabase
    .from('humor_historico')
    .delete()
    .eq('id', humorId)
    .eq('user_id', userId);

  if (error) handleError(error, 'removerHumor');
};

export const listarHumor = async (userId: string): Promise<HumorRegistro[]> => {
  const { data, error } = await supabase
    .from('humor_historico')
    .select('*')
    .eq('user_id', userId)
    .order('data', { ascending: true });

  if (error) handleError(error, 'listarHumor');
  return ((data || []) as Record<string, unknown>[]).map(humorDoDb);
};

export const escutarHumor = (userId: string, callback: (humorList: HumorRegistro[]) => void) => {
  listarHumor(userId).then(callback).catch(() => callback([]));

  const channel = supabase
    .channel(`humor_historico:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'humor_historico', filter: `user_id=eq.${userId}` },
      async () => {
        const atualizados = await listarHumor(userId);
        callback(atualizados);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

// ==========================================
// AVALIAÇÕES PSICOLÓGICAS (tabela: avaliacoes_psicologia)
// ==========================================
export const upsertAvaliacaoPsicologia = async (
  userId: string,
  avaliacao: AvaliacaoPsicologica
): Promise<string | undefined> => {
  const payload = avaliacaoPsicologiaParaDb(userId, avaliacao);
  const { data, error } = await supabase
    .from('avaliacoes_psicologia')
    .upsert(payload)
    .select('id')
    .single();

  if (error) handleError(error, 'upsertAvaliacaoPsicologia');
  return data?.id as string | undefined;
};

export const adicionarAvaliacaoPsicologia = async (
  userId: string,
  avaliacao: Omit<AvaliacaoPsicologica, 'id'>
) => {
  return upsertAvaliacaoPsicologia(userId, { ...avaliacao, id: '' });
};

export const removerAvaliacaoPsicologia = async (userId: string, avaliacaoId: string) => {
  const { error } = await supabase
    .from('avaliacoes_psicologia')
    .delete()
    .eq('id', avaliacaoId)
    .eq('user_id', userId);

  if (error) handleError(error, 'removerAvaliacaoPsicologia');
};

export const listarAvaliacoesPsicologia = async (
  userId: string
): Promise<AvaliacaoPsicologica[]> => {
  const { data, error } = await supabase
    .from('avaliacoes_psicologia')
    .select('*')
    .eq('user_id', userId)
    .order('data', { ascending: true });

  if (error) handleError(error, 'listarAvaliacoesPsicologia');
  return ((data || []) as Record<string, unknown>[]).map(avaliacaoPsicologiaDoDb);
};

// ==========================================
// TREINOS (tabela: treinos)
// ==========================================
export const upsertTreino = async (userId: string, treino: Treino): Promise<string | undefined> => {
  const payload = treinoParaDb(userId, treino);
  const { data, error } = await supabase
    .from('treinos')
    .upsert(payload)
    .select('id')
    .single();

  if (error) handleError(error, 'upsertTreino');
  return data?.id as string | undefined;
};

export const adicionarTreino = async (userId: string, treino: Omit<Treino, 'id'>) => {
  return upsertTreino(userId, { ...treino, id: '' });
};

export const removerTreino = async (userId: string, treinoId: string) => {
  const { error } = await supabase
    .from('treinos')
    .delete()
    .eq('id', treinoId)
    .eq('user_id', userId);

  if (error) handleError(error, 'removerTreino');
};

export const listarTreinos = async (userId: string): Promise<Treino[]> => {
  const { data, error } = await supabase
    .from('treinos')
    .select('*')
    .eq('user_id', userId)
    .order('data', { ascending: true });

  if (error) handleError(error, 'listarTreinos');
  return ((data || []) as Record<string, unknown>[]).map(treinoDoDb);
};

export const escutarTreinos = (userId: string, callback: (treinos: Treino[]) => void) => {
  listarTreinos(userId).then(callback).catch(() => callback([]));

  const channel = supabase
    .channel(`treinos:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'treinos', filter: `user_id=eq.${userId}` },
      async () => {
        const atualizados = await listarTreinos(userId);
        callback(atualizados);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

// ==========================================
// HISTÓRICO DE DOR / FISIOTERAPIA (tabela: historico_dor)
// ==========================================
export const upsertRegistroDor = async (
  userId: string,
  dor: RegistroDor
): Promise<string | undefined> => {
  const payload = registroDorParaDb(userId, dor);
  const { data, error } = await supabase
    .from('historico_dor')
    .upsert(payload)
    .select('id')
    .single();

  if (error) handleError(error, 'upsertRegistroDor');
  return data?.id as string | undefined;
};

export const adicionarRegistroDor = async (userId: string, dor: Omit<RegistroDor, 'id'>) => {
  return upsertRegistroDor(userId, { ...dor, id: '' });
};

export const removerRegistroDor = async (userId: string, dorId: string) => {
  const { error } = await supabase
    .from('historico_dor')
    .delete()
    .eq('id', dorId)
    .eq('user_id', userId);

  if (error) handleError(error, 'removerRegistroDor');
};

export const listarHistoricoDor = async (userId: string): Promise<RegistroDor[]> => {
  const { data, error } = await supabase
    .from('historico_dor')
    .select('*')
    .eq('user_id', userId)
    .order('data', { ascending: true });

  if (error) handleError(error, 'listarHistoricoDor');
  return ((data || []) as Record<string, unknown>[]).map(registroDorDoDb);
};

// ==========================================
// HISTÓRICO PESO / IMC (tabela: historico_imc)
// ==========================================
export const upsertPesoImc = async (
  userId: string,
  registro: PesoImcRegistro
): Promise<string | undefined> => {
  const payload = pesoImcParaDb(userId, registro);
  const { data, error } = await supabase
    .from('historico_imc')
    .upsert(payload)
    .select('id')
    .single();

  if (error) handleError(error, 'upsertPesoImc');
  return data?.id as string | undefined;
};

export const removerPesoImc = async (userId: string, registroId: string) => {
  const { error } = await supabase
    .from('historico_imc')
    .delete()
    .eq('id', registroId)
    .eq('user_id', userId);

  if (error) handleError(error, 'removerPesoImc');
};

export const listarHistoricoImc = async (userId: string): Promise<PesoImcRegistro[]> => {
  const { data, error } = await supabase
    .from('historico_imc')
    .select('*')
    .eq('user_id', userId)
    .order('data', { ascending: true });

  if (error) handleError(error, 'listarHistoricoImc');
  return ((data || []) as Record<string, unknown>[]).map(pesoImcDoDb);
};

// ==========================================
// CHECKLIST DIÁRIO DE CUIDADOS (tabela: checklist_cuidados)
// ==========================================
export const salvarChecklistCuidados = async (
  userId: string,
  checklist: ChecklistCuidadoDiario
) => {
  const payload = checklistParaDb(userId, checklist);
  const { error } = await supabase
    .from('checklist_cuidados')
    .upsert(payload, { onConflict: 'user_id,data' });

  if (error) handleError(error, 'salvarChecklistCuidados');
};

export const buscarChecklistCuidados = async (
  userId: string,
  dataChave: string
): Promise<ChecklistCuidadoDiario | null> => {
  const { data, error } = await supabase
    .from('checklist_cuidados')
    .select('*')
    .eq('user_id', userId)
    .eq('data', dataChave)
    .maybeSingle();

  if (error) handleError(error, 'buscarChecklistCuidados');
  return checklistDoDb((data as Record<string, unknown> | null) ?? null);
};

export const listarChecklistsCuidados = async (
  userId: string
): Promise<ChecklistCuidadoDiario[]> => {
  const { data, error } = await supabase
    .from('checklist_cuidados')
    .select('*')
    .eq('user_id', userId)
    .order('data', { ascending: false })
    .limit(30);

  if (error) handleError(error, 'listarChecklistsCuidados');
  return ((data || []) as Record<string, unknown>[])
    .map((r) => checklistDoDb(r))
    .filter((item): item is ChecklistCuidadoDiario => item !== null);
};

// ==========================================
// CARTEIRINHA DE VACINAS (tabela: vacinas)
// ==========================================
export const upsertVacina = async (
  userId: string,
  vacina: VacinaRegistro
): Promise<string | undefined> => {
  const payload = vacinaParaDb(userId, vacina);
  const { data, error } = await supabase
    .from('vacinas')
    .upsert(payload)
    .select('id')
    .single();

  if (error) handleError(error, 'upsertVacina');
  return data?.id as string | undefined;
};

export const removerVacina = async (userId: string, vacinaId: string) => {
  const { error } = await supabase
    .from('vacinas')
    .delete()
    .eq('id', vacinaId)
    .eq('user_id', userId);

  if (error) handleError(error, 'removerVacina');
};

export const listarVacinas = async (userId: string): Promise<VacinaRegistro[]> => {
  const { data, error } = await supabase
    .from('vacinas')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) handleError(error, 'listarVacinas');
  return ((data || []) as Record<string, unknown>[]).map(vacinaDoDb);
};

// ==========================================
// STORAGE: AVATARS (bucket: avatars)
// ==========================================
const inferImageContentType = (ext: string, headerType?: string | null): string => {
  if (headerType && headerType.startsWith('image/')) return headerType;
  const norm = ext.toLowerCase();
  if (norm === 'png') return 'image/png';
  if (norm === 'webp') return 'image/webp';
  return 'image/jpeg';
};

export const uploadAvatar = async (userId: string, localUri: string): Promise<string | null> => {
  try {
    const response = await fetch(localUri);
    const arrayBuffer = await response.arrayBuffer();
    const rawExt = localUri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
    const ext = rawExt === 'jpeg' || rawExt === 'png' || rawExt === 'webp' ? rawExt : 'jpg';
    const contentType = inferImageContentType(ext, response.headers?.get?.('content-type'));
    const path = `${userId}/avatar.${ext}`;

    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, arrayBuffer, { contentType, upsert: true });

    if (error) handleError(error, 'uploadAvatar');

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data?.publicUrl ? `${data.publicUrl}?t=${Date.now()}` : null;
  } catch (err) {
    console.warn('Falha no uploadAvatar (Supabase Storage):', err);
    return null;
  }
};
