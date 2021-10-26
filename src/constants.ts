export const ENV = process.env.NODE_ENV || "development";
export const DEV = ENV === "development";

export const _ERROR_SESSION_ID = "Could not find session id in metadata";
export const _ERROR_SESSION_EXPIRED = "Session expired";
export const _ERROR_SESSION_DATA = "Invalid session data";
