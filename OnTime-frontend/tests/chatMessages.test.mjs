import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSaveMessage } from '../src/utils/chatMessages.ts';

const schedules = [
  { days: ['mon', 'tue', 'wed', 'thu', 'fri'], time: '08:00', message: 'Entrada' },
  { days: ['mon', 'tue', 'wed', 'thu', 'fri'], time: '12:00', message: 'Saída para almoço' },
  { days: ['mon', 'tue', 'wed', 'thu', 'fri'], time: '13:00', message: 'Retorno' },
  { days: ['mon', 'tue', 'wed', 'thu', 'fri'], time: '18:00', message: 'Saída' },
];

test('confirma uma vez com base nos quatro lembretes salvos', () => {
  const message = buildSaveMessage(schedules, {
    remote: 4, local: 0, skipped: 0,
    remoteItems: [], localItems: [], skippedItems: [],
  });
  assert.equal(
    message,
    'Pronto! Seus quatro lembretes ficaram para segunda a sexta, às 08:00, 12:00, 13:00 e 18:00. Meu relógio já está se achando importante. 🦔'
  );
});

test('explica uma falha parcial sem termos técnicos', () => {
  const message = buildSaveMessage(schedules, {
    remote: 2, local: 2, skipped: 0,
    remoteItems: ['Entrada às 08:00', 'Saída para almoço às 12:00'],
    localItems: ['Retorno às 13:00', 'Saída às 18:00'],
    skippedItems: [],
  });
  assert.match(message, /Consegui salvar no painel/);
  assert.match(message, /Não consegui concluir/);
  assert.match(message, /Confira a conexão e tente novamente/);
  assert.doesNotMatch(message, /API|payload|JSON|timeout|n8n/i);
});
