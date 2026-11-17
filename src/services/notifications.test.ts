import { Platform, LogBox } from 'react-native';
import * as Notifications from 'expo-notifications';

import {
  NOTIFICATION_CHANNELS,
  __resetNotificationServiceForTests,
  buildTriggers,
  cancelAllNotifications,
  cancelNotification,
  cancelNotifications,
  configureNotificationHandler,
  getPushTokenSafely,
  initializeNotifications,
  isExpoGo,
  requestNotificationPermissions,
  scheduleNotification,
  sendImmediateNotification,
  sendTestNotification,
  setupAndroidChannels,
} from './notifications';

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  LogBox: { ignoreLogs: jest.fn() },
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { appOwnership: 'expo' },
  ExecutionEnvironment: { StoreClient: 'storeClient' },
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(null),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
  getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'ExponentPushToken[mock]' }),
  AndroidImportance: { DEFAULT: 3, HIGH: 4, MAX: 5 },
  AndroidNotificationPriority: { MAX: 'max' },
  SchedulableTriggerInputTypes: {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    DATE: 'date',
    TIME_INTERVAL: 'timeInterval',
  },
}));

const mocked = Notifications as jest.Mocked<typeof Notifications>;
const setPlatform = (os: string) => {
  (Platform as { OS: string }).OS = os;
};

const payload = { title: 'Título', body: 'Corpo' };

beforeEach(() => {
  jest.clearAllMocks();
  __resetNotificationServiceForTests();
  setPlatform('ios');
  let counter = 0;
  mocked.scheduleNotificationAsync.mockImplementation(async () => `id-${++counter}`);
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('permissões', () => {
  it('não exibe o prompt quando a permissão já foi concedida', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ granted: true, status: 'granted' } as never);

    await expect(requestNotificationPermissions()).resolves.toBe(true);
    expect(mocked.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('solicita a permissão quando ainda não concedida', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ granted: false, status: 'undetermined', canAskAgain: true } as never);
    mocked.requestPermissionsAsync.mockResolvedValue({ granted: true, status: 'granted' } as never);

    await expect(requestNotificationPermissions()).resolves.toBe(true);
    expect(mocked.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('retorna false quando o usuário nega', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ granted: false, status: 'undetermined', canAskAgain: true } as never);
    mocked.requestPermissionsAsync.mockResolvedValue({ granted: false, status: 'denied' } as never);

    await expect(requestNotificationPermissions()).resolves.toBe(false);
  });

  it('não pergunta novamente quando canAskAgain é false', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ granted: false, status: 'denied', canAskAgain: false } as never);

    await expect(requestNotificationPermissions()).resolves.toBe(false);
    expect(mocked.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('retorna false se a API lançar erro', async () => {
    mocked.getPermissionsAsync.mockRejectedValue(new Error('indisponível'));

    await expect(requestNotificationPermissions()).resolves.toBe(false);
  });
});

describe('inicialização', () => {
  it('configura o handler apenas uma vez', () => {
    configureNotificationHandler();
    configureNotificationHandler();
    expect(mocked.setNotificationHandler).toHaveBeenCalledTimes(1);
  });

  it('cria os canais apenas no Android', async () => {
    await setupAndroidChannels();
    expect(mocked.setNotificationChannelAsync).not.toHaveBeenCalled();

    setPlatform('android');
    await setupAndroidChannels();
    const ids = mocked.setNotificationChannelAsync.mock.calls.map(([id]) => id);
    expect(ids).toEqual(expect.arrayContaining(Object.values(NOTIFICATION_CHANNELS)));
  });

  it('initializeNotifications é memoizado (executa uma única vez)', async () => {
    setPlatform('android');
    mocked.getPermissionsAsync.mockResolvedValue({ granted: true, status: 'granted' } as never);

    const [a, b] = await Promise.all([initializeNotifications(), initializeNotifications()]);

    expect(a).toBe(true);
    expect(b).toBe(true);
    expect(mocked.setNotificationHandler).toHaveBeenCalledTimes(1);
    expect(mocked.getPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(mocked.setNotificationChannelAsync).toHaveBeenCalledTimes(Object.values(NOTIFICATION_CHANNELS).length);
  });
});

describe('buildTriggers', () => {
  it('diário', () => {
    expect(buildTriggers({ type: 'daily', hour: 8, minute: 30 })).toEqual([
      { type: 'daily', hour: 8, minute: 30, channelId: 'default' },
    ]);
  });

  it('semanal', () => {
    expect(buildTriggers({ type: 'weekly', weekday: 2, hour: 9, minute: 0 }, 'lembretes')).toEqual([
      { type: 'weekly', weekday: 2, hour: 9, minute: 0, channelId: 'lembretes' },
    ]);
  });

  it('dias específicos gera um trigger semanal por dia (ordenado e sem duplicatas)', () => {
    const triggers = buildTriggers({ type: 'specificDays', weekdays: [6, 2, 4, 2], hour: 7, minute: 15 });
    expect(triggers).toEqual([2, 4, 6].map((weekday) => ({
      type: 'weekly', weekday, hour: 7, minute: 15, channelId: 'default',
    })));
  });

  it('único (data futura) e intervalo', () => {
    const date = new Date(Date.now() + 60_000);
    expect(buildTriggers({ type: 'once', date })).toEqual([{ type: 'date', date, channelId: 'default' }]);
    expect(buildTriggers({ type: 'interval', seconds: 120, repeats: true })).toEqual([
      { type: 'timeInterval', seconds: 120, repeats: true, channelId: 'default' },
    ]);
  });

  it.each([
    [{ type: 'daily', hour: 24, minute: 0 }],
    [{ type: 'daily', hour: 10, minute: 60 }],
    [{ type: 'weekly', weekday: 8, hour: 10, minute: 0 }],
    [{ type: 'specificDays', weekdays: [], hour: 10, minute: 0 }],
    [{ type: 'once', date: new Date(Date.now() - 1000) }],
    [{ type: 'interval', seconds: 30, repeats: true }],
  ])('rejeita agendamento inválido: %j', (schedule) => {
    expect(() => buildTriggers(schedule as never)).toThrow();
  });
});

describe('agendamento', () => {
  it('agenda notificação diária e retorna o ID', async () => {
    const ids = await scheduleNotification(
      { ...payload, channelId: NOTIFICATION_CHANNELS.LEMBRETES },
      { type: 'daily', hour: 8, minute: 0 },
    );

    expect(ids).toEqual(['id-1']);
    expect(mocked.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: { title: 'Título', body: 'Corpo', data: undefined, sound: true },
      trigger: { type: 'daily', hour: 8, minute: 0, channelId: 'lembretes' },
    });
  });

  it('agenda um alarme por dia em dias específicos', async () => {
    const ids = await scheduleNotification(payload, {
      type: 'specificDays', weekdays: [2, 4, 6], hour: 20, minute: 0,
    });

    expect(ids).toEqual(['id-1', 'id-2', 'id-3']);
    expect(mocked.scheduleNotificationAsync).toHaveBeenCalledTimes(3);
  });

  it('desfaz agendamentos parciais quando um deles falha', async () => {
    mocked.scheduleNotificationAsync
      .mockResolvedValueOnce('ok-1')
      .mockRejectedValueOnce(new Error('falhou'));

    await expect(
      scheduleNotification(payload, { type: 'specificDays', weekdays: [2, 3], hour: 10, minute: 0 }),
    ).rejects.toThrow('falhou');
    expect(mocked.cancelScheduledNotificationAsync).toHaveBeenCalledWith('ok-1');
  });

  it('disparo imediato usa trigger null e prioridade máxima quando solicitado', async () => {
    await sendImmediateNotification({ ...payload, highPriority: true });

    expect(mocked.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: expect.objectContaining({ title: 'Título', priority: 'max' }),
      trigger: null,
    });
  });
});

describe('cancelamento', () => {
  it('cancela por ID, em lote e todos', async () => {
    await cancelNotification('a');
    await cancelNotifications(['b', 'c']);
    await cancelAllNotifications();

    expect(mocked.cancelScheduledNotificationAsync.mock.calls).toEqual([['a'], ['b'], ['c']]);
    expect(mocked.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
  });

  it('cancelNotifications sem IDs não chama a API', async () => {
    await cancelNotifications();
    expect(mocked.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
  });
});

describe('sendTestNotification', () => {
  beforeEach(() => {
    mocked.getPermissionsAsync.mockResolvedValue({ granted: true, status: 'granted' } as never);
  });

  it('dispara imediatamente por padrão', async () => {
    await sendTestNotification();
    expect(mocked.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: null }),
    );
  });

  it('agenda com atraso quando informado', async () => {
    await sendTestNotification(5);
    expect(mocked.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: expect.objectContaining({ type: 'timeInterval', seconds: 5, repeats: false }),
      }),
    );
  });

  it('falha sem permissão', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ granted: false, status: 'denied', canAskAgain: false } as never);
    await expect(sendTestNotification()).rejects.toThrow('Permissão');
  });
});

describe('isolamento de push remoto e suporte ao Expo Go', () => {
  it('initializeNotifications NÃO tenta obter push token remoto nem registra listeners remotos', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ granted: true, status: 'granted' } as never);
    await initializeNotifications();

    expect(mocked.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it('getPushTokenSafely retorna null e não chama getExpoPushTokenAsync no Expo Go', async () => {
    expect(isExpoGo).toBe(true);
    const token = await getPushTokenSafely();
    expect(token).toBeNull();
    expect(mocked.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it('configureNotificationHandler suprime os logs de aviso de push do Expo Go no LogBox', () => {
    configureNotificationHandler();
    expect(LogBox.ignoreLogs).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.stringContaining('expo-notifications: Android Push notifications'),
      ])
    );
  });
});


