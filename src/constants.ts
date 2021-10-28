export const ENV = process.env.NODE_ENV || "development";
export const DEV = ENV === "development";

export const _ERROR_SESSION_ID =
  "Invalid Session Id. Did you forget to call Session.gRPC(call)?";
export const _ERROR_SESSION_EXPIRED = "Session has been expired.";
export const _ERROR_SESSION_DATA =
  "Invalid Session Data. Did you forget to call Session.gRPC(call)?";
