// Store
import { SessionData } from "./Session";

/**
 * Session Store Interface
 */
export interface Store {
  // Gets Session
  get(sessionId: string): Promise<SessionData> | SessionData;

  // Inserts Session
  set(sessionId: string, data: SessionData): Promise<boolean> | boolean;

  // Deletes Session
  delete(sessionId: string): Promise<boolean> | boolean;
}

/**
 * Session Store Error Class
 */
export class SessionStoreError extends Error {
  private __proto__?: SessionStoreError;
  constructor(message?: string) {
    // 'Error' breaks prototype chain here
    super(message);

    // Restore prototype chain
    const proto = new.target.prototype;

    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, proto);
    } else {
      this.__proto__ = proto;
    }
  }
}
