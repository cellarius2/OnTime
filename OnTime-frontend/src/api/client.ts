import axios from 'axios';
import type { Schedule } from '../types';

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '');
const apiUrl = configuredApiUrl || (import.meta.env.DEV ? '/api' : undefined);
const DEFAULT_API_TIMEOUT_MS = 45_000;
const DEFAULT_JONAS_CHAT_TIMEOUT_MS = 360_000;

const positiveMilliseconds = (value: string | undefined, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const jonasChatTimeoutMs = positiveMilliseconds(
    import.meta.env.VITE_JONAS_CHAT_TIMEOUT_MS,
    DEFAULT_JONAS_CHAT_TIMEOUT_MS
);

export class ApiConfigurationError extends Error {
    constructor() {
        super(
            'VITE_API_URL não foi configurada. Crie OnTime-frontend/.env.local, ' +
            'defina a URL da API e reinicie o servidor Vite.'
        );
        this.name = 'ApiConfigurationError';
    }
}

const api = axios.create({
    baseURL: apiUrl,
    timeout: DEFAULT_API_TIMEOUT_MS,
    transitional: { clarifyTimeoutError: true },
});

api.interceptors.request.use(config => {
    if (!apiUrl) {
        throw new ApiConfigurationError();
    }

    return config;
});

export const isApiConfigurationError = (error: unknown): error is ApiConfigurationError =>
    error instanceof ApiConfigurationError;

export const chatWithJonas = (
    message: string,
    history: Array<{ role: string; content: string }>,
    signal?: AbortSignal
) => api.post('/chat', { message, history }, {
    timeout: jonasChatTimeoutMs,
    signal,
});

export const getSchedules = () =>
    api.get<Schedule[]>('/schedule');

export const createSchedule = (schedule: Omit<Schedule, 'id' | 'createdAt'>) =>
    api.post<Schedule>('/schedule', schedule);

export const updateSchedule = (id: string, schedule: Partial<Schedule>) =>
    api.put<Schedule>(`/schedule/${id}`, schedule);

export const toggleSchedule = (id: string) =>
    api.patch<Schedule>(`/schedule/${id}/toggle`);

export const deleteSchedule = (id: string) =>
    api.delete(`/schedule/${id}`);

export const getConversations = () =>
    api.get('/conversation');
