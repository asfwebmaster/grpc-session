import { SessionData } from "./Session";

export interface Store {
  // Retrieve key from the store
  get(sessionId: string): Promise<SessionData> | SessionData;

  // Sets session to the store
  set(sessionId: string, data: SessionData): Promise<boolean> | boolean;

  // Removes a key from the store
  delete(sessionId: string): Promise<boolean> | boolean;
}

export class SessionStoreError extends Error {
  private __proto__?: SessionStoreError;
  constructor(message?: string) {
    // 'Error' breaks prototype chain here
    super(message);

    // restore prototype chain
    const proto = new.target.prototype;

    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, proto);
    } else {
      this.__proto__ = proto;
    }
  }
}
