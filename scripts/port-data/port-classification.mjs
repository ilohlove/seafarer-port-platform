const UNLOCODE_PATTERN = /^[A-Z]{2}[A-Z0-9]{3}$/u;

export function normalizeUnLocode(value) {
  const normalized = String(value ?? "")
    .replace(/\s+/gu, "")
    .toUpperCase();
  return UNLOCODE_PATTERN.test(normalized) ? normalized : undefined;
}

export function isMaritimeCandidateFunction(value) {
  return typeof value === "string" && value[0] === "1";
}

export function hasAirportFunction(value) {
  return typeof value === "string" && value[3] === "4";
}

export function mergeFunctionCodes(left = "", right = "") {
  return Array.from({ length: 8 }, (_, index) => {
    const leftValue = left[index] ?? "-";
    const rightValue = right[index] ?? "-";
    return leftValue !== "-" ? leftValue : rightValue;
  }).join("");
}

export function buildWpiEvidenceIndex(records) {
  const byLocode = new Map();
  const withoutLocode = [];
  const invalid = [];
  const countryConflicts = [];

  for (const record of records) {
    const rawLocode = String(record.unLocode ?? "").trim();
    if (!rawLocode) {
      withoutLocode.push(record);
      continue;
    }

    const unLocode = normalizeUnLocode(rawLocode);
    const wpiNumber = String(record.wpiNumber ?? "").trim();
    if (!unLocode || !wpiNumber) {
      invalid.push(record);
      continue;
    }

    const countryCode = String(record.countryCode ?? "").trim().toUpperCase();
    if (countryCode && countryCode !== unLocode.slice(0, 2)) {
      countryConflicts.push({ ...record, unLocode });
      continue;
    }

    const evidence = {
      ...record,
      countryCode: countryCode || unLocode.slice(0, 2),
      unLocode,
      wpiNumber,
    };
    const existing = byLocode.get(unLocode) ?? [];
    existing.push(evidence);
    byLocode.set(unLocode, existing);
  }

  for (const evidence of byLocode.values()) {
    evidence.sort(
      (left, right) =>
        Number(left.wpiNumber) - Number(right.wpiNumber) ||
        left.wpiNumber.localeCompare(right.wpiNumber, "en"),
    );
  }

  return {
    byLocode,
    withoutLocode,
    invalid,
    countryConflicts,
    duplicateLocodes: [...byLocode.values()].filter((items) => items.length > 1)
      .length,
  };
}

export function classificationForCandidate(unLocode, evidenceIndex, override) {
  if (override?.decision === "exclude") {
    return { classification: "candidate", evidence: [] };
  }
  if (override?.decision === "include") {
    return {
      classification: "officially-curated",
      evidence: [],
    };
  }

  const evidence = evidenceIndex.byLocode.get(unLocode) ?? [];
  return evidence.length > 0
    ? { classification: "wpi-confirmed", evidence }
    : { classification: "candidate", evidence: [] };
}

export function requireDownloadedWpiDescriptor(descriptor) {
  if (
    descriptor?.availability !== "downloaded" ||
    !descriptor.fileName ||
    !descriptor.sha256
  ) {
    throw new Error(
      "A verified official NGA WPI snapshot is required before publishing port search data",
    );
  }
  return descriptor;
}
