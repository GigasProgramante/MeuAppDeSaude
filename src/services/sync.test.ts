const mockMemoryStorage = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockMemoryStorage.get(key) ?? null),
    setItem: jest.fn(async (key: string, val: string) => {
      mockMemoryStorage.set(key, val);
    }),
    removeItem: jest.fn(async (key: string) => {
      mockMemoryStorage.delete(key);
    }),
    clear: jest.fn(async () => {
      mockMemoryStorage.clear();
    }),
  },
}));

let mockUuidCounter = 0;
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => {
    mockUuidCounter += 1;
    const suffix = String(mockUuidCounter).padStart(12, '0');
    return `550e8400-e29b-41d4-a716-${suffix}`;
  }),
  getRandomBytes: jest.fn(() => new Uint8Array(16).fill(1)),
}));

jest.mock('./supabase', () => ({
  isSupabaseConfigured: false,
  supabase: {
    auth: {
      getSession: jest.fn(async () => ({ data: { session: null } })),
    },
  },
}));

jest.mock('./db', () => ({
  buscarPerfil: jest.fn(),
  salvarPerfil: jest.fn(),
  listarLembretes: jest.fn(),
  upsertLembrete: jest.fn(),
  removerLembrete: jest.fn(),
  listarMedicamentos: jest.fn(),
  upsertMedicamento: jest.fn(),
  removerMedicamento: jest.fn(),
  listarSinaisVitais: jest.fn(),
  upsertSinalVital: jest.fn(),
  removerSinalVital: jest.fn(),
  listarHumor: jest.fn(),
  upsertHumor: jest.fn(),
  removerHumor: jest.fn(),
  listarAvaliacoesPsicologia: jest.fn(),
  upsertAvaliacaoPsicologia: jest.fn(),
  removerAvaliacaoPsicologia: jest.fn(),
  listarTreinos: jest.fn(),
  upsertTreino: jest.fn(),
  removerTreino: jest.fn(),
  listarHistoricoDor: jest.fn(),
  upsertRegistroDor: jest.fn(),
  removerRegistroDor: jest.fn(),
  listarHistoricoImc: jest.fn(),
  upsertPesoImc: jest.fn(),
  removerPesoImc: jest.fn(),
  buscarChecklistCuidados: jest.fn(),
  salvarChecklistCuidados: jest.fn(),
}));

import * as db from './db';
import { isUuidValido } from './mappers';
import {
  GUEST_CONTEXT_KEY,
  enqueueSyncOp,
  flushSyncQueue,
  getSyncQueue,
  hydrateCloudSnapshot,
} from './sync';
import { useStore } from '../store/useStore';

const mockedDb = db as jest.Mocked<typeof db>;

beforeEach(() => {
  mockMemoryStorage.clear();
  mockUuidCounter = 0;
  jest.clearAllMocks();
});

describe('fila offline e sincronização (sync.ts)', () => {
  const userId = '550e8400-e29b-41d4-a716-446655440099';

  it('coalesce operações repetidas para o mesmo registro e mantém fila offline sem config', async () => {
    await enqueueSyncOp(userId, {
      entity: 'medicamento',
      action: 'upsert',
      recordId: 'med-1',
      payload: { id: 'med-1', nome: 'Dipirona v1' },
    });
    await enqueueSyncOp(userId, {
      entity: 'medicamento',
      action: 'upsert',
      recordId: 'med-1',
      payload: { id: 'med-1', nome: 'Dipirona v2' },
    });

    const queue = await getSyncQueue(userId);
    expect(queue).toHaveLength(1);
    expect((queue[0].payload as { nome: string }).nome).toBe('Dipirona v2');

    const res = await flushSyncQueue(userId, { forceConfigured: false });
    expect(res).toEqual({ flushed: 0, remaining: 1 });
    expect(mockedDb.upsertMedicamento).not.toHaveBeenCalled();
  });

  it('envia fila quando online e preserva itens que falham por erro de rede', async () => {
    await enqueueSyncOp(userId, {
      entity: 'treino',
      action: 'upsert',
      recordId: 't-1',
      payload: { id: 't-1', descricao: 'Caminhada', data: '2026-11-17T10:00:00.000Z' },
    });
    await enqueueSyncOp(userId, {
      entity: 'registroDor',
      action: 'delete',
      recordId: 'd-1',
    });

    mockedDb.upsertTreino.mockResolvedValueOnce('t-1');
    mockedDb.removerRegistroDor.mockRejectedValueOnce(new Error('offline'));

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const res = await flushSyncQueue(userId, { forceConfigured: true });
    warnSpy.mockRestore();

    expect(res).toEqual({ flushed: 1, remaining: 1 });
    const remaining = await getSyncQueue(userId);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].entity).toBe('registroDor');
  });

  it('hidrata nuvem mantendo resiliência se uma tabela falhar', async () => {
    mockedDb.buscarPerfil.mockResolvedValue({ nome: 'Ana', fotoUri: null, telefone: '47' });
    mockedDb.listarLembretes.mockRejectedValue(new Error('timeout'));
    mockedDb.listarMedicamentos.mockResolvedValue([]);
    mockedDb.listarSinaisVitais.mockResolvedValue([]);
    mockedDb.listarHumor.mockResolvedValue([]);
    mockedDb.listarAvaliacoesPsicologia.mockResolvedValue([]);
    mockedDb.listarTreinos.mockResolvedValue([]);
    mockedDb.listarHistoricoDor.mockResolvedValue([]);
    mockedDb.listarHistoricoImc.mockResolvedValue([]);
    mockedDb.buscarChecklistCuidados.mockResolvedValue(null);

    const partial = await hydrateCloudSnapshot(userId, { forceConfigured: true });
    expect(partial.perfil?.nome).toBe('Ana');
    expect(partial.lembretes).toBeUndefined();
    expect(partial.medicamentos).toEqual([]);
  });
});

describe('isolamento de contexto e UUIDs no useStore', () => {
  it('gera UUID válido e isola totalmente dados entre visitante e contas autenticadas', async () => {
    await useStore.getState().hydrateStore();
    await useStore.getState().switchContext(GUEST_CONTEXT_KEY);

    const idGuest = useStore.getState().addRegistroDor({ nivel: 3, regiao: 'Joelho', tipo: 'Articular' });
    expect(isUuidValido(idGuest)).toBe(true);
    expect(useStore.getState().historicoDor).toHaveLength(1);

    // Troca para usuário A — não deve herdar dados do visitante
    await useStore.getState().switchContext('user-a-uuid');
    expect(useStore.getState().historicoDor).toHaveLength(0);
    useStore.getState().addRegistroDor({ nivel: 8, regiao: 'Coluna Lombar', tipo: 'Pontada' });
    expect(useStore.getState().historicoDor).toHaveLength(1);

    // Volta para visitante — dados do visitante permanecem preservados sem dados de A
    await useStore.getState().switchContext(GUEST_CONTEXT_KEY);
    expect(useStore.getState().historicoDor).toHaveLength(1);
    expect(useStore.getState().historicoDor[0].nivel).toBe(3);

    // Apaga contexto de usuário A
    await useStore.getState().wipeContext('user-a-uuid');
    await useStore.getState().switchContext('user-a-uuid');
    expect(useStore.getState().historicoDor).toHaveLength(0);
  });
});
