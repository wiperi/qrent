import { isIP } from 'node:net';

const limitPerMinute = 60;
const limitPerVisitor = 12;
const limitConcurrent = 8;
const visitors = new Map<string, number>();
let minute = 0;
let requests = 0;
let active = 0;

export function reserveAssistantTurn(request: Request) {
  const window = Math.floor(Date.now() / 60_000);
  if (window !== minute) {
    minute = window;
    requests = 0;
    visitors.clear();
  }
  // Vercel sets this header at ingress. On other hosts apply the shared limit.
  const forwarded = request.headers.get('x-vercel-forwarded-for') ?? '';
  const peer = process.env.VERCEL === '1' && isIP(forwarded) ? forwarded : null;
  const visitorRequests = peer ? (visitors.get(peer) ?? 0) : 0;
  if (requests >= limitPerMinute || visitorRequests >= limitPerVisitor || active >= limitConcurrent)
    return null;
  if (peer) visitors.set(peer, visitorRequests + 1);
  requests++;
  active++;
  return () => {
    active--;
  };
}
