export interface ContatoCrise {
  id: string;
  nome: string;
  telefone: string;
  telefoneDiscagem: string;
  disponibilidade: string;
  descricao: string;
  destaque?: boolean;
}

export interface FaseRespiracao {
  id: 'inspirar' | 'segurar' | 'expirar';
  label: string;
  instrucao: string;
  duracaoSegundos: number;
}

export interface EtapaGrounding {
  id: string;
  quantidade: number;
  sentido: string;
  titulo: string;
  descricao: string;
  exemplos: string;
}

export const CONTATOS_CRISE: ContatoCrise[] = [
  {
    id: 'cvv',
    nome: 'CVV — Centro de Valorização da Vida',
    telefone: '188',
    telefoneDiscagem: 'tel:188',
    disponibilidade: '24 horas · Ligação gratuita e sigilosa',
    descricao: 'Apoio emocional e prevenção do suicídio por telefone ou chat em cvv.org.br.',
    destaque: true,
  },
  {
    id: 'samu',
    nome: 'SAMU — Emergência Médica',
    telefone: '192',
    telefoneDiscagem: 'tel:192',
    disponibilidade: '24 horas · Emergência imediata',
    descricao: 'Acione em situações de risco físico agudo, crise grave ou urgência médica.',
    destaque: true,
  },
  {
    id: 'caps',
    nome: 'CAPS — Centro de Atenção Psicossocial',
    telefone: '136',
    telefoneDiscagem: 'tel:136',
    disponibilidade: 'Rede SUS · Disque Saúde para orientações',
    descricao: 'Atendimento público presencial em saúde mental na sua cidade ou UBS mais próxima.',
  },
  {
    id: 'unc-psico',
    nome: 'Clínica-Escola de Psicologia UNC (Mafra)',
    telefone: '(47) 3641-5524',
    telefoneDiscagem: 'tel:4736415524',
    disponibilidade: 'Horário acadêmico · Agendamento e triagem',
    descricao: 'Atendimento psicológico supervisionado para comunidade e estudantes.',
  },
];

export const FASES_RESPIRACAO_478: FaseRespiracao[] = [
  {
    id: 'inspirar',
    label: 'Inspire',
    instrucao: 'Puxe o ar calmamente pelo nariz enchendo o abdômen.',
    duracaoSegundos: 4,
  },
  {
    id: 'segurar',
    label: 'Segure',
    instrucao: 'Mantenha o ar nos pulmões sem tensionar os ombros.',
    duracaoSegundos: 7,
  },
  {
    id: 'expirar',
    label: 'Expire',
    instrucao: 'Solte o ar devagar pela boca como se soprasse uma vela.',
    duracaoSegundos: 8,
  },
];

export const FASES_RESPIRACAO_DIAFRAGMATICA: FaseRespiracao[] = [
  {
    id: 'inspirar',
    label: 'Inspire fundo',
    instrucao: 'Uma mão no peito, outra na barriga: sinta o abdômen subir.',
    duracaoSegundos: 4,
  },
  {
    id: 'segurar',
    label: 'Pausa suave',
    instrucao: 'Observe os ombros relaxados por um instante.',
    duracaoSegundos: 2,
  },
  {
    id: 'expirar',
    label: 'Solte o ar',
    instrucao: 'Expire lentamente pelos lábios entreabertos por 6 segundos.',
    duracaoSegundos: 6,
  },
];

export const ETAPAS_GROUNDING_54321: EtapaGrounding[] = [
  {
    id: 'visao',
    quantidade: 5,
    sentido: 'Visão',
    titulo: '5 coisas que você consegue ver',
    descricao: 'Olhe ao redor sem pressa e nomeie cinco detalhes visíveis neste ambiente.',
    exemplos: 'Ex.: a cor da parede, uma janela, a textura da mesa, um objeto próximo, a luz.',
  },
  {
    id: 'tato',
    quantidade: 4,
    sentido: 'Tato',
    titulo: '4 coisas que você consegue tocar',
    descricao: 'Perceba sensações físicas no seu corpo agora.',
    exemplos: 'Ex.: os pés apoiados no chão, o tecido da roupa, a temperatura da cadeira, suas mãos.',
  },
  {
    id: 'audicao',
    quantidade: 3,
    sentido: 'Audição',
    titulo: '3 sons que você consegue ouvir',
    descricao: 'Escute com atenção os sons distantes e próximos sem julgamento.',
    exemplos: 'Ex.: sua própria respiração, ruído da rua, vento, relógio ou aparelho ligado.',
  },
  {
    id: 'olfato',
    quantidade: 2,
    sentido: 'Olfato',
    titulo: '2 cheiros que você consegue sentir',
    descricao: 'Inspire suavemente tentando notar dois aromas presentes ou conhecidos.',
    exemplos: 'Ex.: café, sabonete, ar fresco ou o cheiro neutro do ambiente.',
  },
  {
    id: 'paladar',
    quantidade: 1,
    sentido: 'Paladar',
    titulo: '1 sabor ou gole de água',
    descricao: 'Perceba o gosto na boca ou tome um gole lento de água se houver por perto.',
    exemplos: 'Ex.: frescor da água, hortelã, café ou apenas a sensação da boca relaxada.',
  },
];
