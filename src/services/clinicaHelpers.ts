import { Lembrete, Medicamento, Treino } from '../types';
import { getHojeLocalKey, parseNumeroPtBr } from './mappers';

export interface ImcResultado {
  imc: number;
  imcArredondado: number;
  classificacao:
    | 'Abaixo do peso'
    | 'Normal'
    | 'Sobrepeso'
    | 'Obesidade Grau I'
    | 'Obesidade Grau II'
    | 'Obesidade Grau III';
  cor: string;
}

/**
 * Calcula e classifica o IMC em faixas contínuas da OMS sem lacunas de fronteira.
 * O arredondamento para 1 casa decimal garante coerência entre o valor exibido e a faixa
 * (ex.: 24.95 -> 25.0 -> "Sobrepeso"; 29.95 -> 30.0 -> "Obesidade Grau I").
 */
export function calcularEClassificarImc(
  pesoInput: string | number,
  alturaCmInput: string | number
): ImcResultado | null {
  const peso = parseNumeroPtBr(pesoInput);
  const alturaCm = parseNumeroPtBr(alturaCmInput);
  if (peso === null || alturaCm === null || peso <= 0 || alturaCm <= 0) {
    return null;
  }

  const alturaM = alturaCm / 100;
  const imcBruto = peso / (alturaM * alturaM);
  const imcArredondado = Math.round(imcBruto * 10) / 10;

  if (imcArredondado < 18.5) {
    return { imc: imcBruto, imcArredondado, classificacao: 'Abaixo do peso', cor: '#1D4ED8' };
  }
  if (imcArredondado < 25) {
    return { imc: imcBruto, imcArredondado, classificacao: 'Normal', cor: '#15803D' };
  }
  if (imcArredondado < 30) {
    return { imc: imcBruto, imcArredondado, classificacao: 'Sobrepeso', cor: '#B45309' };
  }
  if (imcArredondado < 35) {
    return { imc: imcBruto, imcArredondado, classificacao: 'Obesidade Grau I', cor: '#C2410C' };
  }
  if (imcArredondado < 40) {
    return { imc: imcBruto, imcArredondado, classificacao: 'Obesidade Grau II', cor: '#B91C1C' };
  }
  return { imc: imcBruto, imcArredondado, classificacao: 'Obesidade Grau III', cor: '#991B1B' };
}

/**
 * Retorna início (segunda 00:00:00) e fim (domingo 23:59:59.999) da semana corrente local.
 */
export function obterLimitesSemanaCorrente(referencia: Date = new Date()): {
  inicio: Date;
  fim: Date;
} {
  const inicio = new Date(
    referencia.getFullYear(),
    referencia.getMonth(),
    referencia.getDate(),
    0,
    0,
    0,
    0
  );
  const diaSemana = inicio.getDay(); // 0 = Dom, 1 = Seg ... 6 = Sab
  const ajusteParaSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;
  inicio.setDate(inicio.getDate() + ajusteParaSegunda);

  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 6);
  fim.setHours(23, 59, 59, 999);
  return { inicio, fim };
}

/**
 * Conta quantos treinos ocorreram na semana corrente (segunda a domingo).
 */
export function contarTreinosSemanaCorrente(
  treinos: Pick<Treino, 'data'>[],
  referencia: Date = new Date()
): number {
  if (!Array.isArray(treinos) || treinos.length === 0) return 0;
  const { inicio, fim } = obterLimitesSemanaCorrente(referencia);
  const inicioMs = inicio.getTime();
  const fimMs = fim.getTime();

  return treinos.reduce((acc, treino) => {
    const t = new Date(treino.data).getTime();
    if (!isNaN(t) && t >= inicioMs && t <= fimMs) {
      return acc + 1;
    }
    return acc;
  }, 0);
}

export interface VitalLimit {
  min: number;
  max: number;
  healthyMin: number;
  healthyMax: number;
  unit: string;
  label: string;
  name: string;
}

/**
 * Fonte única de verdade para limites e faixas saudáveis de sinais vitais
 * (usada tanto em alertas quanto nos gráficos de evolução).
 */
export const VITALS_LIMITS: Record<
  'bpm' | 'glicose' | 'pressaoSistolica' | 'pressaoDiastolica' | 'oxigenacao' | 'temperatura',
  VitalLimit
> = {
  bpm: {
    min: 0,
    max: 250,
    healthyMin: 50,
    healthyMax: 120,
    unit: 'bpm',
    label: 'Batimentos Cardíacos',
    name: 'bpm',
  },
  glicose: {
    min: 0,
    max: 800,
    healthyMin: 70,
    healthyMax: 140,
    unit: 'mg/dL',
    label: 'Glicemia',
    name: 'glicose',
  },
  pressaoSistolica: {
    min: 60,
    max: 280,
    healthyMin: 100,
    healthyMax: 130,
    unit: 'mmHg',
    label: 'Pressão Sistólica',
    name: 'pressaoSistolica',
  },
  pressaoDiastolica: {
    min: 30,
    max: 200,
    healthyMin: 60,
    healthyMax: 90,
    unit: 'mmHg',
    label: 'Pressão Diastólica',
    name: 'pressaoDiastolica',
  },
  oxigenacao: {
    min: 0,
    max: 100,
    healthyMin: 95,
    healthyMax: 100,
    unit: '%',
    label: 'Saturação de Oxigênio',
    name: 'oxigenacao',
  },
  temperatura: {
    min: 30,
    max: 43,
    healthyMin: 35.0,
    healthyMax: 37.8,
    unit: '°C',
    label: 'Temperatura Corporal',
    name: 'temperatura',
  },
};

export function obterFaixaGlicose(glicoseTipo?: string | null): { min: number; max: number } {
  if (glicoseTipo === 'Jejum') return { min: 70, max: 99 };
  if (glicoseTipo === 'Pré-prandial') return { min: 70, max: 129 };
  return { min: 70, max: 140 };
}

export const normalizeNomeMedicamento = (valor: string): string =>
  valor
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export function avaliarValidadeMedicamento(
  validade?: string,
  referencia: Date = new Date()
): 'vencido' | 'proximo' | 'ok' | null {
  if (!validade || !validade.trim()) return null;
  const clean = validade.trim();
  const partes = clean.split(/[/-]/);
  let expiryDate: Date | null = null;

  if (partes.length === 2) {
    const mes = parseInt(partes[0], 10);
    const anoRaw = parseInt(partes[1], 10);
    const ano = anoRaw < 100 ? 2000 + anoRaw : anoRaw;
    if (!isNaN(mes) && !isNaN(ano) && mes >= 1 && mes <= 12) {
      expiryDate = new Date(ano, mes, 0, 23, 59, 59);
    }
  } else if (partes.length === 3) {
    const dia = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10);
    const anoRaw = parseInt(partes[2], 10);
    const ano = anoRaw < 100 ? 2000 + anoRaw : anoRaw;
    if (!isNaN(dia) && !isNaN(mes) && !isNaN(ano) && mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31) {
      expiryDate = new Date(ano, mes - 1, dia, 23, 59, 59);
    }
  }

  if (!expiryDate || isNaN(expiryDate.getTime())) return null;

  const diffDias = (expiryDate.getTime() - referencia.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDias < 0) return 'vencido';
  if (diffDias <= 30) return 'proximo';
  return 'ok';
}

export function isLembreteConcluidoNaData(
  item: Pick<Lembrete, 'concluido' | 'dosesTomadasPorData'>,
  dataChave: string = getHojeLocalKey()
): boolean {
  if (item.dosesTomadasPorData && typeof item.dosesTomadasPorData === 'object') {
    return Boolean(item.dosesTomadasPorData[dataChave]);
  }
  return Boolean(item.concluido);
}

export interface ResultadoAlternanciaDose {
  proximoStatus: boolean;
  dosesTomadasPorData: Record<string, boolean>;
  dosesBaixadasPorData: Record<string, boolean>;
  medicamentoAtualizado?: {
    id: string;
    nome: string;
    estoqueAnterior: number;
    novoEstoque: number;
    alteracao: 'baixou' | 'zerado';
  };
}

/**
 * Alterna conclusão de um lembrete para a data informada (YYYY-MM-DD),
 * impedindo baixas duplicadas no estoque quando o usuário marca/desmarca no mesmo dia.
 */
export function calcularAlternanciaDoseNaData(
  item: Lembrete,
  medicamentos: Medicamento[],
  dataChave: string = getHojeLocalKey()
): ResultadoAlternanciaDose {
  const atualConcluido = isLembreteConcluidoNaData(item, dataChave);
  const proximoStatus = !atualConcluido;

  const mapaTomadas = { ...(item.dosesTomadasPorData || {}) };
  const mapaBaixas = { ...(item.dosesBaixadasPorData || {}) };
  if (proximoStatus) {
    mapaTomadas[dataChave] = true;
  } else {
    delete mapaTomadas[dataChave];
  }

  if (item.tipo !== 'remedio') {
    return {
      proximoStatus,
      dosesTomadasPorData: mapaTomadas,
      dosesBaixadasPorData: mapaBaixas,
    };
  }

  const remNorm = normalizeNomeMedicamento(item.nomeRemedio);
  const ativos = medicamentos.filter((m) => !m.descontinuado);

  let medCorrespondente = ativos.find((m) => normalizeNomeMedicamento(m.nome) === remNorm);
  if (!medCorrespondente && remNorm.length >= 3) {
    medCorrespondente = ativos.find((m) => {
      const medNorm = normalizeNomeMedicamento(m.nome);
      return medNorm.includes(remNorm) || remNorm.includes(medNorm);
    });
  }

  if (!medCorrespondente) {
    return {
      proximoStatus,
      dosesTomadasPorData: mapaTomadas,
      dosesBaixadasPorData: mapaBaixas,
    };
  }

  const estoqueAtual = parseInt(medCorrespondente.estoque || '0', 10);
  const qtdValida = isNaN(estoqueAtual) ? 0 : estoqueAtual;

  if (proximoStatus) {
    if (mapaBaixas[dataChave]) {
      return {
        proximoStatus,
        dosesTomadasPorData: mapaTomadas,
        dosesBaixadasPorData: mapaBaixas,
      };
    }

    if (qtdValida > 0) {
      mapaBaixas[dataChave] = true;
      return {
        proximoStatus,
        dosesTomadasPorData: mapaTomadas,
        dosesBaixadasPorData: mapaBaixas,
        medicamentoAtualizado: {
          id: medCorrespondente.id,
          nome: medCorrespondente.nome,
          estoqueAnterior: qtdValida,
          novoEstoque: qtdValida - 1,
          alteracao: 'baixou',
        },
      };
    }

    return {
      proximoStatus,
      dosesTomadasPorData: mapaTomadas,
      dosesBaixadasPorData: mapaBaixas,
      medicamentoAtualizado: {
        id: medCorrespondente.id,
        nome: medCorrespondente.nome,
        estoqueAnterior: 0,
        novoEstoque: 0,
        alteracao: 'zerado',
      },
    };
  }

  return {
    proximoStatus,
    dosesTomadasPorData: mapaTomadas,
    dosesBaixadasPorData: mapaBaixas,
  };
}

export interface ExercicioAdaptado {
  id: string;
  nome: string;
  descricao: string;
  intensidade: 'Leve' | 'Moderada';
  indicacoes: string[];
  cuidados?: string;
}

export const BIBLIOTECA_EXERCICIOS: ExercicioAdaptado[] = [
  {
    id: 'caminhada-leve',
    nome: 'Caminhada em Ritmo Confortável',
    descricao: '20 a 30 minutos em terreno plano, mantendo respiração fluida e conversa possível sem falta de ar.',
    intensidade: 'Leve',
    indicacoes: ['Hipertensão', 'Diabetes', 'Problema Cardíaco', 'Geral'],
    cuidados: 'Aqueça 5 minutos devagar e leve água. Interrompa se sentir tontura, dor no peito ou falta de ar.',
  },
  {
    id: 'alongamento-matinal',
    nome: 'Alongamento Global e Mobilidade',
    descricao: 'Movimentos suaves de pescoço, ombros, costas e panturrilhas por 10 a 15 minutos sem prender a respiração.',
    intensidade: 'Leve',
    indicacoes: ['Hipertensão', 'Diabetes', 'Problema Cardíaco', 'Geral'],
    cuidados: 'Evite apneia (prender o ar) durante o alongamento, especialmente em hipertensão ou cardiopatia.',
  },
  {
    id: 'caminhada-pos-refeicao',
    nome: 'Caminhada Leve Pós-Refeição',
    descricao: '15 minutos de caminhada tranquila cerca de 30 minutos após as refeições para auxiliar o controle glicêmico.',
    intensidade: 'Leve',
    indicacoes: ['Diabetes'],
    cuidados: 'Verifique a glicemia antes se usar insulina e use calçado confortável para proteger os pés.',
  },
  {
    id: 'sentar-levantar',
    nome: 'Sentar e Levantar Controlado',
    descricao: '2 séries de 8 a 10 repetições em cadeira firme, subindo sem impulso e respirando ao fazer força.',
    intensidade: 'Leve',
    indicacoes: ['Diabetes', 'Hipertensão', 'Problema Cardíaco', 'Geral'],
    cuidados: 'Não prenda a respiração ao levantar (evite manobra de Valsalva).',
  },
  {
    id: 'caminhada-rapida',
    nome: 'Caminhada Moderada Ativa',
    descricao: 'Caminhe em ritmo acelerado por 30 minutos em percurso seguro para condicionamento cardiorrespiratório.',
    intensidade: 'Moderada',
    indicacoes: ['Geral'],
  },
  {
    id: 'agachamento-simples',
    nome: 'Agachamento Simples + Flexão Adaptada',
    descricao: '3 séries de 12 agachamentos livres e flexão com apoio na parede ou joelhos no chão.',
    intensidade: 'Moderada',
    indicacoes: ['Geral'],
  },
];

export interface ResultadoBibliotecaExercicios {
  exercicios: ExercicioAdaptado[];
  comorbidadesAtivas: string[];
  avisoLiberacaoMedica: string | null;
}

export function filtrarExerciciosPorComorbidades(
  comorbidades?: string[] | null
): ResultadoBibliotecaExercicios {
  const ativas = (comorbidades || []).filter((c) => c && c !== 'Nenhuma');

  if (ativas.length === 0) {
    return {
      exercicios: BIBLIOTECA_EXERCICIOS.filter(
        (ex) => ex.indicacoes.includes('Geral') && ex.id !== 'sentar-levantar'
      ),
      comorbidadesAtivas: [],
      avisoLiberacaoMedica: null,
    };
  }

  const filtrados = BIBLIOTECA_EXERCICIOS.filter((ex) =>
    ativas.some((cond) => ex.indicacoes.includes(cond))
  );

  // Condições cardiovasculares devem priorizar exercícios estritamente leves
  const temRestricaoCardio =
    ativas.includes('Problema Cardíaco') || ativas.includes('Hipertensão');
  const seguros = temRestricaoCardio
    ? filtrados.filter((ex) => ex.intensidade === 'Leve')
    : filtrados;

  return {
    exercicios: seguros,
    comorbidadesAtivas: ativas,
    avisoLiberacaoMedica:
      'Como você informou condições de saúde prévias, pratique atividades leves após liberação médica e respeitando seus limites físicos.',
  };
}

export function formatarMascaraHora(texto: string): string {
  const digitos = texto.replace(/\D/g, '').slice(0, 4);
  if (digitos.length <= 2) return digitos;
  return `${digitos.slice(0, 2)}:${digitos.slice(2)}`;
}

export function formatarMascaraMesAno(texto: string): string {
  const digitos = texto.replace(/\D/g, '').slice(0, 6);
  if (digitos.length <= 2) return digitos;
  return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
}
