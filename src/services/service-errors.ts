export class ServiceError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export class NotFoundError extends ServiceError {
  constructor(resource: string, identifier: string) {
    super("not-found", `${resource} not found: ${identifier}`);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends ServiceError {
  constructor(message: string) {
    super("validation-error", message);
    this.name = "ValidationError";
  }
}

export class IdempotencyConflictError extends ServiceError {
  constructor() {
    super(
      "idempotency-conflict",
      "The idempotency key was already used for a different submission.",
    );
    this.name = "IdempotencyConflictError";
  }
}

export class MilestoneUnavailableError extends ServiceError {
  constructor(milestone: string, capability: string) {
    super(
      "milestone-unavailable",
      `${capability} is intentionally deferred until ${milestone}.`,
    );
    this.name = "MilestoneUnavailableError";
  }
}
