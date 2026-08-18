export interface RequestOptions {
  readonly signal?: AbortSignal;
}

export interface RequestContext extends RequestOptions {
  /** Stable across retries of the same logical write. */
  readonly idempotencyKey: string;
  readonly actorId?: string;
}
