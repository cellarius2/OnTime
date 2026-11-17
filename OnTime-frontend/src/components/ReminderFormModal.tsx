import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { IoClose } from 'react-icons/io5';
import type { NotificationService, Schedule } from '../types';
import type { ManualScheduleInput } from '../hooks/useSchedules';
import { normalizeWeekdays, WEEKDAYS, type Weekday } from '../utils/weekdays';

interface Props {
  schedule?: Schedule | null;
  discordWebhookUrl: string;
  googleChatWebhookUrl: string;
  defaultNotificationService: NotificationService;
  onSave: (schedule: ManualScheduleInput) => void;
  onClose: () => void;
}

export function ReminderFormModal({
  schedule,
  discordWebhookUrl,
  googleChatWebhookUrl,
  defaultNotificationService,
  onSave,
  onClose,
}: Props) {
  const initialService = useMemo(
    () => schedule?.notificationService ?? defaultNotificationService,
    [defaultNotificationService, schedule?.notificationService]
  );

  const [title, setTitle] = useState(schedule?.title ?? schedule?.message ?? '');
  const [description, setDescription] = useState(schedule?.description ?? '');
  const [selectedDays, setSelectedDays] = useState<Weekday[]>(() => {
    const savedDays = normalizeWeekdays(schedule?.days);
    return savedDays.length > 0 ? savedDays : ['mon'];
  });
  const [time, setTime] = useState(schedule?.time ?? '09:00');
  const [notificationService, setNotificationService] = useState<NotificationService>(initialService);
  const [active, setActive] = useState(schedule?.active ?? true);
  const [daysError, setDaysError] = useState('');

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    if (selectedDays.length === 0) {
      setDaysError('Selecione pelo menos um dia da semana.');
      return;
    }

    onSave({
      id: schedule?.id,
      title,
      description,
      days: selectedDays,
      time,
      notificationService,
      active,
      discordWebhookUrl,
      googleChatWebhookUrl,
    });
  };

  const toggleDay = (day: Weekday) => {
    setSelectedDays(previous => {
      const next = previous.includes(day)
        ? previous.filter(selected => selected !== day)
        : [...previous, day];

      return normalizeWeekdays(next);
    });
    setDaysError('');
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="settings-modal reminder-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reminder-modal-title"
        onMouseDown={event => event.stopPropagation()}
      >
        <div className="modal-heading">
          <h2 id="reminder-modal-title">{schedule ? 'Editar lembrete' : 'Criar lembrete'}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar">
            <IoClose />
          </button>
        </div>

        <form className="reminder-form" onSubmit={handleSubmit}>
          <label htmlFor="reminder-title">Título do lembrete</label>
          <input
            id="reminder-title"
            value={title}
            onChange={event => setTitle(event.target.value)}
            placeholder="Ex: Bater ponto de entrada"
            required
          />

          <label htmlFor="reminder-description">Descrição opcional</label>
          <textarea
            id="reminder-description"
            value={description}
            onChange={event => setDescription(event.target.value)}
            placeholder="Detalhes adicionais do lembrete"
          />

          <fieldset className="weekday-field" aria-describedby={daysError ? 'weekday-error' : undefined}>
            <legend>Dias da semana</legend>
            <div className="weekday-options">
              {WEEKDAYS.map(day => {
                const selected = selectedDays.includes(day.value);

                return (
                  <button
                    key={day.value}
                    className={`weekday-button ${selected ? 'weekday-button--selected' : ''}`}
                    type="button"
                    aria-pressed={selected}
                    aria-label={day.label}
                    onClick={() => toggleDay(day.value)}
                  >
                    {day.shortLabel}
                  </button>
                );
              })}
            </div>
            {daysError && <p id="weekday-error" className="weekday-error" role="alert">{daysError}</p>}
          </fieldset>

          <div>
            <label htmlFor="reminder-time">Horário</label>
            <input
              id="reminder-time"
              type="time"
              value={time}
              onChange={event => setTime(event.target.value)}
              required
            />
          </div>

          <label>Canal de notificação</label>
          <div className="modal-tabs">
            <button
              className={`modal-tab ${notificationService === 'discord' ? 'modal-tab--active' : ''}`}
              type="button"
              onClick={() => setNotificationService('discord')}
            >
              Discord
            </button>
            <button
              className={`modal-tab ${notificationService === 'googleChat' ? 'modal-tab--active' : ''}`}
              type="button"
              onClick={() => setNotificationService('googleChat')}
            >
              Google Chat
            </button>
          </div>

          <label>Status</label>
          <div className="modal-tabs">
            <button
              className={`modal-tab ${active ? 'modal-tab--active' : ''}`}
              type="button"
              onClick={() => setActive(true)}
            >
              Ativo
            </button>
            <button
              className={`modal-tab ${!active ? 'modal-tab--active' : ''}`}
              type="button"
              onClick={() => setActive(false)}
            >
              Inativo
            </button>
          </div>

          <button className="modal-primary-action" type="submit">
            Salvar lembrete
          </button>
        </form>
      </section>
    </div>
  );
}
