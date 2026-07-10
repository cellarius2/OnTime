export type NotificationService = 'discord' | 'googleChat' | 'both';

export interface Schedule {
  id: string;
  days: string;
  time: string;
  message: string;
  active: boolean;
  discordWebhookUrl: string;
  googleChatWebhookUrl?: string;
  notificationService?: NotificationService;
  title?: string;
  description?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  message: string;
  response: string;
  createdAt: string;
}

export interface ChatMessage {
  role: 'user' | 'jonas';
  content: string;
}

export interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface JonasResponse {
  text: string;
  intent: 'save_schedule' | 'cancel_schedule' | 'chat';
  schedules?: Array<{
    days: string[];
    time: string;
    message: string;
  }>;
}
