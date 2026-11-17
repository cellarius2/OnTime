import { useEffect, useState } from 'react';
import type { NotificationService, Schedule } from '../types';
import * as api from '../api/client';

const LOCAL_SCHEDULES_KEY = 'ontime_local_schedules';

export interface ManualScheduleInput {
  id?: string;
  title: string;
  description?: string;
  days: string[];
  time: string;
  notificationService: NotificationService;
  active: boolean;
  discordWebhookUrl: string;
  googleChatWebhookUrl: string;
}

const readLocalSchedules = (): Schedule[] => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_SCHEDULES_KEY) ?? '[]') as Schedule[];
  } catch {
    return [];
  }
};

const writeLocalSchedules = (schedules: Schedule[]) => {
  localStorage.setItem(LOCAL_SCHEDULES_KEY, JSON.stringify(schedules));
};

const scheduleKey = (days: string | string[], time: string, message: string) => {
  const normalizedDays = (Array.isArray(days) ? days : days.split(','))
    .map(day => day.trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join(',');

  return `${normalizedDays}|${time.trim()}|${message.trim().toLowerCase()}`;
};

const mergeSchedules = (apiSchedules: Schedule[], localSchedules: Schedule[]) => {
  const seen = new Set<string>();

  return [...apiSchedules, ...localSchedules].filter(schedule => {
    if (seen.has(schedule.id)) return false;

    seen.add(schedule.id);
    return true;
  });
};

export function useSchedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    const localSchedules = readLocalSchedules();

    api
      .getSchedules()
      .then(res => setSchedules(mergeSchedules(res.data, localSchedules)))
      .catch(error => {
        if (api.isApiConfigurationError(error)) {
          setApiError(error.message);
        }
        setSchedules(localSchedules);
      })
      .finally(() => setLoading(false));
  }, []);

  const addSchedules = async (
    newOnes: Array<{ days: string[]; time: string; message: string }>,
    _webhookUrl: string,
    notificationService: NotificationService = 'discord'
  ) => {
    const batchStartedAt = performance.now();
    const created: Schedule[] = [];
    let remote = 0;
    let local = 0;
    let skipped = 0;
    const remoteItems: string[] = [];
    const localItems: string[] = [];
    const skippedItems: string[] = [];
    const describe = (schedule: { time: string; message: string }) =>
      `${schedule.message} às ${schedule.time}`;
    const existingKeys = new Set(
      schedules.map(schedule => scheduleKey(schedule.days, schedule.time, schedule.title ?? schedule.message))
    );

    const discordWebhookUrl = localStorage.getItem('ontime_discord_webhook') ?? '';
    const googleChatWebhookUrl = localStorage.getItem('ontime_googlechat_webhook') ?? '';

    const finalNotificationService: NotificationService =
      discordWebhookUrl && googleChatWebhookUrl
        ? 'both'
        : googleChatWebhookUrl
          ? 'googleChat'
          : notificationService;

    for (const schedule of newOnes) {
      const key = scheduleKey(schedule.days, schedule.time, schedule.message);
      if (existingKeys.has(key)) {
        skipped += 1;
        skippedItems.push(describe(schedule));
        continue;
      }
      existingKeys.add(key);

      const payload = {
        days: schedule.days.join(','),
        time: schedule.time,
        message: schedule.message,
        title: schedule.message,
        description: '',
        active: true,
        discordWebhookUrl,
        googleChatWebhookUrl,
        notificationService: finalNotificationService,
      };

      const creationStartedAt = performance.now();
      try {
        const res = await api.createSchedule(payload);
        console.info('Lembrete criado pela API', {
          time: schedule.time,
          durationMs: Math.round(performance.now() - creationStartedAt),
        });
        created.push(res.data);
        remote += 1;
        remoteItems.push(describe(schedule));
      } catch (error) {
        console.warn('Falha ao criar lembrete pela API', {
          time: schedule.time,
          durationMs: Math.round(performance.now() - creationStartedAt),
          errorType: error instanceof Error ? error.name : 'unknown',
        });
        if (api.isApiConfigurationError(error)) {
          setApiError(error.message);
          throw error;
        }

        created.push({
          ...payload,
          id: `local-${crypto.randomUUID()}`,
          createdAt: new Date().toISOString(),
        });
        local += 1;
        localItems.push(describe(schedule));
      }
    }

    setSchedules(previous => {
      const next = [...previous, ...created];
      writeLocalSchedules(next.filter(s => s.id.startsWith('local-')));
      return next;
    });

    console.info('Criação do conjunto de lembretes concluída', {
      count: newOnes.length,
      durationMs: Math.round(performance.now() - batchStartedAt),
      remote,
      local,
      skipped,
    });

    return { remote, local, skipped, remoteItems, localItems, skippedItems };
  };

  const saveManualSchedule = async (input: ManualScheduleInput) => {
    const message = input.description?.trim()
      ? `${input.title.trim()} - ${input.description.trim()}`
      : input.title.trim();

    const shouldUseDiscord =
      input.notificationService === 'discord' || input.notificationService === 'both';

    const shouldUseGoogleChat =
      input.notificationService === 'googleChat' || input.notificationService === 'both';

    const payload = {
      days: input.days.join(','),
      time: input.time,
      message,
      title: input.title.trim(),
      description: input.description?.trim() ?? '',
      active: input.active,
      discordWebhookUrl: shouldUseDiscord ? input.discordWebhookUrl : '',
      googleChatWebhookUrl: shouldUseGoogleChat ? input.googleChatWebhookUrl : '',
      notificationService: input.notificationService,
    };

    try {
      if (input.id && !input.id.startsWith('local-')) {
        const res = await api.updateSchedule(input.id, payload);

        setSchedules(previous =>
          previous.map(s => (s.id === input.id ? res.data : s))
        );
      } else {
        const res = await api.createSchedule(payload);

        setSchedules(previous => {
          const next = input.id
            ? previous.map(s => (s.id === input.id ? res.data : s))
            : [...previous, res.data];

          writeLocalSchedules(next.filter(s => s.id.startsWith('local-')));
          return next;
        });
      }
    } catch {
      const localSchedule: Schedule = {
        ...payload,
        id: input.id ?? `local-${crypto.randomUUID()}`,
        createdAt: new Date().toISOString(),
      };

      setSchedules(previous => {
        const exists = previous.some(s => s.id === localSchedule.id);

        const next = exists
          ? previous.map(s => (s.id === localSchedule.id ? { ...s, ...localSchedule } : s))
          : [...previous, localSchedule];

        writeLocalSchedules(next.filter(s => s.id.startsWith('local-')));
        return next;
      });
    }
  };

  const toggleSchedule = async (id: string) => {
    const current = schedules.find(s => s.id === id);
    if (!current) return;

    if (id.startsWith('local-')) {
      setSchedules(previous => {
        const next = previous.map(s =>
          s.id === id ? { ...s, active: !s.active } : s
        );

        writeLocalSchedules(next.filter(s => s.id.startsWith('local-')));
        return next;
      });

      return;
    }

    const res = await api.toggleSchedule(id);

    setSchedules(previous =>
      previous.map(s => (s.id === id ? res.data : s))
    );
  };

  const deleteSchedule = async (id: string) => {
    if (!id.startsWith('local-')) {
      await api.deleteSchedule(id);
    }

    setSchedules(previous => {
      const next = previous.filter(s => s.id !== id);
      writeLocalSchedules(next.filter(s => s.id.startsWith('local-')));
      return next;
    });
  };

  return {
    schedules,
    loading,
    apiError,
    addSchedules,
    saveManualSchedule,
    toggleSchedule,
    deleteSchedule,
  };
}
