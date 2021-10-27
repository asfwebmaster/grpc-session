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
import { ServerSurfaceCall } from "@grpc/grpc-js/build/src/server-call";

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

export interface SessionOptions {
  expires?: number; // Session expiration time in seconds
  sessionName?: string;
  cookie?: cookie.CookieSerializeOptions;
}
export type Primitive = string | number | boolean | null;
export type SessionKeyValue = Primitive | { [key: string]: Primitive };
export type SessionData = { [key: string]: SessionKeyValue } | null;

export class Session {
  private sessionData: SessionData; // stores session data after loading it from the store
  private sessionName: string; // session name default is _SID
  private sessionId: string; // stores session id if found in metadata
  private store: Store; // Store instance

  options: SessionOptions; // sessionName and expiration time can be set here

  /**
   * Session
   *
   * @param store Session Store
   * @param options {sessionName:"_SID", expires: add expiration in time seconds exp: 60*60*20}
   */
  constructor(
    store: Store,
    options: SessionOptions = {
      sessionName: "_SID",
      expires: 60 * 60 * 20,
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
   * @returns Session
   */
  async gRPC(call: ServerSurfaceCall) {
    // Check cookies for session id
    const cookiesHeader = call.metadata.get("cookies").toString();
    const cookies = cookie.parse(cookiesHeader);

    console.log("1:", call.metadata);

    // Whether to load or start new session
    if (cookies[this.sessionName]) {
      this.sessionId = cookies[this.sessionName];
      this.sessionData = await this.store.get(this.sessionId);
      console.log("2:", this.sessionData);
      // Session does not exist in the store
      // Let's start a new session
      if (this.sessionData === null) {
        this.start();
      }
    } else {
      // SessionId does not exist in cookies header start new session
      this.start();
    }

    // Send cookie header
    call.sendMetadata(this.getMetadata());

    // Save session
    await this.save();

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
   * Sets new session param
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
   * Removes param from session
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
   * Session Id
   *
   * @returns string - Session id
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

    // if (this.options.expires) {
    //   this.options.expires;
    //   this.options.cookie = {
    //     ...this.options.cookie,
    //     maxAge: this.options.expires,
    //   };
    // }

    let metadata = new Metadata();
    metadata.set(
      "set-cookie",
      cookie.serialize(this.sessionName, this.sessionId, this.options.cookie)
    );

    return metadata;
  }

  /**
   * Saves session to the store
   *
   * @returns Promise
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
   * Deletes session
   *
   * @returns Promise
   */
  destroy() {
    return this.store.delete(this.sessionId);
  }
}
