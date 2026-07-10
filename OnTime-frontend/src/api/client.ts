import axios from 'axios';
import type { Schedule } from '../types';

const apiUrl = import.meta.env.VITE_API_URL?.trim();

if (!apiUrl) {
    console.warn('VITE_API_URL não foi configurada. As chamadas à API não funcionarão.');
}

const api = axios.create({
    baseURL: apiUrl,
    timeout: 45_000,
});

export const chatWithJonas = (message: string, history: Array<{ role: string; content: string }>) =>
    api.post('/api/chat', { message, history });

export const getSchedules = () =>
    api.get<Schedule[]>('/api/schedule');

export const createSchedule = (schedule: Omit<Schedule, 'id' | 'createdAt'>) =>
    api.post<Schedule>('/api/schedule', schedule);

export const updateSchedule = (id: string, schedule: Partial<Schedule>) =>
    api.put<Schedule>(`/api/schedule/${id}`, schedule);

export const toggleSchedule = (id: string) =>
    api.patch<Schedule>(`/api/schedule/${id}/toggle`);

export const deleteSchedule = (id: string) =>
    api.delete(`/api/schedule/${id}`);

export const getConversations = () =>
    api.get('/api/conversation');
