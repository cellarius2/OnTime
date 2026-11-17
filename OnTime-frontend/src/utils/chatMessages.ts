export interface SaveResult {
  remote: number;
  local: number;
  skipped: number;
  remoteItems: string[];
  localItems: string[];
  skippedItems: string[];
}

export interface ScheduleSummary {
  days: string[];
  time: string;
  message: string;
}

const DAY_LABELS: Record<string, string> = {
  mon: 'segunda', tue: 'terça', wed: 'quarta', thu: 'quinta',
  fri: 'sexta', sat: 'sábado', sun: 'domingo',
};
const COUNT_LABELS = ['nenhum', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete'];
const formatItems = (items: string[]) => items.map(item => `• ${item}`).join('\n');
const formatList = (items: string[]) => items.length < 2
  ? (items[0] ?? '')
  : `${items.slice(0, -1).join(', ')} e ${items.at(-1)}`;

const formatDays = (days: string[]) => {
  const normalized = [...new Set(days)];
  if (normalized.join(',') === 'mon,tue,wed,thu,fri') return 'segunda a sexta';
  return normalized.map(day => DAY_LABELS[day] ?? day).join(', ');
};

const successfulSaveMessage = (schedules: ScheduleSummary[]) => {
  const count = COUNT_LABELS[schedules.length] ?? String(schedules.length);
  const sharedDays = schedules.every(schedule =>
    schedule.days.join(',') === schedules[0]?.days.join(','));
  const days = sharedDays ? ` para ${formatDays(schedules[0]?.days ?? [])}` : '';
  const times = formatList(schedules.map(schedule => schedule.time));
  return `Pronto! Seus ${count} lembretes ficaram${days}, às ${times}. Meu relógio já está se achando importante. 🦔`;
};

export const buildSaveMessage = (schedules: ScheduleSummary[], result: SaveResult) => {
  const sections: string[] = [];
  if (result.remote === schedules.length) {
    sections.push(successfulSaveMessage(schedules));
  } else if (result.remoteItems.length > 0) {
    sections.push(`Consegui salvar no painel:\n${formatItems(result.remoteItems)}`);
  }
  if (result.localItems.length > 0) {
    sections.push(
      `Não consegui concluir estes lembretes:\n${formatItems(result.localItems)}\nEles ficaram somente neste navegador e não enviarão avisos automáticos. Confira a conexão e tente novamente.`
    );
  }
  if (result.skippedItems.length > 0) {
    sections.push(`Já estavam no painel, sem duplicar:\n${formatItems(result.skippedItems)}`);
  }
  return sections.join('\n\n') ||
    'Nenhum lembrete foi salvo. Confira os dados e tente novamente.';
};
