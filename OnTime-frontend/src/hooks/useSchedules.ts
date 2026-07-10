import { useEffect, useState } from 'react';
import type { NotificationService, Schedule } from '../types';
import * as api from '../api/client';

const LOCAL_SCHEDULES_KEY = 'ontime_local_schedules';

export interface ManualScheduleInput {
  id?: string;
  title: string;
  description?: string;
  day: string;
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

  useEffect(() => {
    const localSchedules = readLocalSchedules();

    api
      .getSchedules()
      .then(res => setSchedules(mergeSchedules(res.data, localSchedules)))
      .catch(() => setSchedules(localSchedules))
      .finally(() => setLoading(false));
  }, []);

  const addSchedules = async (
    newOnes: Array<{ days: string[]; time: string; message: string }>,
    _webhookUrl: string,
    notificationService: NotificationService = 'discord'
  ) => {
    const created: Schedule[] = [];

    const discordWebhookUrl = localStorage.getItem('ontime_discord_webhook') ?? '';
    const googleChatWebhookUrl = localStorage.getItem('ontime_googlechat_webhook') ?? '';

    const finalNotificationService: NotificationService =
      discordWebhookUrl && googleChatWebhookUrl
        ? 'both'
        : googleChatWebhookUrl
          ? 'googleChat'
          : notificationService;

    for (const schedule of newOnes) {
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

      try {
        const res = await api.createSchedule(payload);
        created.push(res.data);
      } catch {
        created.push({
          ...payload,
          id: `local-${crypto.randomUUID()}`,
          createdAt: new Date().toISOString(),
        });
      }
    }

    setSchedules(previous => {
      const next = [...previous, ...created];
      writeLocalSchedules(next.filter(s => s.id.startsWith('local-')));
      return next;
    });
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
      days: input.day,
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
    addSchedules,
    saveManualSchedule,
    toggleSchedule,
    deleteSchedule,
  };
}