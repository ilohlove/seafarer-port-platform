import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";

export const UNLOCODE_RELEASE = "2025-1";
export const DATASET_VERSION = `unlocode-${UNLOCODE_RELEASE}`;
export const UNLOCODE_SOURCE_URL =
  "https://unlocode.unece.org/publications/";
export const UNLOCODE_TERMS_URL = "https://unlocode.unece.org/terms/";
export const UNLOCODE_LICENSE_URL =
  "https://creativecommons.org/licenses/by/4.0/";
export const WPI_SOURCE_URL = "https://msi.nga.mil/Publications/WPI";
export const WPI_DOWNLOAD_URL =
  "https://msi.nga.mil/api/publications/download?type=view&key=16920959/SFH00000/UpdatedPub150.csv";

export const UNLOCODE_FILES = [
  "UNLOCODE CodeListPart1.csv",
  "UNLOCODE CodeListPart2.csv",
  "UNLOCODE CodeListPart3.csv",
];

export const UNLOCODE_ARTIFACT_BASE =
  "https://opensource.unicc.org/un/unece/uncefact/vocab-locode/-/jobs/artifacts/2025-1/raw/release/csv";

export const OFFICIAL_UNLOCODE_STATUSES = new Set([
  "AM",
  "AA",
  "AC",
  "AF",
  "AI",
  "AS",
]);

export const REFERENCE_UNLOCODE_STATUSES = new Set(["AQ", "RL", "RN"]);
export const EXCLUDED_UNLOCODE_STATUSES = new Set(["RQ", "XX"]);

export const CURATED_SLUGS = new Map([
  ["KRPUS", "busan"],
  ["SGSIN", "singapore"],
  ["MYPKG", "port-klang"],
]);

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/u, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/u, ""));
    rows.push(row);
  }

  return rows;
}

export function normalizeSearchText(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[đĐ]/gu, "d")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/gu, " ")
    .trim();
}

export function parseUnlocodeCoordinates(value) {
  const match = /^(\d{2})(\d{2})([NS])\s+(\d{3})(\d{2})([EW])$/u.exec(
    value.trim(),
  );
  if (!match) {
    return undefined;
  }

  const latitude = Number(match[1]) + Number(match[2]) / 60;
  const longitude = Number(match[4]) + Number(match[5]) / 60;
  return {
    latitude: match[3] === "S" ? -latitude : latitude,
    longitude: match[6] === "W" ? -longitude : longitude,
    rawValue: value.trim(),
    precision: "minute",
    source: "unlocode",
  };
}

export function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

export function searchShardKey(prefix) {
  let hash = 0x811c9dc5;
  for (const character of prefix) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash & 0xff).toString(16).padStart(2, "0");
}

export function byteMetrics(content) {
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
  return {
    bytes: buffer.byteLength,
    gzipBytes: gzipSync(buffer, { level: 9 }).byteLength,
    sha256: sha256(buffer),
  };
}

export function sourceConfidence(status) {
  if (OFFICIAL_UNLOCODE_STATUSES.has(status)) {
    return "official";
  }
  if (REFERENCE_UNLOCODE_STATUSES.has(status)) {
    return "reference";
  }
  return "pending";
}

export function titleCaseCountry(value) {
  return value
    .toLocaleLowerCase("en")
    .replace(/(^|[\s(-])([a-z])/gu, (_, boundary, letter) =>
      `${boundary}${letter.toLocaleUpperCase("en")}`,
    );
}

export function slugForPort(name, unLocode) {
  const curated = CURATED_SLUGS.get(unLocode);
  if (curated) {
    return curated;
  }

  // LOCODE is the stable, globally unique route key. Human-readable names are
  // not safe here because different countries can contain identically named ports.
  return unLocode.toLocaleLowerCase("en");
}

export function stableSortPorts(left, right) {
  return (
    left.name.localeCompare(right.name, "en") ||
    left.countryCode.localeCompare(right.countryCode, "en") ||
    left.unLocode.localeCompare(right.unLocode, "en")
  );
}
