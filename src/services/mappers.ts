import {
  AvaliacaoPsicologica,
  ChecklistCuidadoDiario,
  HorasSono,
  HumorRegistro,
  Lembrete,
  LembreteAcao,
  LembreteRemedio,
  Medicamento,
  PerfilUsuario,
  PesoImcRegistro,
  QualidadeSono,
  RegiaoDor,
  RegistroDor,
  SinalVital,
  TipoDor,
  Treino,
} from '../types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuidValido(valor?: string | null): boolean {
  return Boolean(valor && UUID_REGEX.test(valor));
}

/**
 * Converte numero em formato pt-BR ("70,5") ou en-US ("70.5") para number.
 * Retorna null quando vazio ou invalido.
 */
export function parseNumeroPtBr(valor: string | number | null | undefined): number | null {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : null;
  }
  const limpo = valor.trim().replace(',', '.');
  if (!limpo) return null;
  const num = Number(limpo);
  return Number.isFinite(num) ? num : null;
}

/**
 * Converte texto ou numero para inteiro compativel com colunas integer do PostgreSQL.
 */
export function parseInteiro(valor: string | number | null | undefined): number | null {
  const num = parseNumeroPtBr(valor);
  if (num === null) return null;
  return Math.round(num);
}

/**
 * Garante representacao textual segura para campos numericos na UI.
 */
export function formatNumeroParaUi(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? String(valor) : '';
  }
  return valor;
}

/**
 * Normaliza datas para string ISO-8601.
 */
export function toIsoDate(valor?: string | Date | null): string {
  if (!valor) return new Date().toISOString();
  if (valor instanceof Date) {
    return isNaN(valor.getTime()) ? new Date().toISOString() : valor.toISOString();
  }
  const parsed = new Date(valor);
  return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

export function perfilParaDb(userId: string, perfil: Partial<PerfilUsuario>): Record<string, unknown> {
  const row: Record<string, unknown> = {
    id: userId,
    updated_at: new Date().toISOString(),
  };

  if (perfil.nome !== undefined) row.nome = perfil.nome;
  if (perfil.fotoUri !== undefined) row.fotoUri = perfil.fotoUri;
  if (perfil.telefone !== undefined) row.telefone = perfil.telefone;
  if (perfil.frequenciaAtividade !== undefined) row.frequenciaAtividade = perfil.frequenciaAtividade || null;
  if (perfil.idade !== undefined) row.idade = parseInteiro(perfil.idade);
  if (perfil.peso !== undefined) row.peso = parseNumeroPtBr(perfil.peso);
  if (perfil.altura !== undefined) row.altura = parseNumeroPtBr(perfil.altura);
  if (perfil.sexo !== undefined) row.sexo = perfil.sexo || null;
  if (perfil.imc !== undefined) row.imc = parseNumeroPtBr(perfil.imc);
  if (perfil.comorbidades !== undefined) row.comorbidades = perfil.comorbidades;
  if (perfil.alergias !== undefined) row.alergias = perfil.alergias || null;
  if (perfil.termosAceitosEm !== undefined) {
    row.termos_aceitos_em = perfil.termosAceitosEm ? toIsoDate(perfil.termosAceitosEm) : null;
  }

  return row;
}

export function perfilDoDb(row: Record<string, unknown> | null): PerfilUsuario | null {
  if (!row) return null;
  return {
    nome: typeof row.nome === 'string' ? row.nome : '',
    fotoUri: typeof row.fotoUri === 'string' ? row.fotoUri : null,
    telefone: typeof row.telefone === 'string' ? row.telefone : '',
    frequenciaAtividade:
      typeof row.frequenciaAtividade === 'string' ? row.frequenciaAtividade : undefined,
    idade: formatNumeroParaUi(row.idade as string | number | null | undefined) || undefined,
    peso: formatNumeroParaUi(row.peso as string | number | null | undefined) || undefined,
    altura: formatNumeroParaUi(row.altura as string | number | null | undefined) || undefined,
    sexo: typeof row.sexo === 'string' ? row.sexo : undefined,
    imc: parseNumeroPtBr(row.imc as string | number | null | undefined) ?? undefined,
    comorbidades: Array.isArray(row.comorbidades)
      ? row.comorbidades.filter((c): c is string => typeof c === 'string')
      : undefined,
    alergias: typeof row.alergias === 'string' ? row.alergias : undefined,
    termosAceitosEm:
      typeof row.termos_aceitos_em === 'string' ? toIsoDate(row.termos_aceitos_em) : undefined,
  };
}

export function lembreteParaDb(userId: string, lembrete: Lembrete): Record<string, unknown> {
  const base: Record<string, unknown> = {
    user_id: userId,
    tipo: lembrete.tipo,
    concluido: Boolean(lembrete.concluido),
    horario: lembrete.horario,
    notificationId: lembrete.notificationId ?? null,
    notification_ids: lembrete.notificationIds ?? null,
    periodicidade: lembrete.periodicidade ?? 'diaria',
    dias_semana: lembrete.diasSemana ?? null,
    doses_tomadas_por_data: lembrete.dosesTomadasPorData ?? {},
  };

  if (isUuidValido(lembrete.id)) {
    base.id = lembrete.id;
  }

  if (lembrete.tipo === 'remedio') {
    base.nomeRemedio = lembrete.nomeRemedio;
    base.frequencia = lembrete.frequencia;
    base.observacoes = lembrete.observacoes ?? null;
    base.tipoAcao = null;
    base.acaoPersonalizada = null;
    base.consulta_local = null;
    base.consulta_especialidade = null;
    base.consulta_preparo = null;
    base.fisio_local = null;
    base.fisio_terapeuta = null;
    base.fisio_orientacoes = null;
  } else {
    base.nomeRemedio = null;
    base.frequencia = null;
    base.observacoes = null;
    base.tipoAcao = lembrete.tipoAcao;
    base.acaoPersonalizada = lembrete.acaoPersonalizada ?? null;
    base.consulta_local = lembrete.consultaLocal ?? null;
    base.consulta_especialidade = lembrete.consultaEspecialidade ?? null;
    base.consulta_preparo = lembrete.consultaPreparo ?? null;
    base.fisio_local = lembrete.fisioLocal ?? null;
    base.fisio_terapeuta = lembrete.fisioTerapeuta ?? null;
    base.fisio_orientacoes = lembrete.fisioOrientacoes ?? null;
  }

  return base;
}

export function lembreteDoDb(row: Record<string, unknown>): Lembrete {
  const dosesRaw = row.doses_tomadas_por_data;
  const dosesMap =
    dosesRaw && typeof dosesRaw === 'object' && !Array.isArray(dosesRaw)
      ? (dosesRaw as Record<string, boolean>)
      : undefined;

  const periodicidade: Lembrete['periodicidade'] =
    row.periodicidade === 'semanal'
      ? 'semanal'
      : row.periodicidade === 'dias_especificos'
        ? 'dias_especificos'
        : 'diaria';

  const base = {
    id: String(row.id),
    concluido: Boolean(row.concluido),
    horario: typeof row.horario === 'string' ? row.horario : '08:00',
    notificationId: typeof row.notificationId === 'string' ? row.notificationId : undefined,
    notificationIds: Array.isArray(row.notification_ids)
      ? row.notification_ids.filter((v): v is string => typeof v === 'string')
      : undefined,
    periodicidade,
    diasSemana: Array.isArray(row.dias_semana)
      ? row.dias_semana.filter((d): d is number => typeof d === 'number')
      : undefined,
    dosesTomadasPorData: dosesMap,
  };

  if (row.tipo === 'acao') {
    const tipoAcao =
      row.tipoAcao === 'consulta' ||
      row.tipoAcao === 'exercicio' ||
      row.tipoAcao === 'agua' ||
      row.tipoAcao === 'pressao' ||
      row.tipoAcao === 'fisioterapia' ||
      row.tipoAcao === 'outro'
        ? row.tipoAcao
        : 'outro';

    const acao: LembreteAcao = {
      ...base,
      tipo: 'acao',
      tipoAcao,
      acaoPersonalizada:
        typeof row.acaoPersonalizada === 'string' ? row.acaoPersonalizada : undefined,
      consultaLocal: typeof row.consulta_local === 'string' ? row.consulta_local : undefined,
      consultaEspecialidade:
        typeof row.consulta_especialidade === 'string' ? row.consulta_especialidade : undefined,
      consultaPreparo:
        typeof row.consulta_preparo === 'string' ? row.consulta_preparo : undefined,
      fisioLocal: typeof row.fisio_local === 'string' ? row.fisio_local : undefined,
      fisioTerapeuta: typeof row.fisio_terapeuta === 'string' ? row.fisio_terapeuta : undefined,
      fisioOrientacoes:
        typeof row.fisio_orientacoes === 'string' ? row.fisio_orientacoes : undefined,
    };
    return acao;
  }

  const remedio: LembreteRemedio = {
    ...base,
    tipo: 'remedio',
    nomeRemedio: typeof row.nomeRemedio === 'string' ? row.nomeRemedio : '',
    frequencia: typeof row.frequencia === 'string' ? row.frequencia : '',
    observacoes: typeof row.observacoes === 'string' ? row.observacoes : undefined,
  };
  return remedio;
}

export function medicamentoParaDb(userId: string, med: Medicamento): Record<string, unknown> {
  const row: Record<string, unknown> = {
    user_id: userId,
    nome: med.nome,
    dosagem: med.dosagem,
    forma: med.forma,
    estoque: med.estoque,
    prescritor: med.prescritor ?? null,
    validade: med.validade ?? null,
    armazenamento: med.armazenamento ?? null,
    descontinuado: Boolean(med.descontinuado),
    dataInicio: med.dataInicio ? toIsoDate(med.dataInicio) : null,
    dataTermino: med.dataTermino ? toIsoDate(med.dataTermino) : null,
  };
  if (isUuidValido(med.id)) row.id = med.id;
  return row;
}

export function medicamentoDoDb(row: Record<string, unknown>): Medicamento {
  return {
    id: String(row.id),
    nome: typeof row.nome === 'string' ? row.nome : '',
    dosagem: typeof row.dosagem === 'string' ? row.dosagem : '',
    forma: typeof row.forma === 'string' ? row.forma : '',
    estoque: formatNumeroParaUi(row.estoque as string | number | null | undefined) || '0',
    prescritor: typeof row.prescritor === 'string' ? row.prescritor : undefined,
    validade: typeof row.validade === 'string' ? row.validade : undefined,
    armazenamento: typeof row.armazenamento === 'string' ? row.armazenamento : undefined,
    descontinuado: Boolean(row.descontinuado),
    dataInicio: typeof row.dataInicio === 'string' ? toIsoDate(row.dataInicio) : undefined,
    dataTermino: typeof row.dataTermino === 'string' ? toIsoDate(row.dataTermino) : undefined,
  };
}

export function sinalVitalParaDb(userId: string, sinal: SinalVital): Record<string, unknown> {
  const row: Record<string, unknown> = {
    user_id: userId,
    bpm: sinal.bpm || null,
    glicose: sinal.glicose || null,
    glicoseTipo: sinal.glicoseTipo ?? null,
    pressao: sinal.pressao ?? null,
    oxigenacao: sinal.oxigenacao || null,
    temperatura: sinal.temperatura ?? null,
    humor: sinal.humor ?? null,
    exercicio: sinal.exercicio ?? null,
    data: toIsoDate(sinal.data),
  };
  if (isUuidValido(sinal.id)) row.id = sinal.id;
  return row;
}

export function sinalVitalDoDb(row: Record<string, unknown>): SinalVital {
  return {
    id: String(row.id),
    bpm: typeof row.bpm === 'string' ? row.bpm : '',
    glicose: typeof row.glicose === 'string' ? row.glicose : '',
    glicoseTipo: typeof row.glicoseTipo === 'string' ? row.glicoseTipo : undefined,
    pressao: typeof row.pressao === 'string' ? row.pressao : undefined,
    oxigenacao: typeof row.oxigenacao === 'string' ? row.oxigenacao : undefined,
    temperatura: typeof row.temperatura === 'string' ? row.temperatura : undefined,
    humor: typeof row.humor === 'string' ? row.humor : undefined,
    exercicio: typeof row.exercicio === 'boolean' ? row.exercicio : undefined,
    data: toIsoDate(row.data as string | undefined),
  };
}

export function humorParaDb(userId: string, humor: HumorRegistro): Record<string, unknown> {
  const row: Record<string, unknown> = {
    user_id: userId,
    moodId: humor.moodId,
    activity: humor.activity ?? null,
    anotacao: humor.anotacao ?? null,
    horasSono: humor.horasSono ?? null,
    qualidadeSono: humor.qualidadeSono ?? null,
    data: toIsoDate(humor.data),
  };
  if (isUuidValido(humor.id)) row.id = humor.id;
  return row;
}

export function humorDoDb(row: Record<string, unknown>): HumorRegistro {
  return {
    id: String(row.id),
    moodId: typeof row.moodId === 'string' ? row.moodId : 'feliz',
    activity: typeof row.activity === 'string' ? row.activity : undefined,
    anotacao: typeof row.anotacao === 'string' ? row.anotacao : undefined,
    horasSono: typeof row.horasSono === 'string' ? (row.horasSono as HorasSono) : undefined,
    qualidadeSono:
      typeof row.qualidadeSono === 'string' ? (row.qualidadeSono as QualidadeSono) : undefined,
    data: toIsoDate(row.data as string | undefined),
  };
}

export function avaliacaoPsicologiaParaDb(
  userId: string,
  avaliacao: AvaliacaoPsicologica
): Record<string, unknown> {
  const row: Record<string, unknown> = {
    user_id: userId,
    tipo: avaliacao.tipo,
    pontuacao: parseInteiro(avaliacao.pontuacao) ?? 0,
    maxPontuacao: parseInteiro(avaliacao.maxPontuacao) ?? 0,
    classificacao: avaliacao.classificacao,
    orientacao: avaliacao.orientacao ?? null,
    alertaCritico: Boolean(avaliacao.alertaCritico),
    data: toIsoDate(avaliacao.data),
  };
  if (isUuidValido(avaliacao.id)) row.id = avaliacao.id;
  return row;
}

export function avaliacaoPsicologiaDoDb(row: Record<string, unknown>): AvaliacaoPsicologica {
  return {
    id: String(row.id),
    tipo: row.tipo === 'GAD-7' ? 'GAD-7' : 'PHQ-9',
    pontuacao: parseInteiro(row.pontuacao as number | string | null | undefined) ?? 0,
    maxPontuacao: parseInteiro(row.maxPontuacao as number | string | null | undefined) ?? 0,
    classificacao: typeof row.classificacao === 'string' ? row.classificacao : '',
    orientacao: typeof row.orientacao === 'string' ? row.orientacao : '',
    alertaCritico: Boolean(row.alertaCritico),
    data: toIsoDate(row.data as string | undefined),
  };
}

export function treinoParaDb(userId: string, treino: Treino): Record<string, unknown> {
  const row: Record<string, unknown> = {
    user_id: userId,
    descricao: treino.descricao,
    duracaoMinutos: parseInteiro(treino.duracaoMinutos),
    intensidade: treino.intensidade ?? null,
    caloriasEstimadas: parseInteiro(treino.caloriasEstimadas),
    data: toIsoDate(treino.data),
  };
  if (isUuidValido(treino.id)) row.id = treino.id;
  return row;
}

export function treinoDoDb(row: Record<string, unknown>): Treino {
  const intensidade =
    row.intensidade === 'Leve' || row.intensidade === 'Moderado' || row.intensidade === 'Intenso'
      ? row.intensidade
      : undefined;

  return {
    id: String(row.id),
    descricao: typeof row.descricao === 'string' ? row.descricao : '',
    duracaoMinutos:
      parseInteiro(row.duracaoMinutos as number | string | null | undefined) ?? undefined,
    intensidade,
    caloriasEstimadas:
      parseInteiro(row.caloriasEstimadas as number | string | null | undefined) ?? undefined,
    data: toIsoDate(row.data as string | undefined),
  };
}

export function registroDorParaDb(userId: string, dor: RegistroDor): Record<string, unknown> {
  const row: Record<string, unknown> = {
    user_id: userId,
    nivel: parseInteiro(dor.nivel) ?? 0,
    regiao: dor.regiao ?? null,
    tipo: dor.tipo ?? null,
    data: toIsoDate(dor.data),
  };
  if (isUuidValido(dor.id)) row.id = dor.id;
  return row;
}

export function registroDorDoDb(row: Record<string, unknown>): RegistroDor {
  return {
    id: String(row.id),
    nivel: parseInteiro(row.nivel as number | string | null | undefined) ?? 0,
    regiao: typeof row.regiao === 'string' ? (row.regiao as RegiaoDor) : undefined,
    tipo: typeof row.tipo === 'string' ? (row.tipo as TipoDor) : undefined,
    data: toIsoDate(row.data as string | undefined),
  };
}

export function pesoImcParaDb(userId: string, registro: PesoImcRegistro): Record<string, unknown> {
  const row: Record<string, unknown> = {
    user_id: userId,
    peso: parseNumeroPtBr(registro.peso) ?? 0,
    imc: parseNumeroPtBr(registro.imc),
    data: toIsoDate(registro.data),
  };
  if (isUuidValido(registro.id)) row.id = registro.id;
  return row;
}

export function pesoImcDoDb(row: Record<string, unknown>): PesoImcRegistro {
  return {
    id: String(row.id),
    peso: parseNumeroPtBr(row.peso as number | string | null | undefined) ?? 0,
    imc: parseNumeroPtBr(row.imc as number | string | null | undefined) ?? undefined,
    data: toIsoDate(row.data as string | undefined),
  };
}

export function checklistParaDb(
  userId: string,
  checklist: ChecklistCuidadoDiario
): Record<string, unknown> {
  return {
    user_id: userId,
    data: checklist.data,
    itens_concluidos: checklist.itensConcluidos,
    updated_at: new Date().toISOString(),
  };
}

export function checklistDoDb(row: Record<string, unknown> | null): ChecklistCuidadoDiario | null {
  if (!row || typeof row.data !== 'string') return null;
  return {
    data: row.data,
    itensConcluidos: Array.isArray(row.itens_concluidos)
      ? row.itens_concluidos.filter((item): item is string => typeof item === 'string')
      : [],
  };
}
