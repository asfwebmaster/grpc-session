// Session
import { Metadata } from "@grpc/grpc-js";
import cookie from "cookie";
import moment from "moment";
import { nanoid } from "nanoid";

import { Store } from "./Store";
import {
  DEV,
  _ERROR_SESSION_DATA,
  _ERROR_SESSION_EXPIRED,
  _ERROR_SESSION_ID,
} from "./constants";

class SessionError extends Error {
  private __proto__?: SessionError;
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

interface SessionOptions {
  expires?: number; // Session expiration time in seconds
  sessionName?: string;
}

type SessionData = { [key: string]: string | number } | null;

export class Session {
  sessionData: SessionData; // stores session data after loading it from the store
  sessionName: string; // session name default is _SID
  sessionId: string; // stores session id if found in metadata
  store: Store; // Store instance

  options: SessionOptions; // sessionName and expiration time can be set here

  /**
   * Session
   *
   * @param store Session Store
   * @param options {sessionName:"_SID", expires: add expiration in time seconds exp: 60*60*20}
   */
  constructor(
    store: Store,
    options: SessionOptions = { sessionName: "_SID", expires: 60 * 60 * 20 }
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
  start(sessionData?: SessionData) {
    this.sessionId = nanoid();

    this.sessionData = {};
    if (sessionData) {
      this.sessionData = sessionData;
    }
    return this;
  }

  /**
   * Validates session
   * throws an error if session does not exist
   *
   * @param metadata gRPC Metadata
   * @returns Session
   */
  async validate(metadata: Metadata) {
    // Cookies are passed in metadata as string
    // lets parse them and look for our sessionName key
    // If cookie with sessionName does not exist in cookies we throw an error
    const cookiesMetadata = metadata.get("cookies").toString();
    const cookies = cookie.parse(cookiesMetadata);

    // TODO: check Authorization header as well

    if (!cookies[this.sessionName]) {
      if (DEV) {
        console.log("DEBUG: Could not find Session id in cookies.");
      }
      throw new SessionError(_ERROR_SESSION_ID);
    }

    this.sessionId = cookies[this.sessionName];
    this.sessionData = await this.store.get(this.sessionId);

    // Seems that session does not exist in the store, we throw an error
    if (this.sessionData === null) {
      if (DEV) {
        console.log("DEBUG: Session has not been found in the store.");
      }
      throw new SessionError(_ERROR_SESSION_DATA);
    }

    // Remove session if is expired
    if (this.sessionData.exp && this.sessionData.exp < moment().unix()) {
      if (DEV) {
        console.log(
          "DEBUG: Session has been expired and will be removed from the store."
        );
      }
      await this.store.delete(this.sessionId);
      throw new SessionError(_ERROR_SESSION_EXPIRED);
    }

    // NOTE - needs re-thinking two saves calls would be made if need to add something to the session
    // Updates session expiration time.
    await this.save();

    return this;
  }

  /**
   * Get session param
   *
   * @param key string key
   * @returns string
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
   * Sets new session param
   *
   * @param key string
   * @param value string
   * @returns Session
   */
  set(key: string, value: string | number) {
    if (this.sessionData === null) {
      throw new SessionError(_ERROR_SESSION_DATA);
    }
    const newData: { [key: string]: string | number } = {};
    newData[key] = value;
    this.sessionData = { ...this.sessionData, ...newData };

    return this;
  }

  /**
   * Removes param from session
   * @param key string
   * @returns Session
   */
  remove(key: string) {
    if (this.sessionData === null) {
      throw new SessionError(_ERROR_SESSION_DATA);
    }
    delete this.sessionData[key];

    return this;
  }

  /**
   * Saves session to the provided store
   *
   * @returns Promise
   */
  async save() {
    if (this.sessionData === null) {
      throw new SessionError(_ERROR_SESSION_DATA);
    }

    // Sets expiration time in session data
    if (this.options.expires) {
      this.set("exp", moment().unix() + this.options.expires);
    }

    return this.store.set(this.sessionId, this.sessionData);
  }

  /**
   * Deletes session
   *
   * @returns Promise
   */
  destroy() {
    return this.store.delete(this.sessionId);
  }
}
