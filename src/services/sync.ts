import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AvaliacaoPsicologica,
  ChecklistCuidadoDiario,
  HumorRegistro,
  Lembrete,
  Medicamento,
  PerfilUsuario,
  PesoImcRegistro,
  RegistroDor,
  SinalVital,
  Treino,
} from '../types';
import * as db from './db';
import { isSupabaseConfigured, supabase } from './supabase';

export type SyncEntity =
  | 'perfil'
  | 'lembrete'
  | 'medicamento'
  | 'sinalVital'
  | 'humor'
  | 'avaliacaoPsicologia'
  | 'treino'
  | 'registroDor'
  | 'pesoImc'
  | 'checklist';

export type SyncAction = 'upsert' | 'delete';

export interface SyncQueueItem {
  entity: SyncEntity;
  action: SyncAction;
  recordId: string;
  payload?: unknown;
  updatedAt: string;
}

export interface SnapshotClinico {
  perfil: PerfilUsuario | null;
  lembretes: Lembrete[];
  sinaisVitais: SinalVital[];
  humorHistorico: HumorRegistro[];
  avaliacoesPsicologia: AvaliacaoPsicologica[];
  medicamentos: Medicamento[];
  checklistCuidados: ChecklistCuidadoDiario | null;
  treinos: Treino[];
  historicoDor: RegistroDor[];
  historicoImc: PesoImcRegistro[];
}

export const EMPTY_SNAPSHOT: SnapshotClinico = {
  perfil: null,
  lembretes: [],
  sinaisVitais: [],
  humorHistorico: [],
  avaliacoesPsicologia: [],
  medicamentos: [],
  checklistCuidados: null,
  treinos: [],
  historicoDor: [],
  historicoImc: [],
};

export const GUEST_CONTEXT_KEY = 'guest';
export const ACTIVE_CONTEXT_STORAGE_KEY = 'meu-app-saude:active-context';
export const LEGACY_STORAGE_KEY = 'meu-app-saude-storage';

export const getContextStorageKey = (contextKey: string): string =>
  `meu-app-saude:ctx:${contextKey || GUEST_CONTEXT_KEY}`;

export const getQueueStorageKey = (userId: string): string =>
  `meu-app-saude:sync-queue:${userId}`;

export const getHojeLocalKey = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export async function getSyncQueue(userId: string): Promise<SyncQueueItem[]> {
  if (!userId || userId === GUEST_CONTEXT_KEY) return [];
  try {
    const raw = await AsyncStorage.getItem(getQueueStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SyncQueueItem[]) : [];
  } catch {
    return [];
  }
}

async function saveSyncQueue(userId: string, queue: SyncQueueItem[]): Promise<void> {
  if (!userId || userId === GUEST_CONTEXT_KEY) return;
  const key = getQueueStorageKey(userId);
  if (queue.length === 0) {
    await AsyncStorage.removeItem(key);
    return;
  }
  await AsyncStorage.setItem(key, JSON.stringify(queue));
}

export async function enqueueSyncOp(
  userId: string,
  op: Omit<SyncQueueItem, 'updatedAt'>
): Promise<SyncQueueItem[]> {
  if (!userId || userId === GUEST_CONTEXT_KEY) return [];
  const queue = await getSyncQueue(userId);
  const filtered = queue.filter(
    (item) => !(item.entity === op.entity && item.recordId === op.recordId)
  );
  const next: SyncQueueItem[] = [
    ...filtered,
    { ...op, updatedAt: new Date().toISOString() },
  ];
  await saveSyncQueue(userId, next);
  return next;
}

export async function clearSyncQueue(userId: string): Promise<void> {
  if (!userId || userId === GUEST_CONTEXT_KEY) return;
  await AsyncStorage.removeItem(getQueueStorageKey(userId));
}

async function executeSyncOp(userId: string, item: SyncQueueItem): Promise<void> {
  switch (item.entity) {
    case 'perfil':
      if (item.action === 'upsert' && item.payload) {
        await db.salvarPerfil(userId, item.payload as Partial<PerfilUsuario>);
      }
      return;
    case 'lembrete':
      if (item.action === 'delete') {
        await db.removerLembrete(userId, item.recordId);
      } else if (item.payload) {
        await db.upsertLembrete(userId, item.payload as Lembrete);
      }
      return;
    case 'medicamento':
      if (item.action === 'delete') {
        await db.removerMedicamento(userId, item.recordId);
      } else if (item.payload) {
        await db.upsertMedicamento(userId, item.payload as Medicamento);
      }
      return;
    case 'sinalVital':
      if (item.action === 'delete') {
        await db.removerSinalVital(userId, item.recordId);
      } else if (item.payload) {
        await db.upsertSinalVital(userId, item.payload as SinalVital);
      }
      return;
    case 'humor':
      if (item.action === 'delete') {
        await db.removerHumor(userId, item.recordId);
      } else if (item.payload) {
        await db.upsertHumor(userId, item.payload as HumorRegistro);
      }
      return;
    case 'avaliacaoPsicologia':
      if (item.action === 'delete') {
        await db.removerAvaliacaoPsicologia(userId, item.recordId);
      } else if (item.payload) {
        await db.upsertAvaliacaoPsicologia(userId, item.payload as AvaliacaoPsicologica);
      }
      return;
    case 'treino':
      if (item.action === 'delete') {
        await db.removerTreino(userId, item.recordId);
      } else if (item.payload) {
        await db.upsertTreino(userId, item.payload as Treino);
      }
      return;
    case 'registroDor':
      if (item.action === 'delete') {
        await db.removerRegistroDor(userId, item.recordId);
      } else if (item.payload) {
        await db.upsertRegistroDor(userId, item.payload as RegistroDor);
      }
      return;
    case 'pesoImc':
      if (item.action === 'delete') {
        await db.removerPesoImc(userId, item.recordId);
      } else if (item.payload) {
        await db.upsertPesoImc(userId, item.payload as PesoImcRegistro);
      }
      return;
    case 'checklist':
      if (item.action === 'upsert' && item.payload) {
        await db.salvarChecklistCuidados(userId, item.payload as ChecklistCuidadoDiario);
      }
      return;
  }
}

export interface FlushResult {
  flushed: number;
  remaining: number;
}

const activeFlushPromises = new Map<string, Promise<FlushResult>>();

export async function flushSyncQueue(
  userId: string,
  options?: { forceConfigured?: boolean }
): Promise<FlushResult> {
  if (!userId || userId === GUEST_CONTEXT_KEY) {
    return { flushed: 0, remaining: 0 };
  }

  const configured = options?.forceConfigured ?? isSupabaseConfigured;
  if (!configured) {
    const current = await getSyncQueue(userId);
    return { flushed: 0, remaining: current.length };
  }

  const existing = activeFlushPromises.get(userId);
  if (existing) return existing;

  const task = (async (): Promise<FlushResult> => {
    const queue = await getSyncQueue(userId);
    if (queue.length === 0) return { flushed: 0, remaining: 0 };

    if (!options?.forceConfigured) {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data?.session?.user || data.session.user.id !== userId) {
          return { flushed: 0, remaining: queue.length };
        }
      } catch {
        return { flushed: 0, remaining: queue.length };
      }
    }

    const failed: SyncQueueItem[] = [];
    let flushed = 0;

    for (const item of queue) {
      try {
        await executeSyncOp(userId, item);
        flushed += 1;
      } catch (err) {
        console.warn(`Sincronização adiada para ${item.entity}:${item.recordId}:`, err);
        failed.push(item);
      }
    }

    // Re-lê a fila atual para não descartar operações adicionadas durante o flush
    const latestQueue = await getSyncQueue(userId);
    const processedKeys = new Set(queue.map((q) => `${q.entity}:${q.recordId}:${q.updatedAt}`));
    const addedDuringFlush = latestQueue.filter(
      (q) => !processedKeys.has(`${q.entity}:${q.recordId}:${q.updatedAt}`)
    );

    const nextQueue = [...failed];
    for (const extra of addedDuringFlush) {
      const idx = nextQueue.findIndex(
        (f) => f.entity === extra.entity && f.recordId === extra.recordId
      );
      if (idx >= 0) nextQueue[idx] = extra;
      else nextQueue.push(extra);
    }

    await saveSyncQueue(userId, nextQueue);
    return { flushed, remaining: nextQueue.length };
  })().finally(() => {
    activeFlushPromises.delete(userId);
  });

  activeFlushPromises.set(userId, task);
  return task;
}

export async function enqueueAndSync(
  userId: string,
  op: Omit<SyncQueueItem, 'updatedAt'>,
  options?: { forceConfigured?: boolean }
): Promise<FlushResult> {
  await enqueueSyncOp(userId, op);
  return flushSyncQueue(userId, options);
}

export async function hydrateCloudSnapshot(
  userId: string,
  options?: { forceConfigured?: boolean }
): Promise<Partial<SnapshotClinico>> {
  if (!userId || userId === GUEST_CONTEXT_KEY) return {};
  const configured = options?.forceConfigured ?? isSupabaseConfigured;
  if (!configured) return {};

  await flushSyncQueue(userId, options);

  const hojeKey = getHojeLocalKey();
  const [
    perfilRes,
    lembretesRes,
    medicamentosRes,
    sinaisRes,
    humorRes,
    avaliacoesRes,
    treinosRes,
    dorRes,
    imcRes,
    checklistRes,
  ] = await Promise.allSettled([
    db.buscarPerfil(userId),
    db.listarLembretes(userId),
    db.listarMedicamentos(userId),
    db.listarSinaisVitais(userId),
    db.listarHumor(userId),
    db.listarAvaliacoesPsicologia(userId),
    db.listarTreinos(userId),
    db.listarHistoricoDor(userId),
    db.listarHistoricoImc(userId),
    db.buscarChecklistCuidados(userId, hojeKey),
  ]);

  const partial: Partial<SnapshotClinico> = {};
  if (perfilRes.status === 'fulfilled' && perfilRes.value) partial.perfil = perfilRes.value;
  if (lembretesRes.status === 'fulfilled') partial.lembretes = lembretesRes.value;
  if (medicamentosRes.status === 'fulfilled') partial.medicamentos = medicamentosRes.value;
  if (sinaisRes.status === 'fulfilled') partial.sinaisVitais = sinaisRes.value;
  if (humorRes.status === 'fulfilled') partial.humorHistorico = humorRes.value;
  if (avaliacoesRes.status === 'fulfilled') partial.avaliacoesPsicologia = avaliacoesRes.value;
  if (treinosRes.status === 'fulfilled') partial.treinos = treinosRes.value;
  if (dorRes.status === 'fulfilled') partial.historicoDor = dorRes.value;
  if (imcRes.status === 'fulfilled') partial.historicoImc = imcRes.value;
  if (checklistRes.status === 'fulfilled' && checklistRes.value) {
    partial.checklistCuidados = checklistRes.value;
  }

  return partial;
}
