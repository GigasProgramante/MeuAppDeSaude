import { Ionicons } from '@expo/vector-icons';
import { Lembrete, LembreteAcao } from '../types';

export type AreaLembretePreset = 'psicologia' | 'enfermagem' | 'farmacia' | 'corpo';

export interface LembretePresetIdoso {
  id: string;
  area: AreaLembretePreset;
  titulo: string;
  descricao: string;
  horario: string;
  tipoAcao: LembreteAcao['tipoAcao'];
  icon: keyof typeof Ionicons.glyphMap;
}

export const LEMBRETES_PRESETS_IDOSOS: Record<AreaLembretePreset, LembretePresetIdoso[]> = {
  psicologia: [
    {
      id: 'psico-sono-saudavel',
      area: 'psicologia',
      titulo: 'Higiene do sono e desligar telas',
      descricao: 'Reduzir luzes, evitar café ou TV alta e preparar ambiente calmo para dormir bem.',
      horario: '21:30',
      tipoAcao: 'outro',
      icon: 'moon-outline',
    },
    {
      id: 'psico-respiracao-humor',
      area: 'psicologia',
      titulo: 'Check-in emocional e respiração calma',
      descricao: 'Registrar como você se sentiu no dia e fazer 2 minutos de respiração guiada.',
      horario: '19:00',
      tipoAcao: 'outro',
      icon: 'leaf-outline',
    },
    {
      id: 'psico-sol-contato',
      area: 'psicologia',
      titulo: 'Banho de sol matinal e conversa',
      descricao: 'Tomar 15 minutos de sol pela manhã e conversar com um familiar ou amigo.',
      horario: '09:30',
      tipoAcao: 'outro',
      icon: 'sunny-outline',
    },
  ],
  enfermagem: [
    {
      id: 'enf-pa-repouso',
      area: 'enfermagem',
      titulo: 'Medir pressão arterial em repouso',
      descricao: 'Descansar sentado(a) por 5 minutos com os pés no chão antes de aferir a pressão.',
      horario: '08:00',
      tipoAcao: 'pressao',
      icon: 'fitness-outline',
    },
    {
      id: 'enf-glicemia-pes',
      area: 'enfermagem',
      titulo: 'Glicemia em jejum e checar os pés',
      descricao: 'Conferir glicemia se indicado e observar diariamente a pele dos pés.',
      horario: '07:30',
      tipoAcao: 'outro',
      icon: 'water-outline',
    },
    {
      id: 'enf-cuidados-diarios',
      area: 'enfermagem',
      titulo: 'Checklist de cuidados e vacinação',
      descricao: 'Conferir higiene bucal, hidratação da pele e vacinas em dia.',
      horario: '18:00',
      tipoAcao: 'outro',
      icon: 'shield-checkmark-outline',
    },
  ],
  farmacia: [
    {
      id: 'farm-controle-acucar',
      area: 'farmacia',
      titulo: 'Controle de açúcar e doces após refeições',
      descricao: 'Dar preferência a frutas, moderar doces e manter horários regulares para refeições.',
      horario: '13:30',
      tipoAcao: 'outro',
      icon: 'nutrition-outline',
    },
    {
      id: 'farm-caixa-remedios',
      area: 'farmacia',
      titulo: 'Conferir caixa de remédios e estoque',
      descricao: 'Separar doses do dia e checar unidades restantes e prazo de validade.',
      horario: '09:00',
      tipoAcao: 'outro',
      icon: 'medkit-outline',
    },
    {
      id: 'farm-agua-remedio',
      area: 'farmacia',
      titulo: 'Tomar medicações apenas com água',
      descricao: 'Evitar automedicação e não ingerir medicamentos com chás ou café sem orientação.',
      horario: '15:00',
      tipoAcao: 'outro',
      icon: 'medical-outline',
    },
  ],
  corpo: [
    {
      id: 'corpo-agua-manha',
      area: 'corpo',
      titulo: 'Beber 1 copo de água (manhã)',
      descricao: 'Beber 250 ml de água aos poucos para manter disposição, rins saudáveis e evitar tontura.',
      horario: '10:30',
      tipoAcao: 'agua',
      icon: 'water-outline',
    },
    {
      id: 'corpo-agua-tarde',
      area: 'corpo',
      titulo: 'Beber 1 copo de água (tarde)',
      descricao: 'Repor líquidos no meio da tarde mesmo sem sentir sede intensa.',
      horario: '16:00',
      tipoAcao: 'agua',
      icon: 'water-outline',
    },
    {
      id: 'corpo-caminhada-10',
      area: 'corpo',
      titulo: 'Levantar e movimentar por 10 minutos',
      descricao: 'Fazer breve caminhada em local seguro e alongar tornozelos e ombros.',
      horario: '14:30',
      tipoAcao: 'exercicio',
      icon: 'walk-outline',
    },
  ],
};

export function encontrarLembretePreset(
  lembretes: Lembrete[],
  preset: LembretePresetIdoso
): Lembrete | undefined {
  return lembretes.find(
    (l) =>
      l.tipo === 'acao' &&
      l.horario === preset.horario &&
      l.acaoPersonalizada === preset.titulo
  );
}
