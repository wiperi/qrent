import { createClient, RedisClientType } from 'redis';

const redis: RedisClientType = createClient({
  url: process.env.REDIS_URL,
});

redis.on('error', err => console.log('Redis Client Error', err));

async function connect() {
  if (!redis.isOpen) {
    await redis.connect();
  }
}

connect();

export default redis;
