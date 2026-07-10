import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import type { ChatMessage, JonasResponse, NotificationService } from '../types';
import { chatWithJonas } from '../api/client';
import jonasMark from '../assets/jonas-mark.png';

interface Props {
  webhookUrl: string;
  notificationService: NotificationService;
  onSchedulesSaved: (
    schedules: Array<{ days: string[]; time: string; message: string }>,
    webhookUrl: string,
    service?: NotificationService
  ) => void | Promise<void>;
}

const INITIAL_MESSAGE: ChatMessage = {
  role: 'jonas',
  content:
    'Oi! Eu sou o Jonas, seu ouriço de ponto! 🦔 Me conta: em quais dias e horários você quer ser lembrado de bater o ponto?',
};

const stripMarkdownJson = (value: string) => {
  const trimmed = value.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) return fencedMatch[1].trim();

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
};

const tryParseJson = (value: unknown): Partial<JonasResponse> | null => {
  if (!value) return null;
  if (typeof value === 'object') return value as Partial<JonasResponse>;
  if (typeof value !== 'string') return null;

  try {
    return JSON.parse(stripMarkdownJson(value)) as Partial<JonasResponse>;
  } catch {
    return null;
  }
};

const normalizeSchedulePayload = (schedules: JonasResponse['schedules']) => {
  if (!Array.isArray(schedules)) return [];

  return schedules
    .map(schedule => ({
      days: Array.isArray(schedule.days)
        ? schedule.days
        : String(schedule.days ?? '')
          .split(',')
          .map(day => day.trim())
          .filter(Boolean),
      time: String(schedule.time ?? '').trim(),
      message: String(schedule.message ?? '').trim(),
    }))
    .filter(schedule => schedule.days.length > 0 && schedule.time && schedule.message);
};

const cleanDisplayText = (value: string) =>
  value
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .replace(/\*\*/g, '')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, ' ')
    .replace(/\\"/g, '"')
    .trim();

const getJonasDisplayText = (data: unknown, response: Partial<JonasResponse>) => {
  const text =
    typeof response.text === 'string'
      ? response.text
      : typeof data === 'string'
        ? data
        : 'Certo! Vou cuidar disso para você.';

  return cleanDisplayText(text);
};

export function JonasChatWidget({
  webhookUrl,
  notificationService,
  onSchedulesSaved,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = messagesRef.current;
    if (!container) return;

    container.scrollTop = container.scrollHeight;
  }, [messages, loading]);

  const toApiRole = (role: ChatMessage['role']) =>
    role === 'jonas' ? 'assistant' : 'user';

  const buildHistory = (nextUserMessage?: string) => {
    const baseHistory = messages.map(message => ({
      role: toApiRole(message.role),
      content: message.content,
    }));

    if (!nextUserMessage) {
      return baseHistory;
    }

    return [
      ...baseHistory,
      {
        role: 'user',
        content: nextUserMessage,
      },
    ];
  };

  const send = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    const history = buildHistory(userMessage);

    setInput('');
    setMessages(previous => [...previous, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const { data } = await chatWithJonas(userMessage, history);

      console.log('Resposta da API:', data);

      const parsedData = tryParseJson(data);
      const parsedText = tryParseJson(parsedData?.text);

      const response = {
        ...(parsedData ?? {}),
        ...(parsedText ?? {}),
      } as Partial<JonasResponse>;

      const responseText = getJonasDisplayText(data, response);

      setMessages(previous => [...previous, { role: 'jonas', content: responseText }]);

      const schedulesToSave = normalizeSchedulePayload(response.schedules);

      if (response.intent === 'save_schedule' && schedulesToSave.length > 0) {
        if (!webhookUrl) {
          setMessages(previous => [
            ...previous,
            {
              role: 'jonas',
              content:
                'Opa! Antes de salvar, você precisa configurar o webhook do serviço padrão nas configurações.',
            },
          ]);
          return;
        }

        try {
          await onSchedulesSaved(schedulesToSave, webhookUrl, notificationService);

          setMessages(previous => [
            ...previous,
            {
              role: 'jonas',
              content: 'Lembretes salvos com sucesso! Você pode vê-los no painel ao lado.',
            },
          ]);
        } catch (error) {
          console.error('Erro ao salvar lembretes:', error);

          setMessages(previous => [
            ...previous,
            {
              role: 'jonas',
              content: 'Tive um problema ao salvar os lembretes. Tente novamente em instantes.',
            },
          ]);
        }
      }
    } catch (error) {
      console.error('Erro ao conversar com Jonas:', error);

      const errorMessage = axios.isAxiosError(error) && error.code === 'ECONNABORTED'
        ? 'Minha automação demorou um pouquinho para responder. Tente enviar novamente em alguns segundos.'
        : 'Não consegui falar com minha automação agora. Tente novamente em alguns segundos.';

      setMessages(previous => [
        ...previous,
        {
          role: 'jonas',
          content: errorMessage,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-widget">
      <div className="chat-messages" ref={messagesRef}>
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`chat-msg chat-msg--${message.role}`}>
            {message.role === 'jonas' && (
              <span className="chat-avatar">
                <img src={jonasMark} alt="" />
              </span>
            )}

            <div className="chat-bubble">
              <p>{cleanDisplayText(message.content)}</p>
              <span className="chat-time">{message.role === 'jonas' ? '10:30' : '10:31'}</span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-msg chat-msg--jonas">
            <span className="chat-avatar">
              <img src={jonasMark} alt="" />
            </span>

            <div className="chat-bubble chat-bubble--typing">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
      </div>

      <div className="chat-input">
        <input
          value={input}
          onChange={event => setInput(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') send();
          }}
          placeholder="Digite sua mensagem..."
          disabled={loading}
        />

        <button type="button" onClick={send} disabled={loading || !input.trim()} aria-label="Enviar">
          ↗
        </button>
      </div>
    </div>
  );
}
