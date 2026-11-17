import {
  VITALS_LIMITS,
  avaliarValidadeMedicamento,
  calcularAlternanciaDoseNaData,
  calcularEClassificarImc,
  contarTreinosSemanaCorrente,
  isLembreteConcluidoNaData,
} from './clinicaHelpers';
import { LembreteRemedio, Medicamento } from '../types';

describe('cálculo e classificação de IMC (PROB-03)', () => {
  it('classifica faixas contínuas sem lacunas e mapeia 24.95 para Sobrepeso', () => {
    // 1.00m de altura => peso == IMC para facilitar validação exata de fronteiras
    expect(calcularEClassificarImc('18,4', '100')?.classificacao).toBe('Abaixo do peso');
    expect(calcularEClassificarImc('18,5', '100')?.classificacao).toBe('Normal');
    expect(calcularEClassificarImc('24,9', '100')?.classificacao).toBe('Normal');
    expect(calcularEClassificarImc('24,95', '100')?.classificacao).toBe('Sobrepeso');
    expect(calcularEClassificarImc('25', '100')?.classificacao).toBe('Sobrepeso');
    expect(calcularEClassificarImc('29,9', '100')?.classificacao).toBe('Sobrepeso');
    expect(calcularEClassificarImc('29,95', '100')?.classificacao).toBe('Obesidade Grau I');
    expect(calcularEClassificarImc('34,9', '100')?.classificacao).toBe('Obesidade Grau I');
    expect(calcularEClassificarImc('35', '100')?.classificacao).toBe('Obesidade Grau II');
    expect(calcularEClassificarImc('40', '100')?.classificacao).toBe('Obesidade Grau III');
  });

  it('retorna null quando peso ou altura são inválidos', () => {
    expect(calcularEClassificarImc('0', '170')).toBeNull();
    expect(calcularEClassificarImc('70', '')).toBeNull();
  });
});

describe('meta semanal de treinos — segunda a domingo (PROB-02)', () => {
  it('conta apenas treinos dentro da semana corrente (segunda a domingo)', () => {
    // Quarta-feira, 18/11/2026 => semana vai de Seg 16/11/2026 a Dom 22/11/2026
    const quartaRef = new Date(2026, 10, 18, 12, 0, 0);

    const treinos = [
      { data: new Date(2026, 10, 15, 23, 59, 0).toISOString() }, // Domingo anterior -> fora
      { data: new Date(2026, 10, 16, 7, 0, 0).toISOString() }, // Segunda atual -> dentro
      { data: new Date(2026, 10, 18, 18, 0, 0).toISOString() }, // Quarta atual -> dentro
      { data: new Date(2026, 10, 22, 20, 0, 0).toISOString() }, // Domingo atual -> dentro
      { data: new Date(2026, 10, 23, 8, 0, 0).toISOString() }, // Próxima segunda -> fora
    ];

    expect(contarTreinosSemanaCorrente(treinos, quartaRef)).toBe(3);

    // 7 treinos na mesma semana continuam somando 7 (sem módulo % 6)
    const seteTreinos = Array.from({ length: 7 }, () => ({
      data: new Date(2026, 10, 18, 9, 0, 0).toISOString(),
    }));
    expect(contarTreinosSemanaCorrente(seteTreinos, quartaRef)).toBe(7);
  });
});

describe('controle diário de lembretes e baixa única de estoque (PROB-07)', () => {
  const lembrete: LembreteRemedio = {
    id: 'lemb-1',
    tipo: 'remedio',
    concluido: false,
    horario: '08:00',
    nomeRemedio: 'Losartana',
    frequencia: '1x ao dia',
  };

  const medicamentos: Medicamento[] = [
    {
      id: 'med-1',
      nome: 'Losartana',
      dosagem: '50mg',
      forma: 'Comprimido',
      estoque: '10',
      descontinuado: false,
    },
  ];

  it('impede baixa duplicada no mesmo dia e reseta status visual no dia seguinte', () => {
    // 1ª marcação em 2026-11-17 -> baixa para 9
    const r1 = calcularAlternanciaDoseNaData(lembrete, medicamentos, '2026-11-17');
    expect(r1.proximoStatus).toBe(true);
    expect(r1.dosesTomadasPorData).toEqual({ '2026-11-17': true });
    expect(r1.dosesBaixadasPorData).toEqual({ '2026-11-17': true });
    expect(r1.medicamentoAtualizado?.novoEstoque).toBe(9);

    const lembreteMarcado: LembreteRemedio = {
      ...lembrete,
      concluido: true,
      dosesTomadasPorData: r1.dosesTomadasPorData,
      dosesBaixadasPorData: r1.dosesBaixadasPorData,
    };

    // Em outro dia (2026-11-18), o alarme recorrente inicia desmarcado
    expect(isLembreteConcluidoNaData(lembreteMarcado, '2026-11-17')).toBe(true);
    expect(isLembreteConcluidoNaData(lembreteMarcado, '2026-11-18')).toBe(false);

    // Desmarcar e remarcar no mesmo dia não deve gerar segunda baixa
    const rDesmarcar = calcularAlternanciaDoseNaData(
      lembreteMarcado,
      [{ ...medicamentos[0], estoque: '9' }],
      '2026-11-17'
    );
    expect(rDesmarcar.proximoStatus).toBe(false);
    expect(rDesmarcar.medicamentoAtualizado).toBeUndefined();

    const lembreteDesmarcado: LembreteRemedio = {
      ...lembrete,
      concluido: false,
      dosesTomadasPorData: rDesmarcar.dosesTomadasPorData,
      dosesBaixadasPorData: rDesmarcar.dosesBaixadasPorData,
    };
    const rRemarcar = calcularAlternanciaDoseNaData(
      lembreteDesmarcado,
      [{ ...medicamentos[0], estoque: '9' }],
      '2026-11-17'
    );
    expect(rRemarcar.proximoStatus).toBe(true);
    expect(rRemarcar.medicamentoAtualizado).toBeUndefined();
  });

  it('valida faixa sistólica única e validade de medicamentos', () => {
    expect(VITALS_LIMITS.pressaoSistolica.healthyMin).toBe(100);
    expect(VITALS_LIMITS.pressaoSistolica.healthyMax).toBe(130);
    expect(avaliarValidadeMedicamento('01/2020', new Date(2026, 10, 17))).toBe('vencido');
    expect(avaliarValidadeMedicamento('12/2030', new Date(2026, 10, 17))).toBe('ok');
  });
});
