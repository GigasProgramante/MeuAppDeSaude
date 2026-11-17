import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { create } from 'zustand';
import {
  AvaliacaoPsicologica,
  ChecklistCuidadoDiario,
  HumorRegistro,
  Lembrete,
  LembreteInput,
  LembretePatch,
  Medicamento,
  PerfilUsuario,
  PesoImcRegistro,
  RegistroDor,
  SinalVital,
  Treino,
  VacinaRegistro,
} from '../types';
import { isUuidValido } from '../services/mappers';
import {
  ACTIVE_CONTEXT_STORAGE_KEY,
  EMPTY_SNAPSHOT,
  GUEST_CONTEXT_KEY,
  LEGACY_STORAGE_KEY,
  SnapshotClinico,
  clearSyncQueue,
  enqueueAndSync,
  flushSyncQueue,
  getContextStorageKey,
  getSyncQueue,
  hydrateCloudSnapshot,
} from '../services/sync';

export const gerarIdUuid = (): string => {
  try {
    if (typeof Crypto.randomUUID === 'function') {
      return Crypto.randomUUID();
    }
  } catch {
    // Fallback para ambientes HTTP não-seguros sem crypto.randomUUID
  }
  const bytes = Crypto.getRandomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

function extrairSnapshot(state: SnapshotClinico): SnapshotClinico {
  return {
    perfil: state.perfil,
    lembretes: state.lembretes,
    sinaisVitais: state.sinaisVitais,
    humorHistorico: state.humorHistorico,
    avaliacoesPsicologia: state.avaliacoesPsicologia,
    medicamentos: state.medicamentos,
    checklistCuidados: state.checklistCuidados,
    treinos: state.treinos,
    historicoDor: state.historicoDor,
    historicoImc: state.historicoImc,
    vacinas: state.vacinas,
  };
}

function normalizarIdsSnapshot(raw: Partial<SnapshotClinico> | null | undefined): SnapshotClinico {
  const safe = raw || {};
  const ensureUuid = <T extends { id: string }>(arr?: T[]): T[] =>
    Array.isArray(arr)
      ? arr.map((item) => (isUuidValido(item.id) ? item : { ...item, id: gerarIdUuid() }))
      : [];

  return {
    perfil: safe.perfil ?? null,
    lembretes: ensureUuid(safe.lembretes),
    sinaisVitais: ensureUuid(safe.sinaisVitais),
    humorHistorico: ensureUuid(safe.humorHistorico),
    avaliacoesPsicologia: ensureUuid(safe.avaliacoesPsicologia),
    medicamentos: ensureUuid(safe.medicamentos),
    checklistCuidados: safe.checklistCuidados ?? null,
    treinos: ensureUuid(safe.treinos),
    historicoDor: ensureUuid(safe.historicoDor),
    historicoImc: ensureUuid(safe.historicoImc),
    vacinas: ensureUuid(safe.vacinas),
  };
}

async function salvarSnapshotNoStorage(contextKey: string, snapshot: SnapshotClinico): Promise<void> {
  try {
    await AsyncStorage.setItem(getContextStorageKey(contextKey), JSON.stringify(snapshot));
  } catch (err) {
    console.warn('Falha ao persistir estado local:', err);
  }
}

async function carregarSnapshotDoStorage(contextKey: string): Promise<SnapshotClinico> {
  try {
    const raw = await AsyncStorage.getItem(getContextStorageKey(contextKey));
    if (!raw) return { ...EMPTY_SNAPSHOT };
    const parsed = JSON.parse(raw) as Partial<SnapshotClinico>;
    return normalizarIdsSnapshot(parsed);
  } catch (err) {
    console.warn('Falha ao ler estado local do contexto:', err);
    return { ...EMPTY_SNAPSHOT };
  }
}

export interface EstadoGlobal extends SnapshotClinico {
  activeContextKey: string;
  isHydrated: boolean;

  hydrateStore: () => Promise<void>;
  switchContext: (nextContextKey: string) => Promise<void>;
  syncWithCloud: (userId: string) => Promise<void>;
  wipeContext: (contextKey: string) => Promise<void>;

  lembretes: Lembrete[];
  addLembrete: (lembrete: LembreteInput) => string;
  updateLembrete: (id: string, dados: LembretePatch) => void;
  removeLembrete: (id: string) => void;
  setLembretes: (lembretes: Lembrete[]) => void;

  sinaisVitais: SinalVital[];
  addSinalVital: (sinal: Omit<SinalVital, 'id' | 'data'>) => string;
  updateSinalVital: (id: string, dados: Partial<Omit<SinalVital, 'id'>>) => void;
  removeSinalVital: (id: string) => void;

  humorHistorico: HumorRegistro[];
  addHumor: (humor: Omit<HumorRegistro, 'id' | 'data'>) => string;

  avaliacoesPsicologia: AvaliacaoPsicologica[];
  addAvaliacaoPsicologia: (avaliacao: Omit<AvaliacaoPsicologica, 'id' | 'data'>) => string;

  medicamentos: Medicamento[];
  addMedicamento: (med: Omit<Medicamento, 'id'>) => string;
  updateMedicamento: (id: string, dados: Partial<Omit<Medicamento, 'id'>>) => void;
  removeMedicamento: (id: string) => void;
  setMedicamentos: (medicamentos: Medicamento[]) => void;

  checklistCuidados: ChecklistCuidadoDiario | null;
  setChecklistCuidados: (checklist: ChecklistCuidadoDiario) => void;

  treinos: Treino[];
  addTreino: (treino: Omit<Treino, 'id' | 'data'>) => string;

  historicoDor: RegistroDor[];
  addRegistroDor: (dor: Omit<RegistroDor, 'id' | 'data'>) => string;

  historicoImc: PesoImcRegistro[];
  addRegistroPesoImc: (registro: Omit<PesoImcRegistro, 'id' | 'data'>) => string;

  vacinas: VacinaRegistro[];
  addVacina: (vacina: Omit<VacinaRegistro, 'id'>) => string;
  removeVacina: (id: string) => void;

  perfil: PerfilUsuario | null;
  updatePerfil: (perfil: Partial<PerfilUsuario>) => void;
  setCoposAguaNaData: (dataChave: string, copos: number) => void;
  logout: () => Promise<void>;
}

let hydrationPromise: Promise<void> | null = null;

export const useStore = create<EstadoGlobal>()((set, get) => {
  const persistirAtual = () => {
    const state = get();
    void salvarSnapshotNoStorage(state.activeContextKey, extrairSnapshot(state));
  };

  const dispararSync = (
    entity: Parameters<typeof enqueueAndSync>[1]['entity'],
    action: 'upsert' | 'delete',
    recordId: string,
    payload?: unknown
  ) => {
    const ctx = get().activeContextKey;
    if (!ctx || ctx === GUEST_CONTEXT_KEY) return;
    void enqueueAndSync(ctx, { entity, action, recordId, payload });
  };

  return {
    activeContextKey: GUEST_CONTEXT_KEY,
    isHydrated: false,
    ...EMPTY_SNAPSHOT,

    hydrateStore: () => {
      if (hydrationPromise) return hydrationPromise;

      hydrationPromise = (async () => {
        try {
          const savedContext =
            (await AsyncStorage.getItem(ACTIVE_CONTEXT_STORAGE_KEY)) || GUEST_CONTEXT_KEY;

          // Migração única da chave legada global para o contexto visitante
          const legacyRaw = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
          if (legacyRaw) {
            const guestKey = getContextStorageKey(GUEST_CONTEXT_KEY);
            const guestExists = await AsyncStorage.getItem(guestKey);
            if (!guestExists) {
              try {
                const legacyParsed = JSON.parse(legacyRaw);
                const legacyState = (legacyParsed?.state || legacyParsed) as Partial<SnapshotClinico>;
                const migrated = normalizarIdsSnapshot(legacyState);
                await AsyncStorage.setItem(guestKey, JSON.stringify(migrated));
              } catch {
                // Ignora payload legado corrompido
              }
            }
            await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
          }

          const snapshot = await carregarSnapshotDoStorage(savedContext);
          set({
            ...snapshot,
            activeContextKey: savedContext,
            isHydrated: true,
          });
        } catch (err) {
          console.warn('Erro na hidratação inicial do store:', err);
          set({ isHydrated: true });
        }
      })();

      return hydrationPromise;
    },

    switchContext: async (nextContextKey: string) => {
      await get().hydrateStore();
      const target = nextContextKey || GUEST_CONTEXT_KEY;
      const current = get().activeContextKey;
      if (current === target) return;

      await salvarSnapshotNoStorage(current, extrairSnapshot(get()));
      const nextSnapshot = await carregarSnapshotDoStorage(target);
      await AsyncStorage.setItem(ACTIVE_CONTEXT_STORAGE_KEY, target);

      set({
        ...nextSnapshot,
        activeContextKey: target,
        isHydrated: true,
      });
    },

    syncWithCloud: async (userId: string) => {
      if (!userId || userId === GUEST_CONTEXT_KEY) return;
      await get().switchContext(userId);
      const cloudPartial = await hydrateCloudSnapshot(userId);
      if (get().activeContextKey !== userId) return;

      const pendingQueue = await getSyncQueue(userId);
      const pendingByEntity = new Map<string, Set<string>>();
      for (const op of pendingQueue) {
        if (!pendingByEntity.has(op.entity)) pendingByEntity.set(op.entity, new Set());
        pendingByEntity.get(op.entity)!.add(op.recordId);
      }

      const mergeArray = <T extends { id: string }>(
        localList: T[],
        cloudList: T[] | undefined,
        entity: string
      ): T[] => {
        if (!cloudList) return localList;
        const pendingIds = pendingByEntity.get(entity);
        if (!pendingIds || pendingIds.size === 0) return cloudList;
        const map = new Map<string, T>();
        for (const item of cloudList) map.set(item.id, item);
        for (const item of localList) {
          if (pendingIds.has(item.id)) map.set(item.id, item);
        }
        return Array.from(map.values());
      };

      set((state) => ({
        perfil:
          pendingByEntity.has('perfil') && state.perfil
            ? state.perfil
            : (cloudPartial.perfil ?? state.perfil),
        lembretes: mergeArray(state.lembretes, cloudPartial.lembretes, 'lembrete'),
        medicamentos: mergeArray(state.medicamentos, cloudPartial.medicamentos, 'medicamento'),
        sinaisVitais: mergeArray(state.sinaisVitais, cloudPartial.sinaisVitais, 'sinalVital'),
        humorHistorico: mergeArray(state.humorHistorico, cloudPartial.humorHistorico, 'humor'),
        avaliacoesPsicologia: mergeArray(
          state.avaliacoesPsicologia,
          cloudPartial.avaliacoesPsicologia,
          'avaliacaoPsicologia'
        ),
        treinos: mergeArray(state.treinos, cloudPartial.treinos, 'treino'),
        historicoDor: mergeArray(state.historicoDor, cloudPartial.historicoDor, 'registroDor'),
        historicoImc: mergeArray(state.historicoImc, cloudPartial.historicoImc, 'pesoImc'),
        checklistCuidados:
          pendingByEntity.has('checklist') && state.checklistCuidados
            ? state.checklistCuidados
            : (cloudPartial.checklistCuidados ?? state.checklistCuidados),
        vacinas: mergeArray(state.vacinas, cloudPartial.vacinas, 'vacina'),
      }));

      persistirAtual();
      void flushSyncQueue(userId);
    },

    wipeContext: async (contextKey: string) => {
      const target = contextKey || GUEST_CONTEXT_KEY;
      await AsyncStorage.removeItem(getContextStorageKey(target));
      await clearSyncQueue(target);

      if (get().activeContextKey === target) {
        await AsyncStorage.setItem(ACTIVE_CONTEXT_STORAGE_KEY, GUEST_CONTEXT_KEY);
        const guestSnapshot =
          target === GUEST_CONTEXT_KEY
            ? { ...EMPTY_SNAPSHOT }
            : await carregarSnapshotDoStorage(GUEST_CONTEXT_KEY);

        set({
          ...guestSnapshot,
          activeContextKey: GUEST_CONTEXT_KEY,
          isHydrated: true,
        });
      }
    },

    updatePerfil: (novosDados) => {
      set((state) => {
        const nextPerfil: PerfilUsuario = state.perfil
          ? { ...state.perfil, ...novosDados }
          : ({ nome: '', fotoUri: null, telefone: '', ...novosDados } as PerfilUsuario);
        return { perfil: nextPerfil };
      });
      persistirAtual();
      const updated = get().perfil;
      if (updated) {
        dispararSync('perfil', 'upsert', get().activeContextKey, updated);
      }
    },

    setCoposAguaNaData: (dataChave, copos) => {
      const safeCopos = Math.max(0, Math.round(copos));
      set((state) => {
        const base: PerfilUsuario = state.perfil
          ? { ...state.perfil }
          : { nome: '', fotoUri: null, telefone: '' };
        const nextAgua = { ...(base.aguaPorData || {}), [dataChave]: safeCopos };
        return { perfil: { ...base, aguaPorData: nextAgua } };
      });
      persistirAtual();
      const updated = get().perfil;
      if (updated) {
        dispararSync('perfil', 'upsert', get().activeContextKey, updated);
      }
    },

    logout: async () => {
      const current = get().activeContextKey;
      if (current === GUEST_CONTEXT_KEY) {
        set({ ...EMPTY_SNAPSHOT });
        await AsyncStorage.removeItem(getContextStorageKey(GUEST_CONTEXT_KEY));
        return;
      }
      await get().switchContext(GUEST_CONTEXT_KEY);
    },

    addLembrete: (lembrete) => {
      const novo = { ...lembrete, id: gerarIdUuid() } as Lembrete;
      set((state) => ({
        lembretes: [...(state.lembretes || []), novo],
      }));
      persistirAtual();
      dispararSync('lembrete', 'upsert', novo.id, novo);
      return novo.id;
    },

    updateLembrete: (id, dados) => {
      let updatedItem: Lembrete | undefined;
      set((state) => ({
        lembretes: (state.lembretes || []).map((item) => {
          if (item.id === id) {
            updatedItem = { ...item, ...dados } as Lembrete;
            return updatedItem;
          }
          return item;
        }),
      }));
      persistirAtual();
      if (updatedItem) {
        dispararSync('lembrete', 'upsert', id, updatedItem);
      }
    },

    removeLembrete: (id) => {
      set((state) => ({
        lembretes: (state.lembretes || []).filter((l) => l.id !== id),
      }));
      persistirAtual();
      dispararSync('lembrete', 'delete', id);
    },

    setLembretes: (lembretes) => {
      const normalizados = lembretes.map((l) =>
        isUuidValido(l.id) ? l : ({ ...l, id: gerarIdUuid() } as Lembrete)
      );
      set({ lembretes: normalizados });
      persistirAtual();
      for (const l of normalizados) {
        dispararSync('lembrete', 'upsert', l.id, l);
      }
    },

    addSinalVital: (sinal) => {
      const novo: SinalVital = { ...sinal, id: gerarIdUuid(), data: new Date().toISOString() };
      set((state) => ({
        sinaisVitais: [...(state.sinaisVitais || []), novo],
      }));
      persistirAtual();
      dispararSync('sinalVital', 'upsert', novo.id, novo);
      return novo.id;
    },

    updateSinalVital: (id, dados) => {
      let updatedItem: SinalVital | undefined;
      set((state) => ({
        sinaisVitais: (state.sinaisVitais || []).map((item) => {
          if (item.id === id) {
            updatedItem = { ...item, ...dados };
            return updatedItem;
          }
          return item;
        }),
      }));
      persistirAtual();
      if (updatedItem) {
        dispararSync('sinalVital', 'upsert', id, updatedItem);
      }
    },

    removeSinalVital: (id) => {
      set((state) => ({
        sinaisVitais: (state.sinaisVitais || []).filter((item) => item.id !== id),
      }));
      persistirAtual();
      dispararSync('sinalVital', 'delete', id);
    },

    addHumor: (humor) => {
      const novo: HumorRegistro = { ...humor, id: gerarIdUuid(), data: new Date().toISOString() };
      set((state) => ({
        humorHistorico: [...(state.humorHistorico || []), novo],
      }));
      persistirAtual();
      dispararSync('humor', 'upsert', novo.id, novo);
      return novo.id;
    },

    addAvaliacaoPsicologia: (avaliacao) => {
      const novo: AvaliacaoPsicologica = {
        ...avaliacao,
        id: gerarIdUuid(),
        data: new Date().toISOString(),
      };
      set((state) => ({
        avaliacoesPsicologia: [...(state.avaliacoesPsicologia || []), novo],
      }));
      persistirAtual();
      dispararSync('avaliacaoPsicologia', 'upsert', novo.id, novo);
      return novo.id;
    },

    addMedicamento: (med) => {
      const novo: Medicamento = { ...med, id: gerarIdUuid() };
      set((state) => ({
        medicamentos: [...(state.medicamentos || []), novo],
      }));
      persistirAtual();
      dispararSync('medicamento', 'upsert', novo.id, novo);
      return novo.id;
    },

    updateMedicamento: (id, dados) => {
      let updatedItem: Medicamento | undefined;
      set((state) => ({
        medicamentos: (state.medicamentos || []).map((item) => {
          if (item.id === id) {
            updatedItem = { ...item, ...dados };
            return updatedItem;
          }
          return item;
        }),
      }));
      persistirAtual();
      if (updatedItem) {
        dispararSync('medicamento', 'upsert', id, updatedItem);
      }
    },

    removeMedicamento: (id) => {
      set((state) => ({
        medicamentos: (state.medicamentos || []).filter((item) => item.id !== id),
      }));
      persistirAtual();
      dispararSync('medicamento', 'delete', id);
    },

    setMedicamentos: (medicamentos) => {
      const normalizados = medicamentos.map((m) =>
        isUuidValido(m.id) ? m : { ...m, id: gerarIdUuid() }
      );
      set({ medicamentos: normalizados });
      persistirAtual();
      for (const m of normalizados) {
        dispararSync('medicamento', 'upsert', m.id, m);
      }
    },

    setChecklistCuidados: (checklist) => {
      set({ checklistCuidados: checklist });
      persistirAtual();
      dispararSync('checklist', 'upsert', checklist.data, checklist);
    },

    addTreino: (treino) => {
      const novo: Treino = { ...treino, id: gerarIdUuid(), data: new Date().toISOString() };
      set((state) => ({
        treinos: [...(state.treinos || []), novo],
      }));
      persistirAtual();
      dispararSync('treino', 'upsert', novo.id, novo);
      return novo.id;
    },

    addRegistroDor: (dor) => {
      const novo: RegistroDor = { ...dor, id: gerarIdUuid(), data: new Date().toISOString() };
      set((state) => ({
        historicoDor: [...(state.historicoDor || []), novo],
      }));
      persistirAtual();
      dispararSync('registroDor', 'upsert', novo.id, novo);
      return novo.id;
    },

    addRegistroPesoImc: (registro) => {
      const novo: PesoImcRegistro = {
        ...registro,
        id: gerarIdUuid(),
        data: new Date().toISOString(),
      };
      set((state) => ({
        historicoImc: [...(state.historicoImc || []), novo],
      }));
      persistirAtual();
      dispararSync('pesoImc', 'upsert', novo.id, novo);
      return novo.id;
    },

    addVacina: (vacina) => {
      const novo: VacinaRegistro = { ...vacina, id: gerarIdUuid() };
      set((state) => ({
        vacinas: [...(state.vacinas || []), novo],
      }));
      persistirAtual();
      dispararSync('vacina', 'upsert', novo.id, novo);
      return novo.id;
    },

    removeVacina: (id) => {
      set((state) => ({
        vacinas: (state.vacinas || []).filter((item) => item.id !== id),
      }));
      persistirAtual();
      dispararSync('vacina', 'delete', id);
    },
  };
});

// Inicializa hidratação automática fora de ambiente de testes unitários sem interferir no Jest
if (typeof process === 'undefined' || !process.env?.JEST_WORKER_ID) {
  void useStore.getState().hydrateStore();
}
