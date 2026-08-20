import type {
  IsoDateTime,
  KnowledgeMeta,
  KnowledgeScope,
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

export type TransportMode =
  | "walk"
  | "shuttle"
  | "taxi"
  | "rideHailing"
  | "publicTransport"
  | "welfarePickup"
  | "agentArranged"
  | "unknown";

export interface TerminalPlaceAccess {
  readonly id: EntityId;
  readonly terminalId: EntityId;
  readonly gateId?: EntityId;
  readonly gateName?: string;
  readonly placeId: EntityId;
  readonly walkingDistanceM?: number;
  readonly walkingDurationMin?: number;
  readonly drivingDistanceM?: number;
  readonly drivingDurationMin?: number;
  readonly estimatedTaxiFareMin?: MoneyObservation;
  readonly estimatedTaxiFareMax?: MoneyObservation;
  readonly walkingAllowed: boolean;
  readonly walkingSafe: boolean;
  readonly recommendedTransport: TransportMode;
  readonly pickupPoint?: string;
  readonly dropoffPoint?: string;
  readonly routeWarning?: string;
  readonly minimumRecommendedShoreLeaveMin?: number;
  readonly trust: TrustEvidence;
}

export type PlaceCategory =
  | "atm"
  | "currencyExchange"
  | "shopping"
  | "food"
  | "medical"
  | "pharmacy"
  | "welfare";

export type OperationalStatus =
  | "open"
  | "temporarilyClosed"
  | "permanentlyClosed"
  | "relocated"
  | "seasonal"
  | "unknown";

export interface Place {
  readonly id: EntityId;
  readonly portId: EntityId;
  readonly name: string;
  readonly category: PlaceCategory;
  readonly address: string;
  readonly coordinates?: Coordinates;
  readonly operationalStatus: OperationalStatus;
  readonly paymentMethods: readonly string[];
  readonly attributes: readonly string[];
  readonly trust: TrustEvidence;
}

export type EmergencyContactType =
  | "ambulance"
  | "police"
  | "fire"
  | "coastGuard"
  | "portSecurity"
  | "portMedical"
  | "shippingAgent"
  | "hospitalEmergency"
  | "other";

export interface EmergencyContact {
  readonly id: EntityId;
  readonly contactType: EmergencyContactType;
  readonly scope: KnowledgeScope;
  readonly displayName: string;
  readonly phoneShortCode?: string;
  readonly phoneE164?: string;
  readonly phoneLocalFormat?: string;
  readonly available24h: boolean;
  readonly languageSupport: readonly string[];
  readonly callingInstruction?: string;
  readonly trust: TrustEvidence;
}

export type WelfareProviderType =
  | "seafarersCenter"
  | "portWelfareCommittee"
  | "nonprofitWelfareOrganization"
  | "religiousWelfareOrganization"
  | "unionOrWorkerSupport"
  | "portAuthorityService"
  | "governmentService"
  | "shippingAgentService"
  | "volunteerGroup"
  | "other";

export interface WelfareProvider {
  readonly id: EntityId;
  readonly name: string;
  readonly providerType: WelfareProviderType;
  readonly portIds: readonly EntityId[];
  readonly terminalIds: readonly EntityId[];
  readonly placeIds: readonly EntityId[];
  readonly contactChannelIds: readonly EntityId[];
  readonly trust: TrustEvidence;
}

export type WelfareCapability =
  | "crewShuttle"
  | "returnTransport"
  | "shipVisit"
  | "wifi"
  | "simAssistance"
  | "currencyExchange"
  | "deviceCharging"
  | "shoppingTransport"
  | "medicalReferral"
  | "translation"
  | "counseling"
  | "spiritualSupport"
  | "restArea"
  | "remoteSupport"
  | "emergencyContactSupport";

export type WelfareServiceStatus =
  | "confirmedAvailable"
  | "reportedAvailable"
  | "temporarilyUnavailable"
  | "notAvailable"
  | "unknown";

export interface WelfareService {
  readonly id: EntityId;
  readonly providerId: EntityId;
  readonly capability: WelfareCapability;
  readonly status: WelfareServiceStatus;
  readonly terminalIds: readonly EntityId[];
  readonly scheduleSummary?: string;
  readonly contactMethod?: string;
  readonly costType?: "free" | "donationSuggested" | "paid" | "unknown";
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
  readonly subjectType:
    | "port"
    | "terminal"
    | "place"
    | "connectivityProduct"
    | "welfareProvider"
    | "emergencyContact";
  readonly subjectId: EntityId;
  readonly publicAlias: string;
  readonly tags: readonly string[];
  readonly summary: string;
  readonly createdAt: IsoDateTime;
  readonly moderationState: ReviewModerationState;
  readonly trust: TrustEvidence;
}

export type NoteTopic =
  | "esim"
  | "physicalSim"
  | "taxi"
  | "rideHailing"
  | "foodOrder"
  | "supplies"
  | "shopping"
  | "placesToVisit"
  | "seamanClub"
  | "shoreLeave"
  | "warning"
  | "generalTip";

export type NoteVisibility = "public" | "private";

export type PortNotePayload =
  | {
      readonly topic: "esim";
      readonly planName?: string;
      readonly hotspotWorked?: boolean;
      readonly signalQuality?: "limited" | "usable" | "good" | "excellent";
      readonly videoCallQuality?: "limited" | "usable" | "good" | "unknown";
    }
  | {
      readonly topic: "physicalSim";
      readonly sellerNameOrLocation?: string;
      readonly contactIsPublicBusiness: boolean;
      readonly whereToBuy?: string;
    }
  | {
      readonly topic: "taxi" | "rideHailing";
      readonly fromGate?: string;
      readonly toAreaOrPlace?: string;
      readonly transportType: "taxi" | "rideHailing" | "localApp" | "bus";
      readonly priceAgreedBeforeRide?: boolean;
    }
  | {
      readonly topic: "foodOrder";
      readonly orderMethod?: string;
      readonly pickupPoint?: string;
      readonly paymentMethod?: string;
    }
  | {
      readonly topic: "supplies" | "shopping";
      readonly placeName?: string;
      readonly itemsAvailable?: readonly string[];
      readonly internationalCardWorked?: boolean;
    }
  | {
      readonly topic: "placesToVisit";
      readonly placeName?: string;
      readonly category?: string;
      readonly estimatedTimeNeeded?: number;
    }
  | {
      readonly topic: "seamanClub";
      readonly providerName?: string;
      readonly pickupAvailable?: boolean;
      readonly wifiQuality?: "limited" | "usable" | "good" | "unknown";
    }
  | {
      readonly topic: "shoreLeave" | "warning" | "generalTip";
      readonly warning?: string;
    };

export interface PortNote {
  readonly id: EntityId;
  readonly portId: EntityId;
  readonly terminalId?: EntityId;
  readonly gateName?: string;
  readonly topic: NoteTopic;
  readonly visibility: NoteVisibility;
  readonly title: string;
  readonly summary: string;
  readonly payload: PortNotePayload;
  readonly publicAlias?: string;
  readonly moderationState: ReviewModerationState;
  readonly confirmationCount: number;
  readonly usefulnessCount: number;
  readonly createdAt: IsoDateTime;
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
