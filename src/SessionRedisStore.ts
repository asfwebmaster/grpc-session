// Session Store
import { SessionStoreError, Store } from "./Store";
import Redis, { ValueType } from "ioredis";

import type { SessionData } from "./Session";

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
   * @returns Promise<boolean>
   */
  async set(sessionId: string, data: SessionData) {
    try {
      let result: string | null;
      let _data: ValueType;
      _data = JSON.stringify(data);

      if (typeof data === "object" && !Array.isArray(data) && data !== null) {
        result = await this.redis.set(
          sessionId,
          _data,
          "EXAT",
          typeof data.exp === "number" ? data.exp : 0
        );
      } else {
        result = await this.redis.set(sessionId, _data);
      }
      if (result === "OK") {
        return true;
      }
    } catch (err) {
      if (err instanceof Error) {
        throw new SessionStoreError(err.message);
      }
    }
    return false;
  }

  /**
   * Delete session from the store
   *
   * @param sessionId Identification Id
   * @returns Promise
   */
  async delete(sessionId: string) {
    try {
      let result = await this.redis.del(sessionId);
      if (result) {
        return true;
      }
    } catch (err) {
      if (err instanceof Error) {
        throw new SessionStoreError(err.message);
      }
    }
    return false;
  }
}
