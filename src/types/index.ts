export interface LembreteBase {
  id: string;
  tipo: 'remedio' | 'acao';
  concluido: boolean;
  horario: string; // Ex: 08:00
  notificationId?: string;
  notificationIds?: string[];
  periodicidade?: 'diaria' | 'semanal' | 'dias_especificos';
  diasSemana?: number[];
}

export interface LembreteRemedio extends LembreteBase {
  tipo: 'remedio';
  nomeRemedio: string;
  frequencia: string;
  observacoes?: string;
}

export interface LembreteAcao extends LembreteBase {
  tipo: 'acao';
  tipoAcao: 'consulta' | 'exercicio' | 'agua' | 'pressao' | 'outro';
  acaoPersonalizada?: string;
}

export type Lembrete = LembreteRemedio | LembreteAcao;
export type LembreteInput = Omit<LembreteRemedio, 'id'> | Omit<LembreteAcao, 'id'>;
export type LembretePatch = Partial<Omit<LembreteRemedio, 'id' | 'tipo'>> & Partial<Omit<LembreteAcao, 'id' | 'tipo'>>;

export interface SinalVital {
  id: string;
  bpm: string;
  glicose: string;
  glicoseTipo?: string;
  pressao?: string;
  oxigenacao?: string;
  temperatura?: string;
  humor?: string;
  exercicio?: boolean;
  data: string;
}

export type HorasSono = 'Menos de 5h' | '5 a 6h' | '7 a 8h' | 'Mais de 8h';
export type QualidadeSono = 'Ruim' | 'Regular' | 'Boa';

export interface HumorRegistro {
  id: string;
  moodId: string;
  activity?: string;
  anotacao?: string; // Diário de texto livre "Como foi seu dia?" (RF36)
  horasSono?: HorasSono; // Registro de sono (RF42)
  qualidadeSono?: QualidadeSono; // Registro de sono (RF42)
  data: string;
}

export interface AvaliacaoPsicologica {
  id: string;
  tipo: 'PHQ-9' | 'GAD-7';
  pontuacao: number;
  maxPontuacao: number;
  classificacao: string;
  orientacao: string;
  alertaCritico?: boolean;
  data: string;
}

export interface Medicamento {
  id: string;
  nome: string;
  dosagem: string;
  forma: string;
  estoque: string;
  prescritor?: string;
  validade?: string;
  armazenamento?: string;
  descontinuado?: boolean;
  dataInicio?: string;
  dataTermino?: string;
}

export interface Treino {
  id: string;
  descricao: string;
  duracaoMinutos?: number;
  intensidade?: 'Leve' | 'Moderado' | 'Intenso';
  caloriasEstimadas?: number;
  data: string;
}

export type RegiaoDor = 'Coluna Lombar' | 'Pescoço' | 'Joelho' | 'Ombro' | 'Punho';
export type TipoDor = 'Muscular' | 'Articular' | 'Pontada' | 'Queimação';

export interface RegistroDor {
  id: string;
  nivel: number;
  // Opcionais para manter compatibilidade com registros salvos antes destes campos.
  regiao?: RegiaoDor;
  tipo?: TipoDor;
  data: string;
}

export interface PesoImcRegistro {
  id: string;
  peso: number;
  imc?: number;
  data: string;
}

export interface ChecklistCuidadoDiario {
  data: string; // YYYY-MM-DD
  itensConcluidos: string[];
}

export interface PerfilUsuario {
  nome: string;
  fotoUri: string | null;
  telefone: string;
  frequenciaAtividade?: string;
  idade?: string;
  peso?: string;
  altura?: string;
  sexo?: string;
  imc?: number;
  comorbidades?: string[];
  alergias?: string;
}
