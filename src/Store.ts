type RT = string | boolean | Promise<boolean | string | number | null>;

export interface Store {
  // Retrieve key from the store
  get(sessionId: string): Promise<{ [key: string]: string } | null>;

  // Sets session to the store
  set(
    sessionId: string,
    data: { [key: string]: string | number | boolean }
  ): RT;

  // Removes a key from the store
  delete(sessionId: string): RT;
}
