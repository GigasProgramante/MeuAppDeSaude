import {
  avaliacaoPsicologiaDoDb,
  avaliacaoPsicologiaParaDb,
  checklistDoDb,
  checklistParaDb,
  formatNumeroParaUi,
  humorDoDb,
  humorParaDb,
  isUuidValido,
  lembreteDoDb,
  lembreteParaDb,
  parseInteiro,
  parseNumeroPtBr,
  perfilDoDb,
  perfilParaDb,
  pesoImcDoDb,
  pesoImcParaDb,
  registroDorDoDb,
  registroDorParaDb,
  sinalVitalDoDb,
  sinalVitalParaDb,
  toIsoDate,
  treinoDoDb,
  treinoParaDb,
} from './mappers';

describe('conversores numéricos e de data (mappers)', () => {
  it('converte strings pt-BR e en-US para number e trata inválidos', () => {
    expect(parseNumeroPtBr('70,5')).toBe(70.5);
    expect(parseNumeroPtBr('70.5')).toBe(70.5);
    expect(parseNumeroPtBr(82.3)).toBe(82.3);
    expect(parseNumeroPtBr('')).toBeNull();
    expect(parseNumeroPtBr('abc')).toBeNull();
    expect(parseNumeroPtBr(null)).toBeNull();
  });

  it('converte idade e campos inteiros arredondando corretamente', () => {
    expect(parseInteiro('68')).toBe(68);
    expect(parseInteiro('68,4')).toBe(68);
    expect(parseInteiro('')).toBeNull();
  });

  it('formata números do banco de volta para string segura na UI', () => {
    expect(formatNumeroParaUi(70.5)).toBe('70.5');
    expect(formatNumeroParaUi('70,5')).toBe('70,5');
    expect(formatNumeroParaUi(null)).toBe('');
    expect(formatNumeroParaUi(undefined)).toBe('');
  });

  it('normaliza datas ISO e valida UUIDs v4', () => {
    expect(toIsoDate('2026-11-17T12:00:00.000Z')).toBe('2026-11-17T12:00:00.000Z');
    expect(isUuidValido('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isUuidValido('123-legado')).toBe(false);
  });
});

describe('mapeamento bidirecional UI <-> Banco (Supabase)', () => {
  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const itemUuid = '550e8400-e29b-41d4-a716-446655440111';

  it('mapeia perfil preservando atualização parcial e convertendo números para string na volta', () => {
    const partialDb = perfilParaDb(userId, { nome: 'Maria', peso: '70,5', idade: '64' });
    expect(partialDb.nome).toBe('Maria');
    expect(partialDb.peso).toBe(70.5);
    expect(partialDb.idade).toBe(64);
    expect(partialDb.altura).toBeUndefined();

    const ui = perfilDoDb({
      id: userId,
      nome: 'Maria',
      telefone: '47999990000',
      idade: 64,
      peso: 70.5,
      altura: 162,
      imc: 26.9,
      comorbidades: ['Hipertensão'],
      termos_aceitos_em: '2026-11-17T10:00:00.000Z',
    });

    expect(ui).toEqual(
      expect.objectContaining({
        nome: 'Maria',
        idade: '64',
        peso: '70.5',
        altura: '162',
        imc: 26.9,
        comorbidades: ['Hipertensão'],
        termosAceitosEm: '2026-11-17T10:00:00.000Z',
      })
    );
  });

  it('mapeia lembrete com periodicidade, diasSemana, notificationIds e dosesTomadasPorData', () => {
    const dbRow = lembreteParaDb(userId, {
      id: itemUuid,
      tipo: 'remedio',
      concluido: false,
      horario: '08:00',
      nomeRemedio: 'Losartana',
      frequencia: '1x ao dia',
      periodicidade: 'dias_especificos',
      diasSemana: [2, 4, 6],
      notificationIds: ['n1', 'n2'],
      dosesTomadasPorData: { '2026-11-17': true },
    });

    expect(dbRow.id).toBe(itemUuid);
    expect(dbRow.periodicidade).toBe('dias_especificos');
    expect(dbRow.dias_semana).toEqual([2, 4, 6]);
    expect(dbRow.notification_ids).toEqual(['n1', 'n2']);
    expect(dbRow.doses_tomadas_por_data).toEqual({
      tomadas: { '2026-11-17': true },
      baixas: {},
    });

    const roundTrip = lembreteDoDb(dbRow);
    expect(roundTrip).toEqual(
      expect.objectContaining({
        id: itemUuid,
        tipo: 'remedio',
        nomeRemedio: 'Losartana',
        periodicidade: 'dias_especificos',
        diasSemana: [2, 4, 6],
        notificationIds: ['n1', 'n2'],
        dosesTomadasPorData: { '2026-11-17': true },
      })
    );

    const legacyFlat = lembreteDoDb({
      ...dbRow,
      doses_tomadas_por_data: { '2026-11-16': true },
    });
    expect(legacyFlat.dosesTomadasPorData).toEqual({ '2026-11-16': true });
  });

  it('mapeia sinais vitais, humor, avaliações, treinos, dor, IMC e checklist', () => {
    const sinal = sinalVitalDoDb(
      sinalVitalParaDb(userId, {
        id: itemUuid,
        bpm: '75',
        glicose: '95',
        glicoseTipo: 'Jejum',
        pressao: '120/80',
        oxigenacao: '98',
        temperatura: '36.5',
        data: '2026-11-17T08:00:00.000Z',
      })
    );
    expect(sinal.pressao).toBe('120/80');

    const humor = humorDoDb(
      humorParaDb(userId, {
        id: itemUuid,
        moodId: 'feliz',
        activity: 'Família',
        horasSono: '7 a 8h',
        qualidadeSono: 'Boa',
        anotacao: 'Dia tranquilo',
        data: '2026-11-17T08:00:00.000Z',
      })
    );
    expect(humor.horasSono).toBe('7 a 8h');

    const aval = avaliacaoPsicologiaDoDb(
      avaliacaoPsicologiaParaDb(userId, {
        id: itemUuid,
        tipo: 'GAD-7',
        pontuacao: 6,
        maxPontuacao: 21,
        classificacao: 'Ansiedade Leve',
        orientacao: 'Observar',
        alertaCritico: false,
        data: '2026-11-17T08:00:00.000Z',
      })
    );
    expect(aval.tipo).toBe('GAD-7');
    expect(aval.pontuacao).toBe(6);

    const treino = treinoDoDb(
      treinoParaDb(userId, {
        id: itemUuid,
        descricao: 'Caminhada',
        duracaoMinutos: 30,
        intensidade: 'Moderado',
        caloriasEstimadas: 190,
        data: '2026-11-17T08:00:00.000Z',
      })
    );
    expect(treino.caloriasEstimadas).toBe(190);

    const dor = registroDorDoDb(
      registroDorParaDb(userId, {
        id: itemUuid,
        nivel: 4,
        regiao: 'Joelho',
        tipo: 'Articular',
        data: '2026-11-17T08:00:00.000Z',
      })
    );
    expect(dor.nivel).toBe(4);
    expect(dor.regiao).toBe('Joelho');

    const imcReg = pesoImcDoDb(
      pesoImcParaDb(userId, {
        id: itemUuid,
        peso: 70.5,
        imc: 24.4,
        data: '2026-11-17T08:00:00.000Z',
      })
    );
    expect(imcReg.peso).toBe(70.5);

    const check = checklistDoDb(
      checklistParaDb(userId, {
        data: '2026-11-17',
        itensConcluidos: ['higiene_bucal', 'hidratacao'],
      })
    );
    expect(check).toEqual({
      data: '2026-11-17',
      itensConcluidos: ['higiene_bucal', 'hidratacao'],
    });
  });
});
