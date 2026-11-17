jest.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));
jest.mock('expo-print', () => ({
  printAsync: jest.fn(),
  printToFileAsync: jest.fn(),
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

import { gerarHtmlProntuario } from './prontuarioPdf';

describe('prontuarioPdf', () => {
  it('inclui perfil, alergias em destaque, medicamentos, sinais vitais, dor e PHQ-9/GAD-7 com escape HTML', () => {
    const html = gerarHtmlProntuario({
      perfil: {
        nome: 'Maria <Teste>',
        fotoUri: null,
        telefone: '(47) 99999-0000',
        idade: '64',
        peso: '70',
        altura: '1.65',
        sexo: 'Feminino',
        comorbidades: ['Hipertensão', 'Diabetes'],
        alergias: 'Dipirona & Látex',
      },
      medicamentos: [
        {
          id: 'm1',
          nome: 'Losartana',
          dosagem: '50mg',
          forma: 'Comprimido',
          estoque: '20',
          validade: '10/2027',
          prescritor: 'Dr. Silva',
        },
      ],
      sinaisVitais: [
        {
          id: 's1',
          data: '2026-11-17T10:00:00.000Z',
          pressao: '128/82',
          bpm: '72',
          glicose: '105',
          glicoseTipo: 'Jejum',
          contexto: 'Em repouso (5 min)',
        },
      ],
      vacinas: [
        {
          id: 'v1',
          nome: 'Influenza (Gripe)',
          dataAplicacao: '10/05/2026',
          proximaDose: '10/05/2027',
        },
      ],
      humorHistorico: [
        { id: 'h1', data: '2026-11-17T08:00:00.000Z', moodId: 'feliz' },
      ],
      avaliacoesPsicologia: [
        {
          id: 'a1',
          data: '2026-11-16T09:00:00.000Z',
          tipo: 'PHQ-9',
          pontuacao: 4,
          maxPontuacao: 27,
          classificacao: 'Mínima / Sem sintomas relevantes',
          orientacao: 'Acompanhamento de rotina.',
        },
        {
          id: 'a2',
          data: '2026-11-16T09:10:00.000Z',
          tipo: 'GAD-7',
          pontuacao: 7,
          maxPontuacao: 21,
          classificacao: 'Ansiedade leve',
          orientacao: 'Práticas de relaxamento.',
        },
      ],
      historicoDor: [
        {
          id: 'd1',
          data: '2026-11-17T11:00:00.000Z',
          nivel: 5,
          regiao: 'Coluna Lombar',
          tipo: 'Muscular',
        },
      ],
      geradoEm: new Date(2026, 10, 17, 14, 30),
    });

    expect(html).toContain('Maria &lt;Teste&gt;');
    expect(html).toContain('ATENÇÃO — ALERGIAS REGISTRADAS:');
    expect(html).toContain('Dipirona &amp; Látex');
    expect(html).toContain('Hipertensão');
    expect(html).toContain('Losartana');
    expect(html).toContain('128/82 mmHg');
    expect(html).toContain('Dor nível 5/10');
    expect(html).toContain('Coluna Lombar');
    expect(html).toContain('PHQ-9');
    expect(html).toContain('4/27 pts');
    expect(html).toContain('GAD-7');
    expect(html).toContain('7/21 pts');
    expect(html).toContain('Feliz');
    expect(html).toContain('Em repouso (5 min)');
    expect(html).toContain('Influenza (Gripe)');
  });

  it('funciona com dados vazios sem quebrar', () => {
    const html = gerarHtmlProntuario({
      perfil: null,
      medicamentos: [],
      sinaisVitais: [],
      humorHistorico: [],
      avaliacoesPsicologia: [],
      historicoDor: [],
    });

    expect(html).toContain('Nenhuma alergia informada');
    expect(html).toContain('Nenhum medicamento cadastrado');
    expect(html).toContain('Nenhum sinal vital registrado');
    expect(html).toContain('Nenhuma avaliação realizada');
  });
});
