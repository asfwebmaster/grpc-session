// Session Store
import { Store } from "./Store";
import Redis, { ValueType } from "ioredis";

/**
 * Redis Session Store Class
 */
export class SessionRedisStore implements Store {
  redis: Redis.Redis;

  constructor(options?: Redis.RedisOptions) {
    const redis = new Redis(options);
    this.redis = redis;
  }

  /**
   * Get Session
   *
   * @param sessionId Identification Id
   * @returns Promise
   */
  async get(sessionId: string) {
    const data = await this.redis.get(sessionId);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  }

  /**
   * Sets a new session to the store
   *
   * @param sessionId Identification Id
   * @param data data to store
   * @returns Promise
   */
  set(sessionId: string, data: { [key: string]: string }) {
    let _data: ValueType;
    _data = JSON.stringify(data);
    if (data.exp) {
      return this.redis.set(sessionId, _data, "EXAT", data.exp);
    } else {
      return this.redis.set(sessionId, _data);
    }
  }

  /**
   * Delete session from the store
   *
   * @param sessionId Identification Id
   * @returns Promise
   */
  delete(sessionId: string) {
    return this.redis.del(sessionId);
  }
}
