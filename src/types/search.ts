import type { PortSummary } from "./read-models";

export type PortSearchMatchKind =
  | "portName"
  | "alias"
  | "city"
  | "country"
  | "unLocode"
  | "terminal"
  | "gate";

export interface PortSearchMatchContext {
  readonly terminalName: string;
  readonly gateName?: string;
}

export interface PortSearchMatch {
  readonly kind: PortSearchMatchKind;
  readonly value: string;
  readonly context?: PortSearchMatchContext;
}

export interface PortSearchHit {
  readonly port: PortSummary;
  readonly match: PortSearchMatch;
}

export interface PortSearchResult {
  readonly items: readonly PortSearchHit[];
  readonly total: number;
  readonly normalizedQuery: string;
}
