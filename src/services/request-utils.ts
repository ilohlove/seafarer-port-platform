export function createAbortError(): Error {
  const error = new Error("The operation was aborted.");
  error.name = "AbortError";
  return error;
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw signal.reason instanceof Error ? signal.reason : createAbortError();
  }
}

export function delay(milliseconds: number): Promise<void> {
  if (milliseconds <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, milliseconds);
  });
}

export async function withAbort<T>(
  operation: Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  throwIfAborted(signal);
  if (!signal) {
    return operation;
  }

  return new Promise<T>((resolve, reject) => {
    const abort = () => {
      reject(signal.reason instanceof Error ? signal.reason : createAbortError());
    };

    signal.addEventListener("abort", abort, { once: true });
    operation.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
  });
}
