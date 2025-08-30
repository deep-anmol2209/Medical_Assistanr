import Redis from "ioredis";

// Redis config
const redisConfig = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  db: 0,
};

const redis = new Redis(redisConfig);

redis.on('connect', () =>('Redis connected'));
redis.on('error', err => ('Redis error:', err));

export default redis;