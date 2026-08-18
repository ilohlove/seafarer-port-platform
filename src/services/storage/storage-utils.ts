export class MemoryStorage implements Storage {
  readonly #values = new Map<string, string>();

  get length(): number {
    return this.#values.size;
  }

  clear(): void {
    this.#values.clear();
  }

  getItem(key: string): string | null {
    return this.#values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.#values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.#values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.#values.set(key, value);
  }
}

export function resolveStorage(provided?: Storage): Storage {
  if (provided) {
    return provided;
  }

  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Privacy modes may expose localStorage but throw when it is accessed.
  }

  return new MemoryStorage();
}
