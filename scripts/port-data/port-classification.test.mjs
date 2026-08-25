// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  buildWpiEvidenceIndex,
  classificationForCandidate,
  hasAirportFunction,
  isMaritimeCandidateFunction,
  mergeFunctionCodes,
  normalizeUnLocode,
  requireDownloadedWpiDescriptor,
} from "./port-classification.mjs";

describe("port master classification", () => {
  it("separates maritime candidates from airport-only locations", () => {
    expect(isMaritimeCandidateFunction("1--4----")).toBe(true);
    expect(hasAirportFunction("1--4----")).toBe(true);
    expect(isMaritimeCandidateFunction("---4----")).toBe(false);
  });

  it("normalizes exact WPI LOCODEs and rejects malformed values", () => {
    expect(normalizeUnLocode("KR PUS")).toBe("KRPUS");
    expect(normalizeUnLocode("SGSIN")).toBe("SGSIN");
    expect(normalizeUnLocode("INVALID")).toBeUndefined();
  });

  it("groups duplicate WPI evidence without fuzzy matching", () => {
    const index = buildWpiEvidenceIndex([
      { wpiNumber: 10, unLocode: "KR PUS", countryCode: "KR" },
      { wpiNumber: 11, unLocode: "KRPUS", countryCode: "KR" },
      { wpiNumber: 12, unLocode: "SG SIN", countryCode: "MY" },
      { wpiNumber: 13, unLocode: "", countryCode: "US" },
    ]);

    expect(index.byLocode.get("KRPUS")).toHaveLength(2);
    expect(index.duplicateLocodes).toBe(1);
    expect(index.countryConflicts).toHaveLength(1);
    expect(index.withoutLocode).toHaveLength(1);
    expect(index.byLocode.has("SGSIN")).toBe(false);
  });

  it("publishes only WPI-confirmed or explicitly curated candidates", () => {
    const index = buildWpiEvidenceIndex([
      { wpiNumber: 10, unLocode: "KR PUS", countryCode: "KR" },
    ]);

    expect(classificationForCandidate("KRPUS", index).classification).toBe(
      "wpi-confirmed",
    );
    expect(classificationForCandidate("AUCBR", index).classification).toBe(
      "candidate",
    );
    expect(classificationForCandidate("SGCHG", index).classification).toBe(
      "candidate",
    );
    expect(
      classificationForCandidate("AUCBR", index, { decision: "include" })
        .classification,
    ).toBe("officially-curated");
    expect(
      classificationForCandidate("KRPUS", index, { decision: "exclude" })
        .classification,
    ).toBe("candidate");
  });

  it("retains all transport functions when duplicate source rows are merged", () => {
    expect(mergeFunctionCodes("1-------", "---4----")).toBe("1--4----");
  });

  it("fails closed when an official WPI snapshot is unavailable", () => {
    expect(() =>
      requireDownloadedWpiDescriptor({ availability: "unavailable" }),
    ).toThrow("verified official NGA WPI snapshot is required");
  });
});
