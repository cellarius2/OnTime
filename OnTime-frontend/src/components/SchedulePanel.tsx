import { FaRegClock } from 'react-icons/fa';
import { FiEdit2 } from 'react-icons/fi';
import { LuClipboardList } from 'react-icons/lu';
import type { Schedule } from '../types';

const DAY_LABELS: Record<string, string> = {
  mon: 'Seg',
  tue: 'Ter',
  wed: 'Qua',
  thu: 'Qui',
  fri: 'Sex',
  sat: 'Sáb',
  sun: 'Dom',
};

function normalizeDays(days: string | string[] | undefined) {
  if (!days) return [];

  if (Array.isArray(days)) {
    return days;
  }

  return days
    .split(',')
    .map(day => day.trim())
    .filter(Boolean);
}

function getCleanMessage(schedule: Schedule) {
  const rawMessage = schedule.message || '';

  try {
    const parsed = JSON.parse(rawMessage);

    if (typeof parsed.text === 'string') {
      return parsed.text;
    }
  } catch {
    // não era JSON
  }

  return rawMessage;
}

function getReminderTitle(schedule: Schedule) {
  const title = schedule.title?.trim().toLowerCase() ?? '';
  const message = getCleanMessage(schedule).toLowerCase();

  const source = `${title} ${message}`;

  if (
    source.includes('volta almoço') ||
    source.includes('volta almoco') ||
    source.includes('retorno almoço') ||
    source.includes('retorno almoco') ||
    source.includes('retorno')
  ) {
    return '☕ Retorno do almoço';
  }

  if (
    source.includes('saida almoco') ||
    source.includes('saída almoço') ||
    source.includes('sair para almoço') ||
    source.includes('sair para almoco') ||
    source.includes('almoço') ||
    source.includes('almoco')
  ) {
    return '🍽️ Saída para almoço';
  }

  if (
    source.includes('saida') ||
    source.includes('saída') ||
    source.includes('expediente')
  ) {
    return '🏁 Saída do expediente';
  }

  if (source.includes('entrada')) {
    return '🟢 Entrada';
  }

  return schedule.title?.trim() || '⏰ Lembrete';
}

interface Props {
  schedules: Schedule[];
  onCreate: () => void;
  onEdit: (schedule: Schedule) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function SchedulePanel({
  schedules,
  onCreate,
  onEdit,
  onToggle,
  onDelete,
}: Props) {
  const confirmDelete = (schedule: Schedule) => {
    if (window.confirm('Deseja remover este lembrete?')) {
      onDelete(schedule.id);
    }
  };

  return (
    <div className="schedule-panel-body">
      <div className="schedule-list">
        {schedules.length === 0 ? (
          <div className="empty-state">
            <div className="empty-illustration">
              <LuClipboardList />
              <span className="clock-dot">
                <FaRegClock />
              </span>
            </div>

            <h3>Nenhum lembrete ainda</h3>
            <p>Converse com o Jonas ou crie manualmente seus lembretes de ponto!</p>
          </div>
        ) : (
          schedules.map(schedule => {
            const days = normalizeDays(schedule.days);
            const reminderTitle = getReminderTitle(schedule);

            return (
              <article
                key={schedule.id}
                className={`schedule-card ${!schedule.active ? 'schedule-card--inactive' : ''
                  }`}
              >
                <div className="schedule-time">{schedule.time}</div>

                <div className="schedule-info">
                  <p className="schedule-message">{reminderTitle}</p>

                  <div className="schedule-days">
                    {days.map(day => (
                      <span key={day} className="day-badge">
                        {DAY_LABELS[day] ?? day}
                      </span>
                    ))}

                    {schedule.notificationService && (
                      <span className="day-badge">
                        {schedule.notificationService === 'googleChat'
                          ? 'Google Chat'
                          : 'Discord'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="schedule-actions">
                  <button
                    className={`btn-toggle ${schedule.active ? 'btn-toggle--active' : ''
                      }`}
                    type="button"
                    onClick={() => onToggle(schedule.id)}
                    title={schedule.active ? 'Pausar' : 'Ativar'}
                  >
                    {schedule.active ? 'Ⅱ' : '▶'}
                  </button>

                  <button
                    className="btn-toggle"
                    type="button"
                    onClick={() => onEdit(schedule)}
                    title="Editar"
                  >
                    <FiEdit2 />
                  </button>

                  <button
                    className="btn-delete"
                    type="button"
                    onClick={() => confirmDelete(schedule)}
                    title="Remover"
                  >
                    ×
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>

      <button className="create-reminder" type="button" onClick={onCreate}>
        <span aria-hidden="true">＋</span>
        Criar lembrete
      </button>
    </div>
  );
}