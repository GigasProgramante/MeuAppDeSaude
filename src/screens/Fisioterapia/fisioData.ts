export interface ExercicioFisioterapia {
  id: string;
  titulo: string;
  regiao: string;
  duracao: string;
  series: string;
  objetivo: string;
  passos: string[];
  alertaSeguranca: string;
}

export interface PresetPosturaLembrete {
  id: string;
  titulo: string;
  horarioSugerido: string;
  descricao: string;
  orientacoes: string;
}

export const EXERCICIOS_FISIO_HOJE: ExercicioFisioterapia[] = [
  {
    id: 'alongamento-cervical',
    titulo: 'Alongamento Cervical Suave',
    regiao: 'Pescoço e trapézio',
    duracao: '3 min',
    series: '3 repetições de 20s cada lado',
    objetivo: 'Aliviar tensão acumulada na nuca e nos ombros após uso de celular ou computador.',
    passos: [
      'Sente-se com a coluna apoiada, ombros relaxados e pés firmes no chão.',
      'Incline lentamente a orelha direita em direção ao ombro direito sem elevar os ombros.',
      'Mantenha por 20 segundos respirando devagar; se quiser, apoie levemente a mão sem puxar com força.',
      'Retorne ao centro devagar e repita para o lado esquerdo.',
    ],
    alertaSeguranca: 'Interrompa imediatamente se houver tontura, dormência ou dor aguda irradiando para o braço.',
  },
  {
    id: 'ponte-lombar',
    titulo: 'Ponte de Quadril (Estabilização Lombar)',
    regiao: 'Lombar e glúteos',
    duracao: '4 min',
    series: '2 séries de 10 repetições',
    objetivo: 'Fortalecer glúteos e musculatura estabilizadora da coluna lombar sem sobrecarga.',
    passos: [
      'Deite-se de barriga para cima em superfície firme, joelhos dobrados e pés na largura do quadril.',
      'Solte o ar e eleve o quadril devagar até alinhar joelhos, quadril e ombros.',
      'Sustente no topo por 3 segundos contraindo suavemente o abdômen e os glúteos.',
      'Desça vértebra por vértebra até apoiar toda a lombar novamente.',
    ],
    alertaSeguranca: 'Não arqueie excessivamente a lombar no topo do movimento; mantenha o pescoço relaxado.',
  },
  {
    id: 'deslizamento-escapular',
    titulo: 'Abertura Peitoral e Escápulas',
    regiao: 'Ombros e coluna torácica',
    duracao: '3 min',
    series: '2 séries de 12 repetições',
    objetivo: 'Corrigir postura curvada para frente e melhorar a mobilidade dos ombros.',
    passos: [
      'Em pé ou sentado ereto, dobre os cotovelos a 90 graus junto ao tronco.',
      'Junte suavemente as escápulas nas costas levando os antebraços para fora sem erguer os ombros.',
      'Segure por 3 segundos sentindo leve abertura no peito.',
      'Relaxe retornando à posição inicial com controle.',
    ],
    alertaSeguranca: 'Evite forçar os ombros em caso de dor aguda no manguito rotador.',
  },
  {
    id: 'bomba-tornozelo',
    titulo: 'Mobilidade de Tornozelo e Panturrilha',
    regiao: 'Pernas, tornozelos e circulação',
    duracao: '3 min',
    series: '2 séries de 15 repetições',
    objetivo: 'Estimular o retorno venoso, reduzir rigidez nos tornozelos e prevenir câimbras.',
    passos: [
      'Sentado ou deitado com as pernas estendidas e apoiadas.',
      'Aponte os dedos dos pés devagar para frente como se pisasse em um pedal.',
      'Em seguida, puxe a ponta dos pés em direção às canelas sentindo alongar a panturrilha.',
      'Execute de forma ritmada e fluida acompanhando a respiração.',
    ],
    alertaSeguranca: 'Movimentos suaves sem provocar dor articular aguda.',
  },
];

export const PRESETS_POSTURA_FISIO: PresetPosturaLembrete[] = [
  {
    id: 'pausa-postura-manha',
    titulo: 'Pausa de postura e alongamento',
    horarioSugerido: '10:00',
    descricao: 'Checar alinhamento da coluna, relaxar ombros e levantar por 2 minutos.',
    orientacoes: 'Manter pés apoiados no chão, tela na altura dos olhos e alongar pescoço suavemente.',
  },
  {
    id: 'pausa-postura-tarde',
    titulo: 'Check-up postural da tarde',
    horarioSugerido: '15:00',
    descricao: 'Levantar da cadeira, hidratar-se e fazer mobilidade de ombros e tornozelos.',
    orientacoes: 'Evitar permanecer mais de 50 minutos sentado contínuos sem breve caminhada.',
  },
  {
    id: 'descompressao-noite',
    titulo: 'Relaxamento lombar noturno',
    horarioSugerido: '20:00',
    descricao: 'Executar respiração diafragmática e exercícios leves antes de dormir.',
    orientacoes: 'Priorizar movimentos lentos e confortáveis sem forçar amplitude com dor.',
  },
];
