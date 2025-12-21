import { NextRequest } from 'next/server';

const BACKEND_URL = 'http://45.32.212.237:8000/stream';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const isChatMessage = (value: unknown): value is ChatMessage => {
  if (!value || typeof value !== 'object') return false;
  const { role, content } = value as Record<string, unknown>;
  return (
    (role === 'user' || role === 'assistant') &&
    typeof content === 'string' &&
    content.trim().length > 0
  );
};

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    console.error('assistant/chat: invalid JSON body', error);
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const incomingMessages = Array.isArray((body as Record<string, unknown>)?.messages)
    ? ((body as Record<string, unknown>).messages as unknown[])
    : null;

  if (!incomingMessages) {
    return new Response(JSON.stringify({ error: '`messages` array is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const messages = incomingMessages.filter(isChatMessage).map(message => ({
    role: message.role,
    content: message.content.trim(),
  }));

  if (messages.length === 0) {
    return new Response(JSON.stringify({ error: 'No valid messages provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
      signal: request.signal,
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown upstream error');
      console.error('assistant/chat: upstream error', response.status, errorText);
      return new Response(JSON.stringify({ error: 'Assistant service responded with an error' }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!response.body) {
      console.error('assistant/chat: upstream response missing body');
      return new Response(JSON.stringify({ error: 'Upstream response missing body' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const headers = new Headers();
    const contentType = response.headers.get('content-type');
    if (contentType) headers.set('Content-Type', contentType);

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error('assistant/chat: failed to reach backend', error);
    return new Response(JSON.stringify({ error: 'Failed to connect to assistant service' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
