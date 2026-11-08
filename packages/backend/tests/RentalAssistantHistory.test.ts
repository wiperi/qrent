import express from 'express';
import { generateKeyPairSync } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { isQrentProductionDeployment } from '../src/utils/vercel-deployment';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { createRentalAssistantHistoryRouter } from '../src/routes/rentalAssistantHistory';

test('history accepts scoped ingestion before parsing transcripts and rejects credential fields', async () => {
  const store = { eval: jest.fn().mockResolvedValue(1) };
  const authorize = jest.fn(async (value?: string) => value === 'Bearer fixture');
  const app = express();
  app.use(createRentalAssistantHistoryRouter(store, authorize));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = 'http://127.0.0.1:' + (server.address() as AddressInfo).port;
  const today = new Date().toISOString().slice(0, 10);
  const event = {
    phase: 'start',
    recordId: today + '/e55fdc75-77db-4cee-801b-140bb06359c1',
    sessionId: '455f4ce4-9a5c-4089-8c06-9b1c0a1dcd81',
    question: '找 UNSW 两房',
    locale: 'zh',
    provider: 'deepseek',
  };
  async function post(body: string, authorized = true) {
    return fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(authorized ? { authorization: 'Bearer fixture' } : {}),
      },
      body,
    });
  }

  try {
    expect((await post('{broken', false)).status).toBe(401);
    expect((await post('{broken')).status).toBe(400);
    expect((await post(JSON.stringify({ ...event, apiKey: 'synthetic-secret' }))).status).toBe(400);
    expect(store.eval).not.toHaveBeenCalled();
    expect((await post(JSON.stringify(event))).status).toBe(204);
    expect(store.eval).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(store.eval.mock.calls)).not.toContain('synthetic-secret');
    expect(store.eval.mock.calls[0][1].keys).toEqual([
      'qrent:rental-assistant:history:v1:' + today,
    ]);
    expect((await fetch(url)).status).toBe(404);
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test('only a valid token for the exact production deployment can write chat history', async () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const issuer = 'https://oidc.vercel.com/wiperis-projects';
  const audience = 'https://vercel.com/wiperis-projects';
  const subject = 'owner:wiperis-projects:project:qrent-frontend:environment:production';
  const keys = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
    Response.json({
      keys: [{ ...publicKey.export({ format: 'jwk' }), kid: 'fixture', alg: 'RS256' }],
    })
  );
  const sign = (options: jwt.SignOptions = {}, owner = 'team_wVGXQKuq4m7LvxH1vkLlRYJ2') =>
    'Bearer ' +
    jwt.sign({ owner_id: owner, environment: 'production' }, privateKey, {
      algorithm: 'RS256',
      issuer,
      audience,
      subject,
      keyid: 'fixture',
      expiresIn: 600,
      ...options,
    });

  try {
    expect(await isQrentProductionDeployment(sign())).toBe(true);
    expect(keys).toHaveBeenCalledWith(issuer + '/.well-known/jwks', expect.any(Object));
    expect(
      await isQrentProductionDeployment(sign({ subject: subject.replace('production', 'preview') }))
    ).toBe(false);
    expect(await isQrentProductionDeployment(sign({ audience: 'https://example.test' }))).toBe(
      false
    );
    expect(await isQrentProductionDeployment(sign({ expiresIn: -20 }))).toBe(false);
    expect(await isQrentProductionDeployment(sign({}, 'another-team'))).toBe(false);
    const token = sign().split('.');
    token[2] = (token[2][0] === 'a' ? 'b' : 'a') + token[2].slice(1);
    expect(await isQrentProductionDeployment(token.join('.'))).toBe(false);
  } finally {
    keys.mockRestore();
  }
});
