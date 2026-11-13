import type { ModelConnection } from './contracts';

export function requestRentalAssistant(
  connection: ModelConnection,
  body: Record<string, unknown>,
  signal: AbortSignal
) {
  const { apiKey, ...model } =
    connection.type === 'local' ? { ...connection, apiKey: undefined } : connection;
  return fetch('/api/rental-assistant/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: 'Bearer ' + apiKey } : {}),
    },
    body: JSON.stringify({ ...body, connection: model }),
    signal,
  });
}
