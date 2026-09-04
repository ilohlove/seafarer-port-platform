import { afterEach, describe, expect, test, vi } from "vitest";

import { createIdempotencyKey } from "./idempotency";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

describe("createIdempotencyKey", () => {
  afterEach(() => vi.unstubAllGlobals());

  test("returns RFC4122 UUIDs through the native implementation", () => {
    const key = "86dc5b88-77cd-4abc-8d26-1201a82ef613";
    vi.stubGlobal("crypto", { randomUUID: () => key });
    expect(createIdempotencyKey()).toBe(key);
  });

  test("keeps the fallback syntactically valid without Web Crypto", () => {
    vi.stubGlobal("crypto", undefined);
    for (let index = 0; index < 100; index += 1) {
      expect(createIdempotencyKey()).toMatch(uuidPattern);
    }
  });
});
