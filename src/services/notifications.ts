import { Platform, LogBox } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * Identifica se a execução está ocorrendo dentro do aplicativo Expo Go.
 * A partir do SDK 53, o Expo Go removeu o suporte a push notifications remotas no Android.
 */
export const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// ---------------------------------------------------------------------------
// Canais (Android)
// ---------------------------------------------------------------------------

export const NOTIFICATION_CHANNELS = {
  /** Canal genérico / padrão. */
  DEFAULT: 'default',
  /** Lembretes e alarmes agendados pelo usuário. */
  LEMBRETES: 'lembretes',
  /** Alertas de saúde (ex.: sinais vitais fora da faixa). */
  ALERTAS_SAUDE: 'alertas-saude',
} as const;

export type NotificationChannelId =
  (typeof NOTIFICATION_CHANNELS)[keyof typeof NOTIFICATION_CHANNELS];

const ANDROID_CHANNELS: Array<{
  id: NotificationChannelId;
  config: Notifications.NotificationChannelInput;
}> = [
  {
    id: NOTIFICATION_CHANNELS.DEFAULT,
    config: {
      name: 'Geral',
      importance: Notifications.AndroidImportance.DEFAULT,
    },
  },
  {
    id: NOTIFICATION_CHANNELS.LEMBRETES,
    config: {
      name: 'Lembretes e Alarmes',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0056b3',
    },
  },
  {
    id: NOTIFICATION_CHANNELS.ALERTAS_SAUDE,
    config: {
      name: 'Alertas de Saúde',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF0000',
    },
  },
];

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

/** Dia da semana no padrão do expo-notifications: 1 = Domingo ... 7 = Sábado. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const WEEKDAYS: ReadonlyArray<{ value: Weekday; short: string; label: string }> = [
  { value: 1, short: 'Dom', label: 'Domingo' },
  { value: 2, short: 'Seg', label: 'Segunda' },
  { value: 3, short: 'Ter', label: 'Terça' },
  { value: 4, short: 'Qua', label: 'Quarta' },
  { value: 5, short: 'Qui', label: 'Quinta' },
  { value: 6, short: 'Sex', label: 'Sexta' },
  { value: 7, short: 'Sáb', label: 'Sábado' },
];

export interface TimeOfDay {
  hour: number;
  minute: number;
}

export type NotificationSchedule =
  /** Dispara uma única vez na data informada. */
  | { type: 'once'; date: Date }
  /** Dispara após `seconds` segundos (opcionalmente repetindo; mínimo de 60s para repetir). */
  | { type: 'interval'; seconds: number; repeats?: boolean }
  /** Repete todos os dias no horário informado. */
  | ({ type: 'daily' } & TimeOfDay)
  /** Repete toda semana, no dia e horário informados. */
  | ({ type: 'weekly'; weekday: Weekday } & TimeOfDay)
  /** Repete toda semana nos dias informados (gera um agendamento por dia). */
  | ({ type: 'specificDays'; weekdays: Weekday[] } & TimeOfDay);

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  /** Toca o som padrão. Padrão: `true`. */
  sound?: boolean;
  /** Canal Android. Padrão: `NOTIFICATION_CHANNELS.DEFAULT`. */
  channelId?: NotificationChannelId;
  /** Prioridade máxima no Android (heads-up). Padrão: `false`. */
  highPriority?: boolean;
}

// ---------------------------------------------------------------------------
// Inicialização: handler, canais e permissões
// ---------------------------------------------------------------------------

let handlerConfigured = false;
let initPromise: Promise<boolean> | null = null;

/** Define como as notificações são exibidas com o app em primeiro plano. Idempotente. */
export function configureNotificationHandler(): void {
  if (handlerConfigured) return;

  // No Expo Go (Android, SDK 53+), push remoto foi removido pelo Expo e o expo-notifications
  // aciona aviso fatal no Android em DEV. Ignoramos o log para garantir que o app funcione
  // perfeitamente com notificações locais.
  LogBox.ignoreLogs([
    'expo-notifications: Android Push notifications',
    '`expo-notifications` functionality is not fully supported in Expo Go',
  ]);

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  handlerConfigured = true;
}

/** Cria/atualiza os canais de notificação no Android. Sem efeito nas demais plataformas. */
export async function setupAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Promise.all(
    ANDROID_CHANNELS.map(({ id, config }) => Notifications.setNotificationChannelAsync(id, config)),
  );
}

/**
 * Garante a permissão de notificações. Só exibe o prompt ao usuário
 * se a permissão ainda não tiver sido concedida.
 * @returns `true` se a permissão estiver concedida.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted || current.status === 'granted') return true;
    if (current.canAskAgain === false) return false;

    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted || requested.status === 'granted';
  } catch (error) {
    console.log('[notifications] Falha ao solicitar permissões:', error);
    return false;
  }
}

/**
 * Obtém o token de notificações remotas (push) com segurança.
 * Caso esteja rodando no Expo Go (onde push remoto foi removido a partir do SDK 53),
 * a chamada é ignorada retornando null e emitindo apenas um aviso de log,
 * evitando a quebra da aplicação.
 */
export async function getPushTokenSafely(): Promise<string | null> {
  if (isExpoGo) {
    if (__DEV__) {
      console.log(
        '[notifications] Push remoto desabilitado no Expo Go. Utilize uma development build para notificações push remotas.'
      );
    }
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch (error) {
    console.log('[notifications] Falha ao obter token de notificação remota:', error);
    return null;
  }
}

/**
 * Inicializa o serviço (handler + canais Android + permissões).
 * Pode ser chamado de várias telas: a execução acontece apenas uma vez.
 * Focado 100% em notificações locais.
 * @returns `true` se as notificações estiverem permitidas.
 */
export function initializeNotifications(): Promise<boolean> {
  if (!initPromise) {
    initPromise = (async () => {
      configureNotificationHandler();
      try {
        await setupAndroidChannels();
      } catch (error) {
        console.log('[notifications] Falha ao configurar canais Android:', error);
      }
      return requestNotificationPermissions();
    })();
  }
  return initPromise;
}

// ---------------------------------------------------------------------------
// Agendamento
// ---------------------------------------------------------------------------

function assertTimeOfDay({ hour, minute }: TimeOfDay): void {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new Error(`Hora inválida: ${hour}. Use um inteiro entre 0 e 23.`);
  }
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
    throw new Error(`Minuto inválido: ${minute}. Use um inteiro entre 0 e 59.`);
  }
}

function assertWeekday(weekday: number): asserts weekday is Weekday {
  if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) {
    throw new Error(`Dia da semana inválido: ${weekday}. Use 1 (Domingo) a 7 (Sábado).`);
  }
}

/**
 * Converte um `NotificationSchedule` em um ou mais triggers do expo-notifications.
 * `specificDays` gera um trigger semanal para cada dia selecionado.
 */
export function buildTriggers(
  schedule: NotificationSchedule,
  channelId: NotificationChannelId = NOTIFICATION_CHANNELS.DEFAULT,
): Notifications.SchedulableNotificationTriggerInput[] {
  const { SchedulableTriggerInputTypes: Types } = Notifications;

  switch (schedule.type) {
    case 'once': {
      if (!(schedule.date instanceof Date) || isNaN(schedule.date.getTime())) {
        throw new Error('Data inválida para agendamento único.');
      }
      if (schedule.date.getTime() <= Date.now()) {
        throw new Error('A data do agendamento único precisa estar no futuro.');
      }
      return [{ type: Types.DATE, date: schedule.date, channelId }];
    }
    case 'interval': {
      const repeats = schedule.repeats ?? false;
      if (!(schedule.seconds > 0)) {
        throw new Error('O intervalo precisa ser maior que zero segundos.');
      }
      if (repeats && schedule.seconds < 60) {
        throw new Error('Intervalos repetidos precisam ter no mínimo 60 segundos.');
      }
      return [{ type: Types.TIME_INTERVAL, seconds: schedule.seconds, repeats, channelId }];
    }
    case 'daily': {
      assertTimeOfDay(schedule);
      return [{ type: Types.DAILY, hour: schedule.hour, minute: schedule.minute, channelId }];
    }
    case 'weekly': {
      assertTimeOfDay(schedule);
      assertWeekday(schedule.weekday);
      return [
        {
          type: Types.WEEKLY,
          weekday: schedule.weekday,
          hour: schedule.hour,
          minute: schedule.minute,
          channelId,
        },
      ];
    }
    case 'specificDays': {
      assertTimeOfDay(schedule);
      const days = Array.from(new Set(schedule.weekdays)).sort((a, b) => a - b);
      if (days.length === 0) {
        throw new Error('Selecione pelo menos um dia da semana.');
      }
      days.forEach(assertWeekday);
      return days.map((weekday) => ({
        type: Types.WEEKLY,
        weekday,
        hour: schedule.hour,
        minute: schedule.minute,
        channelId,
      }));
    }
    default: {
      const exhaustive: never = schedule;
      throw new Error(`Tipo de agendamento não suportado: ${JSON.stringify(exhaustive)}`);
    }
  }
}

function buildContent(payload: NotificationPayload): Notifications.NotificationContentInput {
  return {
    title: payload.title,
    body: payload.body,
    data: payload.data,
    sound: payload.sound ?? true,
    ...(payload.highPriority ? { priority: Notifications.AndroidNotificationPriority.MAX } : {}),
  };
}

/**
 * Agenda uma notificação conforme a periodicidade informada.
 * @returns Lista de IDs agendados (vários quando `specificDays` tiver mais de um dia).
 *          Guarde-os para poder cancelar depois com `cancelNotifications`.
 */
export async function scheduleNotification(
  payload: NotificationPayload,
  schedule: NotificationSchedule,
): Promise<string[]> {
  const channelId = payload.channelId ?? NOTIFICATION_CHANNELS.DEFAULT;
  const triggers = buildTriggers(schedule, channelId);
  const content = buildContent(payload);

  const ids: string[] = [];
  try {
    for (const trigger of triggers) {
      ids.push(await Notifications.scheduleNotificationAsync({ content, trigger }));
    }
  } catch (error) {
    // Evita agendamentos parciais órfãos caso um dos dias falhe.
    await cancelNotifications(ids);
    throw error;
  }
  return ids;
}

/** Dispara uma notificação imediatamente. @returns ID da notificação. */
export function sendImmediateNotification(payload: NotificationPayload): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: buildContent(payload),
    trigger: null,
  });
}

// ---------------------------------------------------------------------------
// Cancelamento / consulta
// ---------------------------------------------------------------------------

export async function cancelNotification(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
}

export async function cancelNotifications(ids: ReadonlyArray<string> = []): Promise<void> {
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  return Notifications.getAllScheduledNotificationsAsync();
}

// ---------------------------------------------------------------------------
// Utilitário de desenvolvimento
// ---------------------------------------------------------------------------

/**
 * Teste manual de disparo (ambiente de desenvolvimento).
 *
 * - `delaySeconds = 0` (padrão): dispara imediatamente.
 * - `delaySeconds > 0`: agenda para daqui a N segundos — útil para testar
 *   com o app em segundo plano.
 */
export async function sendTestNotification(delaySeconds = 0): Promise<string> {
  const granted = await initializeNotifications();
  if (!granted) {
    throw new Error('Permissão de notificações não concedida.');
  }

  const payload: NotificationPayload = {
    title: '🔔 Notificação de teste',
    body:
      delaySeconds > 0
        ? `Disparada ${delaySeconds}s após o agendamento.`
        : 'O serviço de notificações está funcionando perfeitamente!',
    data: { test: true },
    channelId: NOTIFICATION_CHANNELS.DEFAULT,
  };

  if (delaySeconds > 0) {
    const [id] = await scheduleNotification(payload, { type: 'interval', seconds: delaySeconds });
    return id;
  }
  return sendImmediateNotification(payload);
}

/** Apenas para testes automatizados: reseta o estado interno do módulo. */
export function __resetNotificationServiceForTests(): void {
  handlerConfigured = false;
  initPromise = null;
}

