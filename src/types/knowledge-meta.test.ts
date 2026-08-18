import { describe, expect, it } from "vitest";

import { assessTrustEvidence, deriveTrustDisplayStatus } from "./knowledge-meta";

describe("trust evidence assessment", () => {
  it("gives conflicting evidence priority over its source basis", () => {
    expect(
      assessTrustEvidence({
        basis: "official",
        conflictState: "conflicting",
        confirmationCount: 12,
      }),
    ).toEqual({
      status: "conflictingReports",
      reasonCode: "conflicting-reports-take-priority",
    });
  });

  it("requires the explicit community confirmation threshold", () => {
    expect(
      deriveTrustDisplayStatus({
        basis: "community",
        conflictState: "none",
        confirmationCount: 1,
      }),
    ).toBe("needsConfirmation");

    expect(
      deriveTrustDisplayStatus({
        basis: "community",
        conflictState: "none",
        confirmationCount: 2,
      }),
    ).toBe("communityConfirmed");
  });

  it("keeps evidence-free knowledge explicitly unknown", () => {
    expect(
      deriveTrustDisplayStatus({
        basis: "unverified",
        conflictState: "none",
        confirmationCount: 0,
      }),
    ).toBe("unknown");
  });
});
