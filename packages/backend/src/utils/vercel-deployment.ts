import { createPublicKey, type JsonWebKey } from 'node:crypto';
import jwt from 'jsonwebtoken';

const team = 'wiperis-projects';
const teamId = 'team_wVGXQKuq4m7LvxH1vkLlRYJ2';
const audience = 'https://vercel.com/' + team;
const subject = 'owner:' + team + ':project:qrent-frontend:environment:production';
const issuerBase = 'https://oidc.vercel.com';

type SigningKey = JsonWebKey & { kid?: string; alg?: string };
const cache = new Map<string, { expires: number; keys: Promise<SigningKey[]> }>();

function deploymentKeys(issuer: string) {
  const now = Date.now();
  const cached = cache.get(issuer);
  if (cached && cached.expires > now) return cached.keys;
  const keys = fetch(issuer + '/.well-known/jwks', {
    redirect: 'error',
    signal: AbortSignal.timeout(1800),
  }).then(async response => {
    if (!response.ok) throw new Error('Deployment keys unavailable');
    const payload = await response.json();
    if (!Array.isArray(payload.keys)) throw new Error('Invalid deployment keys');
    return payload.keys as SigningKey[];
  });
  cache.set(issuer, { expires: now + 60_000, keys });
  return keys;
}

export async function isQrentProductionDeployment(authorization?: string) {
  if (!authorization?.startsWith('Bearer ') || authorization.length > 5000) return false;
  const token = authorization.slice(7);
  try {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || decoded.header.alg !== 'RS256' || !decoded.header.kid) return false;
    const claims = decoded.payload;
    if (typeof claims === 'string') return false;
    const issuer = claims.iss;
    if (issuer !== issuerBase && issuer !== issuerBase + '/' + team) return false;
    if (claims.sub !== subject || claims.owner_id !== teamId) return false;
    const jwk = (await deploymentKeys(issuer)).find(
      key => key.kid === decoded.header.kid && key.kty === 'RSA' && key.alg === 'RS256'
    );
    if (!jwk) return false;
    const verified = jwt.verify(token, createPublicKey({ key: jwk, format: 'jwk' }), {
      algorithms: ['RS256'],
      issuer,
      audience,
      subject,
      maxAge: '1h',
      clockTolerance: 5,
    });
    return (
      typeof verified !== 'string' &&
      verified.owner_id === teamId &&
      verified.environment === 'production' &&
      typeof verified.exp === 'number'
    );
  } catch {
    return false;
  }
}
