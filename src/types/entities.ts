import type {
  IsoDateTime,
  KnowledgeMeta,
  MoneyObservation,
  TrustEvidence,
} from "./knowledge-meta";

export type EntityId = string;

export interface Country {
  readonly code: string;
  readonly name: string;
}

export interface Coordinates {
  readonly latitude: number;
  readonly longitude: number;
}

export interface Port {
  readonly id: EntityId;
  readonly slug: string;
  readonly name: string;
  readonly aliases: readonly string[];
  readonly country: Country;
  readonly city?: string;
  readonly unLocode?: string;
  readonly terminalIds: readonly EntityId[];
}

export interface Terminal {
  readonly id: EntityId;
  readonly portId: EntityId;
  readonly slug: string;
  readonly name: string;
  readonly aliases: readonly string[];
  readonly gateNames: readonly string[];
}

export type PlaceCategory =
  | "atm"
  | "currencyExchange"
  | "shopping"
  | "food"
  | "medical"
  | "pharmacy"
  | "welfare";

export interface Place {
  readonly id: EntityId;
  readonly portId: EntityId;
  readonly terminalIds: readonly EntityId[];
  readonly name: string;
  readonly category: PlaceCategory;
  readonly address: string;
  readonly walkingMinutes?: number;
  readonly totalVisitMinutes?: number;
  readonly paymentMethods: readonly string[];
  readonly attributes: readonly string[];
  readonly trust: TrustEvidence;
}

export interface KnowledgeItem {
  readonly id: EntityId;
  readonly topic: string;
  readonly title: string;
  readonly summary: string;
  readonly details: readonly string[];
  readonly meta: KnowledgeMeta;
}

export type ReviewModerationState =
  | "pending"
  | "approved"
  | "rejected"
  | "quarantined";

export interface Review {
  readonly id: EntityId;
  readonly subjectType: "port" | "terminal" | "place" | "connectivityProduct";
  readonly subjectId: EntityId;
  readonly publicAlias: string;
  readonly tags: readonly string[];
  readonly summary: string;
  readonly createdAt: IsoDateTime;
  readonly moderationState: ReviewModerationState;
  readonly trust: TrustEvidence;
}

export interface ConnectivityCoverage {
  readonly countryCode: string;
  readonly portIds: readonly EntityId[];
  readonly quality: "limited" | "usable" | "good" | "excellent";
}

export interface ConnectivityProduct {
  readonly id: EntityId;
  readonly name: string;
  readonly provider: string;
  readonly dataAllowanceGb: number | "unlimited";
  readonly validityDays: number;
  readonly hotspotAllowed: boolean;
  readonly activation: "beforeArrival" | "onArrival" | "either";
  readonly price: MoneyObservation;
  readonly coverage: readonly ConnectivityCoverage[];
  readonly trust: TrustEvidence;
}

export interface User {
  readonly id: EntityId;
  readonly displayAlias: string;
  readonly role: "member" | "moderator" | "admin";
  readonly contributorStatus: "standard" | "trusted";
}
