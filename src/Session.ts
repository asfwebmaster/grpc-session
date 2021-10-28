// Session
import { Metadata } from "@grpc/grpc-js";
import cookie from "cookie";
import moment from "moment";
import { nanoid } from "nanoid";
import { ServerSurfaceCall } from "@grpc/grpc-js/build/src/server-call";

import { Store } from "./Store";
import {
  _ERROR_SESSION_DATA,
  _ERROR_SESSION_EXPIRED,
  _ERROR_SESSION_ID,
} from "./constants";

/**
 * Session Error Class
 */
export class SessionError extends Error {
  private __proto__?: SessionError;
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

/**
 * Session Options Interface
 */
export interface SessionOptions {
  expires?: number; // Session expiration time in seconds
  sessionName?: string;
  cookie?: cookie.CookieSerializeOptions;
}
export type Primitive = string | number | boolean | null;
export type SessionKeyValue = Primitive | { [key: string]: Primitive };
export type SessionData = { [key: string]: SessionKeyValue } | null;

/**
 * Session class
 */
export class Session {
  private sessionData: SessionData; // Stores session data
  private sessionName: string; // Session name
  private sessionId: string; // Session id
  private store: Store; // Store Instance

  options: SessionOptions; // Session options

  /**
   * Session
   *
   * @param store Session Store
   * @param options {sessionName:"_SID", expires: "Time in seconds: 60*60*20"}
   */
  constructor(
    store: Store,
    options: SessionOptions = {
      sessionName: "_SID",
      expires: 60 * 60 * 20,
      cookie: { path: "/", httpOnly: true },
    }
  ) {
    this.sessionData = null;
    this.store = store;
    this.sessionId = "";
    this.sessionName = options.sessionName || "_SID";
    this.options = options;
  }

  /**
   * Creates new session
   *
   * @param sessionData
   * @returns Session
   */
  private start(sessionData?: SessionData) {
    this.sessionId = nanoid();

    this.sessionData = {};
    if (sessionData) {
      this.sessionData = sessionData;
    }
    return this;
  }

  /**
   * Will try to restore session from id or will create a new one
   *
   * @param call ServerSurfaceCall
   * @returns Promise<Session>
   */
  async gRPC(call: ServerSurfaceCall) {
    // Check cookies for session id
    const cookiesHeader = call.metadata.get("cookie").toString();
    const cookies = cookie.parse(cookiesHeader);

    // Whether to load or start new session
    if (cookies[this.sessionName]) {
      this.sessionId = cookies[this.sessionName];
      this.sessionData = await this.store.get(this.sessionId);
      // Session does not exist in the store
      // Let's start a new session
      if (this.sessionData === null) {
        this.start();
      } else {
        // Remove session if is expired
        if (this.sessionData.exp && this.sessionData.exp < moment().unix()) {
          await this.store.delete(this.sessionId);
          this.start();
        }
      }
    } else {
      // SessionId does not exist in cookies header start new session
      this.start();
    }

    // Sends cookie header
    call.sendMetadata(this.getMetadata());

    // Save session
    await this.save();

    return this;
  }

  /**
   * Get session key
   *
   * @param key string key
   * @returns string
   * @throws SessionError
   */
  get(key?: string) {
    if (this.sessionData === null) {
      throw new SessionError(_ERROR_SESSION_DATA);
    }
    if (key) {
      return this.sessionData[key];
    }
    return this.sessionData;
  }

  /**
   * Sets new session key
   *
   * @param key string
   * @param value string
   * @returns Session
   * @throws SessionError
   */
  set(key: string, value: SessionKeyValue) {
    if (this.sessionData === null) {
      throw new SessionError(_ERROR_SESSION_DATA);
    }
    const newData: { [key: string]: SessionKeyValue } = {};
    newData[key] = value;
    this.sessionData = { ...this.sessionData, ...newData };

    return this;
  }

  /**
   * Removes key from session
   *
   * @param key string
   * @returns Session
   * @throws SessionError
   */
  remove(key: string) {
    if (this.sessionData === null) {
      throw new SessionError(_ERROR_SESSION_DATA);
    }
    delete this.sessionData[key];

    return this;
  }

  /**
   * Gets session id
   *
   * @returns string
   * @throws SessionError
   */
  id() {
    if (!this.sessionId) {
      throw new SessionError(_ERROR_SESSION_ID);
    }
    return this.sessionId;
  }

  /**
   * Get Grpc Metadata
   *
   * @returns Metadata
   * @throws SessionError
   */
  getMetadata(): Metadata {
    if (this.sessionData === null) {
      throw new SessionError(_ERROR_SESSION_DATA);
    }

    const defaultCookiesOptions = {
      path: "/",
      httpOnly: true,
    };

    const options = {
      ...defaultCookiesOptions,
      maxAge: this.options.expires || 0,
      ...this.options.cookie,
    };

    let metadata = new Metadata();
    metadata.set(
      "Set-Cookie",
      cookie.serialize(this.sessionName, this.sessionId, options)
    );

    return metadata;
  }

  /**
   * Saves Session
   *
   * @returns Promise<boolean>
   * @throws SessionError
   */
  async save() {
    if (this.sessionData === null) {
      throw new SessionError(_ERROR_SESSION_DATA);
    }

    // Sets expiration time inside session data
    if (this.options.expires) {
      this.set("exp", moment().unix() + this.options.expires);
    }

    return this.store.set(this.sessionId, this.sessionData);
  }

  /**
   * Deletes Session
   *
   * @returns Promise<boolean>
   */
  destroy() {
    return this.store.delete(this.sessionId);
  }
}
