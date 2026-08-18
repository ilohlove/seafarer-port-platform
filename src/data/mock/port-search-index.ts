import type { PortSummary, TerminalSummary } from "../../types";
import {
  conflictingTrust,
  needsConfirmationTrust,
  officialTrust,
} from "./fixture-builders";

export interface PortSearchIndexEntry {
  readonly port: PortSummary;
  readonly terminals: readonly TerminalSummary[];
}

export const singaporePortSearchEntry = {
    port: {
      id: "port-singapore",
      slug: "singapore",
      name: "Port of Singapore",
      country: { code: "SG", name: "Singapore" },
      city: "Singapore",
      unLocode: "SGSIN",
      terminalNames: ["Pasir Panjang Terminal", "Tanjong Pagar Terminal"],
      aliases: ["Singapore Port", "Cảng Singapore", "SGSIN"],
      trust: officialTrust,
    },
    terminals: [
      {
        id: "terminal-sg-pasir-panjang",
        slug: "pasir-panjang",
        name: "Pasir Panjang Terminal",
        gateNames: ["Main Gate"],
      },
      {
        id: "terminal-sg-tanjong-pagar",
        slug: "tanjong-pagar",
        name: "Tanjong Pagar Terminal",
        gateNames: ["Crew Gate"],
      },
    ],
} as const satisfies PortSearchIndexEntry;

export const busanPortSearchEntry = {
    port: {
      id: "port-busan",
      slug: "busan",
      name: "Port of Busan",
      country: { code: "KR", name: "South Korea" },
      city: "Busan",
      unLocode: "KRPUS",
      terminalNames: ["Busan New Port", "Gamman Terminal"],
      aliases: ["Busan Port", "Cảng Busan", "Pusan", "KRPUS"],
      trust: needsConfirmationTrust,
    },
    terminals: [
      {
        id: "terminal-busan-new-port",
        slug: "busan-new-port",
        name: "Busan New Port",
        gateNames: ["Crew Gate"],
      },
      {
        id: "terminal-busan-gamman",
        slug: "gamman",
        name: "Gamman Terminal",
        gateNames: [],
      },
    ],
} as const satisfies PortSearchIndexEntry;

export const portKlangSearchEntry = {
    port: {
      id: "port-klang",
      slug: "port-klang",
      name: "Port Klang",
      country: { code: "MY", name: "Malaysia" },
      city: "Klang",
      unLocode: "MYPKG",
      terminalNames: ["Westports", "Northport"],
      aliases: ["Klang Port", "Pelabuhan Klang", "MYPKG"],
      trust: conflictingTrust,
    },
    terminals: [
      {
        id: "terminal-klang-westports",
        slug: "westports",
        name: "Westports",
        gateNames: ["Main Gate"],
      },
      {
        id: "terminal-klang-northport",
        slug: "northport",
        name: "Northport",
        gateNames: ["Crew Gate"],
      },
    ],
} as const satisfies PortSearchIndexEntry;

export const mockPortSearchIndex = [
  singaporePortSearchEntry,
  busanPortSearchEntry,
  portKlangSearchEntry,
] as const satisfies readonly PortSearchIndexEntry[];
